import { DocOrientationError } from "./errors";
import { decodeImage } from "./image/decode";
import { parseModelManifest } from "./model/manifest";
import { ModelManager } from "./model/model-manager";
import { postprocessLogits } from "./postprocess";
import { preprocessRaster } from "./preprocess";
import {
  assertBackendSupported,
  probeCapabilities,
} from "./runtime/capabilities";
import { createOrtSession } from "./runtime/ort-session";
import {
  createWorkerExecutor,
  type InferenceExecutor,
} from "./worker/worker-bridge";
import type {
  Backend,
  Capabilities,
  CreateDocOrientationOptions,
  DecodableImage,
  DocOrientationModel,
  DetectOptions,
  DocOrientationDetector,
  DocOrientationModelInfo,
  DocOrientationRuntimeInfo,
  LoadTimings,
  ModelCacheEntry,
  ModelManifest,
  OrientationBatchResult,
  OrientationResult,
} from "./types";

export const DEFAULT_REMOTE_MANIFEST_URL =
  "https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/models/v1.0.0/manifest.json";

function resolvePublishedAsset(relativePath: string): string | undefined {
  try {
    if (typeof import.meta.url === "string" && import.meta.url.length > 0)
      return new URL(relativePath, import.meta.url).href;
  } catch {
    // IIFE builds do not provide import.meta.url.
  }
  if (typeof document !== "undefined") {
    const script =
      (typeof HTMLScriptElement !== "undefined" &&
      document.currentScript instanceof HTMLScriptElement
        ? document.currentScript
        : undefined) ??
      Array.from(document.scripts).find((entry) =>
        entry.src.includes("web-sdk-pp-lcnet-x1-0-doc-ori"),
      );
    if (script?.src) return new URL(relativePath, script.src).href;
  }
  if (typeof globalThis.location === "object" && globalThis.location?.href)
    return new URL(relativePath, globalThis.location.href).href;
  return undefined;
}

export const DEFAULT_MANIFEST_URL =
  resolvePublishedAsset("./models/v1.0.0/manifest.json") ??
  DEFAULT_REMOTE_MANIFEST_URL;
export const DEFAULT_WORKER_URL = resolvePublishedAsset(
  "./inference.worker.js",
);

function now(): number {
  return typeof performance === "object" ? performance.now() : Date.now();
}
async function loadManifest(
  model: DocOrientationModel,
  signal?: AbortSignal,
  onProgress?: (event: { readonly stage: "manifest" }) => void,
): Promise<{ manifest: ModelManifest; data?: ArrayBuffer }> {
  onProgress?.({ stage: "manifest" });
  if (typeof model !== "string") {
    if ("data" in model)
      return { data: model.data, manifest: parseModelManifest(model.manifest) };
    return { manifest: parseModelManifest(model) };
  }
  try {
    return await fetchManifest(model, signal);
  } catch (error) {
    let failure: unknown = error;
    if (signal?.aborted)
      throw new DocOrientationError("ABORTED", "Manifest loading was aborted", {
        reason: signal.reason,
      });
    if (
      model === DEFAULT_MANIFEST_URL &&
      DEFAULT_MANIFEST_URL !== DEFAULT_REMOTE_MANIFEST_URL
    ) {
      try {
        return await fetchManifest(DEFAULT_REMOTE_MANIFEST_URL, signal);
      } catch (fallbackError) {
        failure = fallbackError;
      }
    }
    if (failure instanceof DocOrientationError) throw failure;
    throw new DocOrientationError(
      "MODEL_DOWNLOAD_FAILED",
      "Unable to load model manifest",
      { url: model, cause: String(failure) },
    );
  }
}

async function fetchManifest(
  url: string,
  signal?: AbortSignal,
): Promise<{ manifest: ModelManifest }> {
  const response = await fetch(url, signal === undefined ? {} : { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = parseModelManifest(await response.json());
  return {
    manifest: {
      ...parsed,
      variant: {
        ...parsed.variant,
        url: new URL(parsed.variant.url, url).href,
      },
    },
  };
}

class Detector implements DocOrientationDetector {
  private disposed = false;
  constructor(
    readonly capabilities: Capabilities,
    readonly model: DocOrientationModelInfo,
    readonly runtime: DocOrientationRuntimeInfo,
    readonly loadTimings: LoadTimings,
    private readonly manifest: ModelManifest,
    private readonly manager: ModelManager,
    private readonly session:
      Awaited<ReturnType<typeof createOrtSession>> | InferenceExecutor,
    private readonly onProgress?: (event: {
      readonly stage: "inference";
    }) => void,
  ) {}
  async detect(
    image: DecodableImage,
    options: DetectOptions = {},
  ): Promise<OrientationResult> {
    this.assertLive();
    const started = now();
    const decodeStarted = now();
    const raster = await decodeImage(image);
    const decodeMs = now() - decodeStarted;
    if (options.signal?.aborted)
      throw new DocOrientationError("ABORTED", "Detection was aborted", {
        reason: options.signal.reason,
      });
    const preprocessStarted = now();
    const tensor = preprocessRaster(raster, this.manifest);
    const preprocessMs = now() - preprocessStarted;
    this.onProgress?.({ stage: "inference" });
    const inference = await this.session.run(
      tensor.data,
      tensor.dims,
      options.signal,
    );
    const postprocessStarted = now();
    const result = postprocessLogits(inference.logits, this.manifest);
    const postprocessMs = now() - postprocessStarted;
    return {
      ...result,
      image: {
        original: {
          width: raster.originalWidth,
          height: raster.originalHeight,
        },
        normalized: { width: raster.width, height: raster.height },
        exifOrientation: raster.exifOrientation,
      },
      model: this.model,
      runtime: this.runtime,
      timings: {
        decodeMs,
        preprocessMs,
        inferenceMs: inference.inferenceMs,
        postprocessMs,
        totalMs: now() - started,
      },
    };
  }
  async detectBatch(
    images: readonly DecodableImage[],
    options: DetectOptions = {},
  ): Promise<OrientationBatchResult> {
    this.assertLive();
    const started = now();
    const tensors = [] as Array<{
      raster: Awaited<ReturnType<typeof decodeImage>>;
      tensor: ReturnType<typeof preprocessRaster>;
      decodeMs: number;
      preprocessMs: number;
    }>;
    let decodeMs = 0;
    let preprocessMs = 0;
    for (const image of images) {
      const decodeStarted = now();
      const raster = await decodeImage(image);
      const itemDecodeMs = now() - decodeStarted;
      decodeMs += itemDecodeMs;
      const preprocessStarted = now();
      const tensor = preprocessRaster(raster, this.manifest);
      const itemPreprocessMs = now() - preprocessStarted;
      preprocessMs += itemPreprocessMs;
      tensors.push({
        raster,
        tensor,
        decodeMs: itemDecodeMs,
        preprocessMs: itemPreprocessMs,
      });
    }
    const results: OrientationResult[] = [];
    let inferenceMs = 0;
    let postprocessMs = 0;
    const chunkSize = this.manifest.maxBatchSize;
    for (let start = 0; start < tensors.length; start += chunkSize) {
      const chunk = tensors.slice(start, start + chunkSize);
      const data = new Float32Array(chunk.length * 3 * 224 * 224);
      chunk.forEach((entry, index) =>
        data.set(entry.tensor.data, index * entry.tensor.data.length),
      );
      this.onProgress?.({ stage: "inference" });
      const inference = await this.session.run(
        data,
        [chunk.length, 3, 224, 224],
        options.signal,
      );
      inferenceMs += inference.inferenceMs;
      chunk.forEach((entry, index) => {
        const postStarted = now();
        const result = postprocessLogits(
          inference.logits,
          this.manifest,
          index * 4,
        );
        const itemPostprocessMs = now() - postStarted;
        postprocessMs += itemPostprocessMs;
        const itemInferenceMs = inference.inferenceMs / chunk.length;
        results.push({
          ...result,
          image: {
            original: {
              width: entry.raster.originalWidth,
              height: entry.raster.originalHeight,
            },
            normalized: {
              width: entry.raster.width,
              height: entry.raster.height,
            },
            exifOrientation: entry.raster.exifOrientation,
          },
          model: this.model,
          runtime: this.runtime,
          timings: {
            decodeMs: entry.decodeMs,
            preprocessMs: entry.preprocessMs,
            inferenceMs: itemInferenceMs,
            postprocessMs: itemPostprocessMs,
            totalMs:
              entry.decodeMs +
              entry.preprocessMs +
              itemInferenceMs +
              itemPostprocessMs,
          },
        });
      });
    }
    return {
      results,
      timings: {
        totalMs: now() - started,
        decodeMs,
        preprocessMs,
        inferenceMs,
        postprocessMs,
      },
    };
  }
  clearModelCache() {
    return this.manager.clearCache();
  }
  listModelCache(): Promise<readonly ModelCacheEntry[]> {
    return this.manager.listCache();
  }
  async dispose() {
    if (!this.disposed) {
      this.disposed = true;
      await this.session.dispose();
    }
  }
  private assertLive() {
    if (this.disposed)
      throw new DocOrientationError(
        "INFERENCE_FAILED",
        "Detector has been disposed",
        { disposed: true },
      );
  }
}

export async function createDocOrientation(
  options: CreateDocOrientationOptions = {},
): Promise<DocOrientationDetector> {
  const started = now();
  const backend: Backend = options.backend ?? "wasm";
  const capabilities = await probeCapabilities();
  assertBackendSupported(backend, capabilities);
  const manifestStarted = now();
  const resolved = await loadManifest(
    options.model ?? DEFAULT_MANIFEST_URL,
    options.signal,
    options.onProgress === undefined
      ? undefined
      : (event) => options.onProgress?.(event),
  );
  const manifest = resolved.manifest;
  const manifestMs = now() - manifestStarted;
  const variant = manifest.variant;
  const manager = new ModelManager();
  const loaded = await manager.load(manifest, variant, {
    ...(resolved.data === undefined ? {} : { data: resolved.data }),
    ...(options.cache === undefined ? {} : { cache: options.cache }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.onProgress === undefined
      ? {}
      : { onProgress: options.onProgress }),
  });
  options.onProgress?.({ stage: "session" });
  let session: Awaited<ReturnType<typeof createOrtSession>> | InferenceExecutor;
  if (options.worker) {
    if (!capabilities.worker)
      throw new DocOrientationError(
        "CAPABILITY_UNSUPPORTED",
        "Inference workers are unavailable in this environment",
        { worker: true },
      );
    const worker = await createWorkerExecutor({
      worker: true,
      createWorker: () =>
        new Worker(resolveWorkerUrl(options.workerUrl), { type: "module" }),
      model: loaded.data.slice(0),
      manifest,
      backend,
    });
    if (worker === undefined)
      throw new DocOrientationError(
        "SESSION_CREATE_FAILED",
        "Unable to create inference worker",
      );
    session = worker;
  } else {
    session = await createOrtSession({
      backend,
      capabilities,
      manifest,
      modelBytes: loaded.data,
      ...(options.ort?.wasm === undefined ? {} : { wasm: options.ort.wasm }),
    });
  }
  const model: DocOrientationModelInfo = {
    ...manifest.model,
    variant: variant.id,
    bytes: variant.bytes,
    sha256: variant.sha256,
  };
  const runtime: DocOrientationRuntimeInfo = {
    backend,
    executionProvider: backend === "wasm" ? "wasm" : "webgpu",
    ...(backend === "wasm"
      ? {
          threads: capabilities.wasmThreads
            ? (options.ort?.wasm?.numThreads ?? 2)
            : 1,
        }
      : {}),
  };
  const loadTimings: LoadTimings = {
    manifestMs,
    downloadMs: loaded.downloadMs,
    sessionMs: session.sessionCreateMs,
    totalMs: now() - started,
    source: loaded.source,
  };
  return new Detector(
    capabilities,
    model,
    runtime,
    loadTimings,
    manifest,
    manager,
    session,
    options.onProgress === undefined
      ? undefined
      : () => options.onProgress?.({ stage: "inference" }),
  );
}

function resolveWorkerUrl(value: string | URL | undefined): URL {
  if (value !== undefined) return new URL(value.toString());
  if (DEFAULT_WORKER_URL !== undefined) return new URL(DEFAULT_WORKER_URL);
  return new URL(
    "./inference.worker.js",
    globalThis.location?.href ?? "https://localhost/",
  );
}
