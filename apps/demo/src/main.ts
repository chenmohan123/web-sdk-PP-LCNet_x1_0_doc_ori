import {
  createDocOrientation,
  DocOrientationError,
  rotate,
  type Backend,
  type OrientationResult,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";
import { createCopy, type DemoCopy, type Language } from "./i18n";
import { renderShell } from "./render";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
let language: Language = "zh-CN";
let copy: DemoCopy = createCopy(language);
let selected: File | undefined;
let detector: Awaited<ReturnType<typeof createDocOrientation>> | undefined;
let result: OrientationResult | undefined;
let originalUrl: string | undefined;
let correctedUrl: string | undefined;
let statusKey: "choose" | "ready" | "loading" | "complete" = "choose";

app.innerHTML = renderShell(copy, __SDK_VERSION__);
const fileInput = document.querySelector<HTMLInputElement>("#file")!;
const chooseButton = document.querySelector<HTMLButtonElement>("#choose-image")!;
const backendInput = document.querySelector<HTMLSelectElement>("#backend")!;
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
  document.querySelector("#model")!.innerHTML = rows({
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
  document.querySelector("#model")!.innerHTML = rows({
    [copy.name]: "-",
    [copy.version]: "-",
    [copy.size]: "-",
    [copy.parameters]: "-",
    [copy.backend]: "-",
  });
  document.querySelector("#timing")!.innerHTML = "";
}

function applyCopy(): void {
  document.querySelector("#eyebrow")!.textContent = copy.eyebrow;
  document.querySelector("#title")!.textContent = copy.title;
  document.querySelector("#description")!.textContent = copy.description;
  document.querySelector("#backend-label")!.textContent = copy.backend;
  document.querySelector<HTMLButtonElement>("#choose-image")!.textContent = copy.chooseImage;
  document.querySelector<HTMLButtonElement>("#run")!.textContent = copy.run;
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
  selected = fileInput.files?.[0];
  result = undefined;
  runButton.disabled = selected === undefined;
  if (originalUrl !== undefined) URL.revokeObjectURL(originalUrl);
  if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
  originalUrl = undefined;
  correctedUrl = undefined;
  renderPlaceholders();
  renderEmptyPreviews();
  if (selected) {
    originalUrl = URL.createObjectURL(selected);
    setPreview("original", originalUrl);
    setStatus("ready");
  } else {
    renderSelectedFile();
    setStatus("choose");
  }
  renderSelectedFile();
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
runButton.addEventListener("click", () => {
  void runDetection();
});

async function runDetection(): Promise<void> {
  if (!selected) return;
  runButton.disabled = true;
  try {
    await detector?.dispose();
    const backend = backendInput.value as Backend;
    setStatus("loading");
    detector = await createDocOrientation({
      backend,
      onProgress: (event) => {
        status.textContent = copy.statusStage[event.stage] ?? copy.statusLoading;
      },
    });
    result = await detector.detect(selected);
    renderResult(result, detector.loadTimings);
    const corrected = await rotate(selected, result.correctionAngle);
    if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
    correctedUrl = URL.createObjectURL(corrected);
    setPreview("corrected", correctedUrl);
    setStatus("complete");
  } catch (error) {
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
    runButton.disabled = false;
  }
}

window.addEventListener("beforeunload", () => {
  void detector?.dispose();
  if (originalUrl !== undefined) URL.revokeObjectURL(originalUrl);
  if (correctedUrl !== undefined) URL.revokeObjectURL(correctedUrl);
});

renderPlaceholders();
