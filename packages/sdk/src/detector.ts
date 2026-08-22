import { DocOrientationError } from "./errors";
import { decodeImage } from "./image/decode";
import { parseModelManifest } from "./model/manifest";
import { ModelManager } from "./model/model-manager";
import { postprocessLogits } from "./postprocess";
import { preprocessRaster } from "./preprocess";
import { assertBackendSupported, probeCapabilities } from "./runtime/capabilities";
import { createOrtSession } from "./runtime/ort-session";
import type { Backend, CreateDocOrientationOptions, DecodableImage, DetectOptions, DocOrientationDetector, DocOrientationModelInfo, DocOrientationRuntimeInfo, LoadTimings, ModelCacheEntry, ModelManifest, OrientationBatchResult, OrientationResult, ProgressEvent } from "./types";

export const DEFAULT_MANIFEST_URL = "https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/models/v1.0.0/manifest.json";

function now(): number { return typeof performance === "object" ? performance.now() : Date.now(); }
async function loadManifest(model: string | ModelManifest, signal?: AbortSignal): Promise<ModelManifest> {
  if (typeof model !== "string") return parseModelManifest(model);
  try { const response = await fetch(model, signal === undefined ? {} : { signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return parseModelManifest(await response.json()); } catch (error) { if (signal?.aborted) throw new DocOrientationError("ABORTED", "Manifest loading was aborted", { reason: signal.reason }); if (error instanceof DocOrientationError) throw error; throw new DocOrientationError("MODEL_DOWNLOAD_FAILED", "Unable to load model manifest", { url: model, cause: String(error) }); }
}

class Detector implements DocOrientationDetector {
  private disposed = false;
  constructor(readonly capabilities: ReturnType<typeof probeCapabilities>, readonly model: DocOrientationModelInfo, readonly runtime: DocOrientationRuntimeInfo, readonly loadTimings: LoadTimings, private readonly manifest: ModelManifest, private readonly manager: ModelManager, private readonly session: Awaited<ReturnType<typeof createOrtSession>>) {}
  async detect(image: DecodableImage, options: DetectOptions = {}): Promise<OrientationResult> {
    this.assertLive();
    const started = now();
    const decodeStarted = now();
    const raster = await decodeImage(image);
    const decodeMs = now() - decodeStarted;
    if (options.signal?.aborted) throw new DocOrientationError("ABORTED", "Detection was aborted", { reason: options.signal.reason });
    const preprocessStarted = now();
    const tensor = preprocessRaster(raster, this.manifest);
    const preprocessMs = now() - preprocessStarted;
    const inference = await this.session.run(tensor.data, tensor.dims, options.signal);
    const postprocessStarted = now();
    const result = postprocessLogits(inference.logits, this.manifest);
    const postprocessMs = now() - postprocessStarted;
    return { ...result, image: { original: { width: raster.originalWidth, height: raster.originalHeight }, normalized: { width: raster.width, height: raster.height }, exifOrientation: raster.exifOrientation }, model: this.model, runtime: this.runtime, timings: { decodeMs, preprocessMs, inferenceMs: inference.inferenceMs, postprocessMs, totalMs: now() - started } };
  }
  async detectBatch(images: readonly DecodableImage[], options: DetectOptions = {}): Promise<OrientationBatchResult> {
    this.assertLive();
    const started = now();
    const tensors = [] as Array<{ raster: Awaited<ReturnType<typeof decodeImage>>; tensor: ReturnType<typeof preprocessRaster> }>;
    let decodeMs = 0; let preprocessMs = 0;
    for (const image of images) {
      const decodeStarted = now(); const raster = await decodeImage(image); decodeMs += now() - decodeStarted;
      const preprocessStarted = now(); const tensor = preprocessRaster(raster, this.manifest); preprocessMs += now() - preprocessStarted; tensors.push({ raster, tensor });
    }
    const results: OrientationResult[] = []; let inferenceMs = 0; let postprocessMs = 0;
    const chunkSize = this.manifest.maxBatchSize;
    for (let start = 0; start < tensors.length; start += chunkSize) {
      const chunk = tensors.slice(start, start + chunkSize); const data = new Float32Array(chunk.length * 3 * 224 * 224);
      chunk.forEach((entry, index) => data.set(entry.tensor.data, index * entry.tensor.data.length));
      const inference = await this.session.run(data, [chunk.length, 3, 224, 224], options.signal); inferenceMs += inference.inferenceMs;
      chunk.forEach((entry, index) => { const postStarted = now(); const result = postprocessLogits(inference.logits, this.manifest, index * 4); postprocessMs += now() - postStarted; results.push({ ...result, image: { original: { width: entry.raster.originalWidth, height: entry.raster.originalHeight }, normalized: { width: entry.raster.width, height: entry.raster.height }, exifOrientation: entry.raster.exifOrientation }, model: this.model, runtime: this.runtime, timings: { decodeMs: 0, preprocessMs: 0, inferenceMs: inference.inferenceMs, postprocessMs: 0, totalMs: inference.inferenceMs } }); });
    }
    return { results, timings: { totalMs: now() - started, decodeMs, preprocessMs, inferenceMs, postprocessMs } };
  }
  clearModelCache() { return this.manager.clearCache(); }
  listModelCache(): Promise<readonly ModelCacheEntry[]> { return this.manager.listCache(); }
  async dispose() { if (!this.disposed) { this.disposed = true; await this.session.dispose(); } }
  private assertLive() { if (this.disposed) throw new DocOrientationError("INFERENCE_FAILED", "Detector has been disposed", { disposed: true }); }
}

export async function createDocOrientation(options: CreateDocOrientationOptions = {}): Promise<DocOrientationDetector> {
  const started = now(); const backend: Backend = options.backend ?? "wasm"; const capabilities = probeCapabilities(); assertBackendSupported(backend, capabilities);
  const manifestStarted = now(); const manifest = await loadManifest(options.model ?? DEFAULT_MANIFEST_URL, options.signal); const manifestMs = now() - manifestStarted;
  const variant = manifest.variant; const manager = new ModelManager(); const modelStarted = now(); const loaded = await manager.load(manifest, variant, { ...(options.cache === undefined ? {} : { cache: options.cache }), ...(options.signal === undefined ? {} : { signal: options.signal }), ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }) });
  const modelMs = now() - modelStarted; options.onProgress?.({ stage: "session" }); const session = await createOrtSession({ backend, capabilities, manifest, modelBytes: loaded.data, ...(options.ort?.wasm === undefined ? {} : { wasm: options.ort.wasm }) });
  const model: DocOrientationModelInfo = { ...manifest.model, variant: variant.id, bytes: variant.bytes, sha256: variant.sha256 }; const runtime: DocOrientationRuntimeInfo = { backend, executionProvider: backend === "wasm" ? "wasm" : "webgpu", ...(backend === "wasm" ? { threads: capabilities.wasmThreads ? options.ort?.wasm?.numThreads ?? 2 : 1 } : {}) };
  const loadTimings: LoadTimings = { manifestMs, downloadMs: loaded.downloadMs, sessionMs: session.sessionCreateMs, totalMs: now() - started, source: loaded.source };
  return new Detector(capabilities, model, runtime, loadTimings, manifest, manager, session);
}
