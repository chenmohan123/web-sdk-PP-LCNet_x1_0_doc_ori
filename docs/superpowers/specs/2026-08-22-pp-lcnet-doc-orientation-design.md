# PP-LCNet Document Orientation Web SDK Design

**Status:** Approved

**Date:** 2026-08-22

## Goal

Build a public, Apache-2.0 TypeScript SDK and demo for running PaddlePaddle's `PP-LCNet_x1_0_doc_ori` document-image orientation classifier in browsers with ONNX Runtime Web. The SDK will support PC and mobile browsers, WeChat Official Account H5 pages, and WeChat mini-program `web-view` pages. Native WeChat mini-program inference is out of scope.

The official model classifies a normalized document image as `0`, `90`, `180`, or `270` degrees. It is not a multi-box layout detector.

## Decisions

- Repository: `web-sdk-PP-LCNet_x1_0_doc_ori`.
- npm package: `web-sdk-pp-lcnet-x1-0-doc-ori`.
- License: Apache-2.0, matching the upstream model license.
- Runtime providers: only explicit `wasm` and `webgpu`; no automatic provider selection or fallback.
- Default provider: `wasm`.
- Model delivery: the ONNX binary is committed to the repository and served from GitHub Pages/CDN. It is not bundled into the npm JavaScript bundle.
- Model customization: users provide a strict manifest URL or manifest object. An ONNX URL without a manifest is not accepted.
- Image orientation: JPEG EXIF orientation is normalized by default for Blob/File input. There is no public opt-out in the first release.
- Image correction: inference returns a correction angle; `rotate()` is a separate image transformation utility.
- Execution isolation: use a module Web Worker when supported; fall back to the main thread without changing the selected provider.

## Architecture

The repository uses a workspace layout based on the existing `web-sdk-PP-DocLayoutV3` project, but remains an independent project and package.

### SDK package

`packages/sdk` contains the public API and focused internal modules:

- `detector.ts`: initialization, provider selection, model loading, single-image and batch inference, timings, lifecycle, and cache methods.
- `types.ts`: public and manifest types.
- `errors.ts`: stable error codes and structured details.
- `image/exif.ts`: minimal JPEG APP1/Exif parser for Orientation values 1-8.
- `image/decode.ts`: decode Blob/File with `createImageBitmap(..., { imageOrientation: "none" })`, apply EXIF transforms, and normalize to RGBA. Canvas/ImageBitmap inputs are treated as already decoded and oriented.
- `image/rotate.ts`: rotate a decoded image by 0/90/180/270 degrees and encode a Blob.
- `preprocess.ts`: official resize-short-256, center-crop-224, RGB CHW conversion, 1/255 scaling, and ImageNet mean/std normalization.
- `postprocess.ts`: validate the single logits output, perform numerically stable softmax, map labels, and calculate correction angles.
- `runtime/`: ONNX Runtime Web session creation for WASM or WebGPU, capability probing, and worker bridge.
- `model/`: manifest parsing, schema checks, downloading, SHA-256 verification, and model metadata.
- `cache/`: memory and IndexedDB model cache implementations.

### Demo

`apps/demo` is a Vite + React application. It exposes a backend selector, file input, orientation and confidence output, original/corrected previews, detailed initialization and inference timings, model metadata, progress state, errors, and cache controls. The layout is responsive for desktop and mobile viewports.

### Model assets

`models/v1.0.0` contains the official `inference.onnx`, generated `manifest.json`, model README, and third-party attribution. GitHub Pages publishes this directory as the default model origin.

### Package outputs

The SDK build produces ESM for bundlers, an IIFE browser-global build for direct `<script>` H5 integration, and TypeScript declarations. The Worker bundle is emitted as a separate module asset.

## Public API

```ts
export type OrientationAngle = 0 | 90 | 180 | 270;
export type Backend = "wasm" | "webgpu";

export interface CreateDocOrientationOptions {
  readonly backend?: Backend;
  readonly model?: string | ModelManifest;
  readonly cache?: boolean;
  readonly worker?: boolean;
  readonly onProgress?: (event: ProgressEvent) => void;
  readonly ort?: {
    readonly wasm?: {
      readonly numThreads?: number;
      readonly paths?: string | Readonly<Record<string, string | URL>>;
    };
  };
  readonly signal?: AbortSignal;
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

export interface DocOrientationDetector {
  readonly capabilities: Capabilities;
  readonly model: DocOrientationModelInfo;
  readonly runtime: DocOrientationRuntimeInfo;
  readonly loadTimings: LoadTimings;
  detect(image: DecodableImage, options?: DetectOptions): Promise<OrientationResult>;
  detectBatch(
    images: readonly DecodableImage[],
    options?: DetectOptions
  ): Promise<OrientationBatchResult>;
  clearModelCache(): Promise<void>;
  listModelCache(): Promise<readonly ModelCacheEntry[]>;
  dispose(): Promise<void>;
}

export function createDocOrientation(
  options?: CreateDocOrientationOptions
): Promise<DocOrientationDetector>;

export function rotate(
  image: DecodableImage,
  angle: OrientationAngle,
  options?: { readonly type?: string; readonly quality?: number }
): Promise<Blob>;
```

`orientation` is the predicted current image orientation. `correctionAngle` is the clockwise angle needed to make the image upright: `(360 - orientation) % 360`.

## Manifest Contract

The manifest is the source of truth for custom models. It contains:

- `schemaVersion`.
- Model ID, version, architecture, parameter count, and model type.
- Input tensor name, float32 dtype, dynamic batch shape, and spatial shape `[3, 224, 224]`.
- One float32 logits output with shape `[N, 4]`.
- Ordered labels `['0', '90', '180', '270']`.
- Official preprocessing values: `resizeShort: 256`, `cropSize: 224`, `rescaleFactor: 1/255`, mean `[0.485, 0.456, 0.406]`, and std `[0.229, 0.224, 0.225]`.
- `maxBatchSize: 8` for the official model.
- ONNX URL, byte size, SHA-256, source repository, and license.

Manifest parsing rejects incompatible tensor names, dtypes, shapes, labels, preprocessing, or missing integrity metadata before session creation. A generation script derives official model metadata and parameter count from the ONNX asset.

## Data Flow

1. Initialization fetches and parses the manifest, probes the explicitly selected provider, downloads the model, verifies SHA-256, and creates the ONNX session.
2. Blob/File input parses JPEG EXIF Orientation. The image is decoded with automatic orientation disabled, then transformed to the visual orientation described by EXIF. Unsupported or malformed EXIF is treated as Orientation=1.
3. The normalized RGBA raster is resized so its short side is 256, center-cropped to 224x224, converted to float32 NCHW, and normalized with ImageNet statistics.
4. Batch inference preprocesses each image, stacks tensors to `[N, 3, 224, 224]`, splits requests larger than `maxBatchSize`, and preserves input order.
5. ONNX logits are copied, disposed, and postprocessed with stable softmax. The top class, all probabilities, model metadata, runtime metadata, and timings are returned.
6. A Worker receives transferable raster buffers when available. If Worker or OffscreenCanvas support is absent, the same executor runs on the main thread. A requested WebGPU provider never silently changes to WASM.

## Errors and Compatibility

Stable error codes are `CAPABILITY_UNSUPPORTED`, `MANIFEST_INVALID`, `MODEL_DOWNLOAD_FAILED`, `MODEL_INTEGRITY_FAILED`, `MODEL_INCOMPATIBLE`, `IMAGE_INVALID`, `SESSION_CREATE_FAILED`, `INFERENCE_FAILED`, `OUT_OF_MEMORY`, and `ABORTED`. Each error includes structured details such as provider, stage, URL, dimensions, or cause.

The SDK supports secure-context browser environments, PC/mobile browsers, WeChat Official Account H5, and mini-program `web-view`. Model and ONNX Runtime assets require HTTPS and CORS. WebGPU requires browser WebGPU support; WASM works without WebGPU. Native WeChat mini-program pages are not supported. Images remain in the user's browser and are never uploaded by the SDK.

## Verification

- Vitest covers manifest validation, EXIF orientations 1-8, pixel transforms, official preprocessing, softmax and angle mapping, batch splitting, provider strictness, cache behavior, aborts, and disposal.
- WASM integration tests run the official model for single and batch inputs. WebGPU tests run on supported browsers and assert `CAPABILITY_UNSUPPORTED` where unavailable.
- Playwright covers file selection, original/corrected previews, timing and model panels, backend selection, errors, mobile/desktop layouts, and no horizontal overflow.
- Release verification runs formatting, lint, typecheck, unit tests, browser tests, package builds, model SHA checks, and documentation parity checks.

## Release and Documentation

The repository is public and Apache-2.0 licensed. `THIRD_PARTY_NOTICES.md` attributes PaddlePaddle, PaddleOCR, and Hugging Face assets. GitHub Actions build and test the SDK, publish the npm package on tagged releases, and deploy the demo/model directory to GitHub Pages. Documentation includes Chinese and English README files, quick start, API reference, custom manifests, EXIF behavior, H5 and WeChat `web-view` examples, performance guidance, compatibility, and troubleshooting.
