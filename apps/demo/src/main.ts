import {
  createDocOrientation,
  DocOrientationError,
  rotate,
  type Backend,
  type OrientationResult,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";
import { createCopy, type DemoCopy, type Language } from "./i18n";
import {
  DEFAULT_MODEL_SOURCE,
  MODEL_SOURCE_OPTIONS,
  selectionToModel,
  type ModelSourceKey,
} from "./model-sources";
import { renderShell } from "./render";
import { fetchSampleFile, orientationSamples, type OrientationSample } from "./samples";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
let language: Language = "zh-CN";
let copy: DemoCopy = createCopy(language);
let selected: File | undefined;
let detector: Awaited<ReturnType<typeof createDocOrientation>> | undefined;
let result: OrientationResult | undefined;
let originalUrl: string | undefined;
let correctedUrl: string | undefined;
let selectedSample: OrientationSample | undefined;
let modelSource: ModelSourceKey = DEFAULT_MODEL_SOURCE;
let activeRun: Promise<void> | undefined;
let activeRunController: AbortController | undefined;
let runGeneration = 0;
let statusKey =
  "choose" as
    | "choose"
    | "ready"
    | "loading"
    | "complete"
    | "sampleLoading"
    | "sampleReady";

app.innerHTML = renderShell(copy, __SDK_VERSION__);
const fileInput = document.querySelector<HTMLInputElement>("#file")!;
const chooseButton = document.querySelector<HTMLButtonElement>("#choose-image")!;
const backendInput = document.querySelector<HTMLSelectElement>("#backend")!;
const modelSourceInput = document.querySelector<HTMLSelectElement>("#model-source")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const selectedFile = document.querySelector<HTMLParagraphElement>("#selected-file")!;

function rows(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`)
    .join("");
}

function statusText(): string {
  switch (statusKey) {
    case "ready":
      return copy.statusReady;
    case "loading":
      return copy.statusLoading;
    case "complete":
      return copy.statusComplete;
    case "sampleLoading":
      return copy.statusSampleLoading;
    case "sampleReady":
      return copy.statusSampleReady;
    default:
      return copy.statusChoose;
  }
}

function setStatus(next: typeof statusKey): void {
  statusKey = next;
  status.textContent = statusText();
}

function renderEmptyPreviews(): void {
  if (originalUrl) setPreview("original", originalUrl);
  else
    document.querySelector("#original-preview")!.innerHTML =
      `<div data-testid="original-empty" class="empty-state">${copy.emptyOriginal}</div>`;
  if (correctedUrl) setPreview("corrected", correctedUrl);
  else
    document.querySelector("#corrected-preview")!.innerHTML =
      `<div data-testid="corrected-empty" class="empty-state">${copy.emptyCorrected}</div>`;
}

function renderSelectedFile(): void {
  selectedFile.textContent = selected
    ? `${copy.selectedFile}: ${selected.name} (${selected.type || "image"}, ${selected.size.toLocaleString()} B)`
    : "";
}

function renderResult(
  nextResult: OrientationResult,
  loadTimings: Awaited<ReturnType<typeof createDocOrientation>>["loadTimings"],
): void {
  document.querySelector("#result")!.innerHTML = rows({
    [copy.orientation]: `${nextResult.orientation}°`,
    [copy.confidence]: `${(nextResult.score * 100).toFixed(2)}%`,
    [copy.correction]: `${nextResult.correctionAngle}°`,
  });
  const activeSource = MODEL_SOURCE_OPTIONS.find((option) => option.key === modelSource)!;
  document.querySelector("#model")!.innerHTML = rows({
    [copy.modelRepository]: activeSource.label[language === "zh-CN" ? "zh" : "en"],
    [copy.manifest]: activeSource.manifestUrl ?? copy.sdkDefaultManifest,
    [copy.name]: nextResult.model.id,
    [copy.version]: nextResult.model.version,
    [copy.size]: `${(nextResult.model.bytes / 1024 / 1024).toFixed(2)} MB`,
    [copy.parameters]: nextResult.model.parameterCount.toLocaleString(),
    [copy.backend]: nextResult.runtime.backend,
  });
  document.querySelector("#timing")!.innerHTML = rows({
    [copy.manifest]: `${loadTimings.manifestMs.toFixed(1)} ms`,
    [copy.modelLoad]: `${loadTimings.downloadMs.toFixed(1)} ms`,
    [copy.session]: `${loadTimings.sessionMs.toFixed(1)} ms`,
    [copy.loadTotal]: `${loadTimings.totalMs.toFixed(1)} ms`,
    [copy.source]: loadTimings.source,
    [copy.total]: `${nextResult.timings.totalMs.toFixed(1)} ms`,
    [copy.decode]: `${nextResult.timings.decodeMs.toFixed(1)} ms`,
    [copy.preprocess]: `${nextResult.timings.preprocessMs.toFixed(1)} ms`,
    [copy.inference]: `${nextResult.timings.inferenceMs.toFixed(1)} ms`,
    [copy.postprocess]: `${nextResult.timings.postprocessMs.toFixed(1)} ms`,
  });
}

function renderPlaceholders(): void {
  document.querySelector("#result")!.innerHTML = rows({
    [copy.orientation]: "-",
    [copy.confidence]: "-",
    [copy.correction]: "-",
  });
  const activeSource = MODEL_SOURCE_OPTIONS.find((option) => option.key === modelSource)!;
  document.querySelector("#model")!.innerHTML = rows({
    [copy.modelRepository]: activeSource.label[language === "zh-CN" ? "zh" : "en"],
    [copy.manifest]: activeSource.manifestUrl ?? copy.sdkDefaultManifest,
    [copy.name]: "-",
    [copy.version]: "-",
    [copy.size]: "-",
    [copy.parameters]: "-",
    [copy.backend]: "-",
  });
  document.querySelector("#timing")!.innerHTML = "";
}

function revokePreviewUrls(): void {
  if (originalUrl !== undefined) URL.revokeObjectURL(originalUrl);
  if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
  originalUrl = undefined;
  correctedUrl = undefined;
}

function loadSelectedFile(
  file: File | undefined,
  nextStatus: "ready" | "sampleReady" = "ready",
  sample?: OrientationSample,
): void {
  selected = file;
  selectedSample = sample;
  result = undefined;
  runButton.disabled = file === undefined;
  revokePreviewUrls();
  renderPlaceholders();
  renderEmptyPreviews();
  if (file) {
    originalUrl = URL.createObjectURL(file);
    setPreview("original", originalUrl);
    setStatus(nextStatus);
  } else {
    renderSelectedFile();
    setStatus("choose");
  }
  renderSelectedFile();
  applySampleCopy();
}

function sampleText(sample: OrientationSample): { name: string; kind: string; aria: string } {
  const name = language === "zh-CN" ? sample.label.zh : sample.label.en;
  const kind = sample.kind === "official" ? copy.officialSample : copy.derivedSample;
  return {
    name,
    kind,
    aria: `${name}, ${copy.expectedOrientation}: ${sample.expectedOrientation}°`,
  };
}

function applySampleCopy(): void {
  document.querySelector("#samples-heading")!.textContent = copy.samples;
  document.querySelector("#samples-description")!.textContent = copy.samplesDescription;
  for (const sample of orientationSamples) {
    const button = document.querySelector<HTMLButtonElement>(`[data-sample-id="${sample.id}"]`);
    if (!button) continue;
    const text = sampleText(sample);
    button.setAttribute("aria-label", text.aria);
    button.querySelector(".sample-name")!.textContent = text.name;
    button.querySelector(".sample-kind")!.textContent = text.kind;
    button.querySelector(".sample-angle")!.textContent = `${copy.expectedOrientation}: ${sample.expectedOrientation}°`;
  }
  const attribution = document.querySelector<HTMLAnchorElement>("#sample-attribution")!;
  if (selectedSample) {
    attribution.hidden = false;
    attribution.href = selectedSample.sourceUrl;
    attribution.textContent = `${copy.sampleSource}: PaddleOCR`;
  } else {
    attribution.hidden = true;
    attribution.removeAttribute("href");
    attribution.textContent = "";
  }
}

function applyCopy(): void {
  document.querySelector("#eyebrow")!.textContent = copy.eyebrow;
  document.querySelector("#title")!.textContent = copy.title;
  document.querySelector("#description")!.textContent = copy.description;
  document.querySelector("#backend-label")!.textContent = copy.backend;
  document.querySelector("#model-source-label")!.textContent = copy.modelRepository;
  document.querySelector<HTMLButtonElement>("#choose-image")!.textContent = copy.chooseImage;
  document.querySelector<HTMLButtonElement>("#run")!.textContent = copy.run;
  applySampleCopy();
  document.querySelector("#preview-heading")!.textContent = copy.preview;
  document.querySelector("#original-label")!.textContent = copy.original;
  document.querySelector("#corrected-label")!.textContent = copy.corrected;
  document.querySelector("#result-heading")!.textContent = copy.result;
  document.querySelector("#model-heading")!.textContent = copy.model;
  document.querySelector("#timing-heading")!.textContent = copy.timing;
  document.querySelector<HTMLAnchorElement>(".repository-link")!.textContent = copy.github;
  document.querySelector<HTMLButtonElement>("#language-zh")!.textContent = copy.chinese;
  document.querySelector<HTMLButtonElement>("#language-en")!.textContent = copy.english;
  const options = backendInput.options;
  options[0]!.textContent = copy.wasmCpu;
  options[1]!.textContent = copy.webgpuGpu;
  for (const [index, option] of MODEL_SOURCE_OPTIONS.entries()) {
    const element = modelSourceInput.options[index]!;
    element.textContent = `${option.label[language === "zh-CN" ? "zh" : "en"]}${option.available ? "" : ` (${copy.unavailable})`}`;
    element.title = option.disabledReason?.[language === "zh-CN" ? "zh" : "en"] ?? "";
  }
  const copyLanguage = language === "zh-CN" ? "zh" : "en";
  document.querySelector("#model-source-limitations")!.textContent = MODEL_SOURCE_OPTIONS.filter(
    (option) => !option.available,
  )
    .map(
      (option) =>
        `${option.label[copyLanguage]}: ${option.disabledReason?.[copyLanguage] ?? copy.unavailable}`,
    )
    .join(" ");
  renderSelectedFile();
  renderEmptyPreviews();
  if (result && detector) renderResult(result, detector.loadTimings);
  else renderPlaceholders();
  status.textContent = statusText();
}

function setPreview(kind: "original" | "corrected", url: string): void {
  const preview = document.querySelector(`#${kind}-preview`)!;
  const label = kind === "original" ? copy.original : copy.corrected;
  preview.innerHTML = `<img src="${url}" alt="${label}" />`;
}

chooseButton.addEventListener("click", () => fileInput.click());
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-sample-id]")) {
  button.addEventListener("click", () => {
    const sample = orientationSamples.find((candidate) => candidate.id === button.dataset.sampleId);
    if (!sample) return;
    button.disabled = true;
    setStatus("sampleLoading");
    void fetchSampleFile(sample)
      .then((file) => loadSelectedFile(file, "sampleReady", sample))
      .catch((error: unknown) => {
        status.textContent = `${copy.error}: ${error instanceof Error ? error.message : String(error)}`;
      })
      .finally(() => {
        button.disabled = false;
      });
  });
}
document.querySelector<HTMLButtonElement>("#language-zh")!.addEventListener("click", () => {
  language = "zh-CN";
  copy = createCopy(language);
  applyCopy();
});
document.querySelector<HTMLButtonElement>("#language-en")!.addEventListener("click", () => {
  language = "en";
  copy = createCopy(language);
  applyCopy();
});
fileInput.addEventListener("change", () => {
  loadSelectedFile(fileInput.files?.[0]);
});
backendInput.addEventListener("change", () => {
  void detector?.dispose();
  detector = undefined;
  result = undefined;
  renderPlaceholders();
  if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
  correctedUrl = undefined;
  renderEmptyPreviews();
});
modelSourceInput.addEventListener("change", () => {
  void changeModelSource(modelSourceInput.value as ModelSourceKey);
});
runButton.addEventListener("click", () => {
  const task = runDetection();
  activeRun = task;
  void task.finally(() => {
    if (activeRun === task) activeRun = undefined;
  });
});

async function changeModelSource(next: ModelSourceKey): Promise<void> {
  const changeGeneration = ++runGeneration;
  activeRunController?.abort("model-source-changed");
  activeRunController = undefined;
  modelSourceInput.disabled = true;
  backendInput.disabled = true;
  runButton.disabled = true;
  await activeRun;
  const previousDetector = detector;
  detector = undefined;
  await previousDetector?.dispose();
  if (changeGeneration !== runGeneration) return;
  modelSource = next;
  result = undefined;
  renderPlaceholders();
  if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
  correctedUrl = undefined;
  renderEmptyPreviews();
  setStatus(selected === undefined ? "choose" : "ready");
  modelSourceInput.disabled = false;
  backendInput.disabled = false;
  runButton.disabled = selected === undefined;
}

async function runDetection(): Promise<void> {
  if (!selected) return;
  const selectedFile = selected;
  const sourceAtStart = modelSource;
  const controller = new AbortController();
  const generation = ++runGeneration;
  activeRunController = controller;
  runButton.disabled = true;
  modelSourceInput.disabled = true;
  backendInput.disabled = true;
  try {
    const previousDetector = detector;
    detector = undefined;
    await previousDetector?.dispose();
    if (generation !== runGeneration || controller.signal.aborted) return;
    const backend = backendInput.value as Backend;
    const model = selectionToModel(sourceAtStart);
    setStatus("loading");
    const nextDetector = await createDocOrientation({
      backend,
      ...(model === undefined ? {} : { model }),
      signal: controller.signal,
      onProgress: (event) => {
        if (generation !== runGeneration || controller.signal.aborted) return;
        status.textContent = copy.statusStage[event.stage] ?? copy.statusLoading;
      },
    });
    if (generation !== runGeneration || controller.signal.aborted) {
      await nextDetector.dispose();
      return;
    }
    detector = nextDetector;
    const nextResult = await nextDetector.detect(selectedFile, { signal: controller.signal });
    if (generation !== runGeneration || controller.signal.aborted) return;
    result = nextResult;
    renderResult(nextResult, nextDetector.loadTimings);
    const corrected = await rotate(selectedFile, nextResult.correctionAngle);
    if (generation !== runGeneration || controller.signal.aborted) return;
    if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
    correctedUrl = URL.createObjectURL(corrected);
    setPreview("corrected", correctedUrl);
    setStatus("complete");
  } catch (error) {
    if (generation !== runGeneration || controller.signal.aborted) return;
    status.textContent =
      error instanceof DocOrientationError
        ? `${copy.error}: ${error.code}: ${error.message}${
            Object.keys(error.details).length > 0
              ? ` (${JSON.stringify(error.details)})`
              : ""
          }`
        : error instanceof Error
          ? `${copy.error}: ${error.message}`
          : `${copy.error}: ${String(error)}`;
  } finally {
    if (generation === runGeneration) {
      activeRunController = undefined;
      modelSourceInput.disabled = false;
      backendInput.disabled = false;
      runButton.disabled = selected === undefined;
    }
  }
}

window.addEventListener("beforeunload", () => {
  void detector?.dispose();
  revokePreviewUrls();
});

renderPlaceholders();
