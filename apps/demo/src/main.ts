import {
  createDocOrientation,
  rotate,
  type Backend,
  type OrientationResult,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";
import "./styles.css";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main><header><p class="eyebrow">ONNX RUNTIME WEB</p><h1>PP-LCNet document orientation</h1><p>Local browser inference for 0°, 90°, 180° and 270° document images.</p></header><section class="controls"><label>Backend <select id="backend"><option value="wasm">WASM / CPU</option><option value="webgpu">WebGPU / GPU</option></select></label><input id="file" type="file" accept="image/*"><button id="run" disabled>Load model and detect</button></section><p id="status" role="status">Choose an image to begin.</p><section class="grid"><div class="preview"><h2>Preview</h2><div class="images"><figure><figcaption>Original</figcaption><img id="original" alt="Original image"></figure><figure><figcaption>Corrected</figcaption><img id="corrected" alt="Corrected image"></figure></div></div><aside><section><h2>Result</h2><dl id="result"><div><dt>Orientation</dt><dd>-</dd></div><div><dt>Confidence</dt><dd>-</dd></div></dl></section><section><h2>Model</h2><dl id="model"></dl></section><section><h2>Timing</h2><dl id="timing"></dl></section></aside></section></main>`;
const fileInput = document.querySelector<HTMLInputElement>("#file")!;
const backendInput = document.querySelector<HTMLSelectElement>("#backend")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
let selected: File | undefined;
let detector: Awaited<ReturnType<typeof createDocOrientation>> | undefined;
fileInput.addEventListener("change", () => {
  selected = fileInput.files?.[0];
  runButton.disabled = selected === undefined;
  if (selected) {
    document.querySelector<HTMLImageElement>("#original")!.src =
      URL.createObjectURL(selected);
    status.textContent = "Ready to detect.";
  }
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
    status.textContent = `Loading ${backend} model...`;
    const loadStarted = performance.now();
    detector = await createDocOrientation({
      backend,
      onProgress: (event) => {
        status.textContent = `${event.stage}...`;
      },
    });
    const result = await detector.detect(selected);
    render(result, loadStarted);
    const corrected = await rotate(selected, result.correctionAngle);
    document.querySelector<HTMLImageElement>("#corrected")!.src =
      URL.createObjectURL(corrected);
    status.textContent = "Detection complete.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    runButton.disabled = false;
  }
}
function rows(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`)
    .join("");
}
function render(result: OrientationResult, loadStarted: number): void {
  document.querySelector("#result")!.innerHTML = rows({
    Orientation: `${result.orientation}°`,
    Confidence: `${(result.score * 100).toFixed(2)}%`,
    Correction: `${result.correctionAngle}°`,
  });
  document.querySelector("#model")!.innerHTML = rows({
    Name: result.model.id,
    Version: result.model.version,
    Size: `${(result.model.bytes / 1024 / 1024).toFixed(2)} MB`,
    Parameters: result.model.parameterCount.toLocaleString(),
    Backend: result.runtime.backend,
  });
  document.querySelector("#timing")!.innerHTML = rows({
    Load: `${(performance.now() - loadStarted).toFixed(1)} ms`,
    Total: `${result.timings.totalMs.toFixed(1)} ms`,
    Decode: `${result.timings.decodeMs.toFixed(1)} ms`,
    Preprocess: `${result.timings.preprocessMs.toFixed(1)} ms`,
    Inference: `${result.timings.inferenceMs.toFixed(1)} ms`,
    Postprocess: `${result.timings.postprocessMs.toFixed(1)} ms`,
  });
}
