import type { DocOrientationErrorCode } from "./errors";

export type OrientationAngle = 0 | 90 | 180 | 270;
export type Backend = "wasm" | "webgpu";
export type DecodableImage =
  Blob | File | ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

export interface NormalizedRaster {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly exifOrientation: number;
}

export interface ModelTensorSpec {
  readonly name: string;
  readonly dtype: "float32";
  readonly shape: readonly ["batch", 3, 224, 224] | readonly ["batch", 4];
}

export interface ModelVariant {
  readonly id: string;
  readonly bytes: number;
  readonly opset: number;
  readonly sha256: string;
  readonly url: string;
}

export interface ModelManifest {
  readonly schemaVersion: 1;
  readonly model: {
    readonly id: string;
    readonly version: string;
    readonly architecture: string;
    readonly modelType: string;
    readonly parameterCount: number;
  };
  readonly input: ModelTensorSpec & {
    readonly shape: readonly ["batch", 3, 224, 224];
  };
  readonly output: ModelTensorSpec & { readonly shape: readonly ["batch", 4] };
  readonly labels: readonly ["0", "90", "180", "270"];
  readonly maxBatchSize: number;
  readonly preprocessing: {
    readonly resizeShort: 256;
    readonly cropSize: 224;
    readonly rescaleFactor: number;
    readonly imageMean: readonly [number, number, number];
    readonly imageStd: readonly [number, number, number];
  };
  readonly variant: ModelVariant;
  readonly source: {
    readonly name: string;
    readonly url: string;
    readonly license: string;
    readonly files: Readonly<Record<string, string>>;
  };
}

export interface DocOrientationModelInfo {
  readonly id: string;
  readonly version: string;
  readonly architecture: string;
  readonly modelType: string;
  readonly parameterCount: number;
  readonly variant: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface DocOrientationRuntimeInfo {
  readonly backend: Backend;
  readonly executionProvider: string;
  readonly threads?: number;
}

export interface LoadTimings {
  readonly manifestMs: number;
  readonly downloadMs: number;
  readonly sessionMs: number;
  readonly totalMs: number;
  readonly source: "network" | "cache" | "memory";
}

export interface ProgressEvent {
  readonly stage: "manifest" | "download" | "session" | "inference";
  readonly loaded?: number;
  readonly total?: number;
}

export interface DetectOptions {
  readonly signal?: AbortSignal;
}

export interface CreateDocOrientationOptions {
  readonly backend?: Backend;
  readonly model?: string | ModelManifest;
  readonly cache?: boolean;
  readonly worker?: boolean;
  readonly workerUrl?: string | URL;
  readonly onProgress?: (event: ProgressEvent) => void;
  readonly ort?: {
    readonly wasm?: {
      readonly numThreads?: number;
      readonly paths?: string | Readonly<Record<string, string | URL>>;
    };
  };
  readonly signal?: AbortSignal;
}

export interface Capabilities {
  readonly wasm: boolean;
  readonly webgpu: boolean;
  readonly worker: boolean;
  readonly offscreenCanvas: boolean;
  readonly wasmSimd?: boolean;
  readonly wasmThreads?: boolean;
}

export interface OrientationResult {
  readonly orientation: OrientationAngle;
  readonly correctionAngle: OrientationAngle;
  readonly label: string;
  readonly score: number;
  readonly probabilities: Readonly<Record<string, number>>;
  readonly image: {
    readonly original: { readonly width: number; readonly height: number };
    readonly normalized: { readonly width: number; readonly height: number };
    readonly exifOrientation: number;
  };
  readonly model: DocOrientationModelInfo;
  readonly runtime: DocOrientationRuntimeInfo;
  readonly timings: {
    readonly decodeMs: number;
    readonly preprocessMs: number;
    readonly inferenceMs: number;
    readonly postprocessMs: number;
    readonly totalMs: number;
  };
}

export interface OrientationBatchResult {
  readonly results: readonly OrientationResult[];
  readonly timings: {
    readonly totalMs: number;
    readonly decodeMs: number;
    readonly preprocessMs: number;
    readonly inferenceMs: number;
    readonly postprocessMs: number;
  };
}

export interface ModelCacheEntry {
  readonly key: string;
  readonly modelId: string;
  readonly version: string;
  readonly variant: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface DocOrientationDetector {
  readonly capabilities: Capabilities;
  readonly model: DocOrientationModelInfo;
  readonly runtime: DocOrientationRuntimeInfo;
  readonly loadTimings: LoadTimings;
  detect(
    image: DecodableImage,
    options?: DetectOptions,
  ): Promise<OrientationResult>;
  detectBatch(
    images: readonly DecodableImage[],
    options?: DetectOptions,
  ): Promise<OrientationBatchResult>;
  clearModelCache(): Promise<void>;
  listModelCache(): Promise<readonly ModelCacheEntry[]>;
  dispose(): Promise<void>;
}

export type PublicErrorCode = DocOrientationErrorCode;
