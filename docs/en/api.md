# API

[中文](../zh-CN/api.md)

`createDocOrientation({ backend: "wasm" | "webgpu" })` loads a strict manifest and returns a detector. `detect(image)` returns `orientation`, `correctionAngle`, `score`, `probabilities`, image dimensions, model metadata, runtime metadata, and decode/preprocess/inference/postprocess timings. `detectBatch(images)` returns ordered results and aggregate timings. `detector.loadTimings` separates manifest, model download/cache, Session creation, and total initialization time.

`rotate(image, angle)` returns a PNG Blob by default. The angle is clockwise and accepts `0`, `90`, `180`, or `270`.

Call `dispose()` when the detector is no longer needed. `clearModelCache()` and `listModelCache()` manage IndexedDB entries.

`detector.runtime` and each result's `runtime` come from the successfully created execution session. They report `requestedBackend`, `actualBackend`, `execution` (`main` or `worker`), `runtimeVersion`, and `executionProvider`, plus the configured WASM thread count. The legacy `backend` remains available. The SDK configures one explicitly selected provider and fails instead of silently switching providers. `actualBackend` identifies that session provider; it does not claim every operator executes on the GPU. Worker metadata comes from the session inside the Worker. A custom `workerUrl` must match the SDK version.

```ts
import {
  clearCurrentModelCache,
  clearAllModelCache,
  estimateModelCache,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";

const scope = { modelId: "PP-LCNet_x1_0_doc_ori", version: "1.0.0" };
const current = await estimateModelCache(scope);
console.log(current.bytes, current.entries);
await clearCurrentModelCache(scope);
await clearAllModelCache();
```

The cache namespace is this SDK's `pp-lcnet-doc-orientation/models` IndexedDB store and its shared memory fallback in the current JavaScript context. Current cleanup matches both model ID and version, covering all precisions and checksums. Global cleanup only removes this SDK's model data, leaving other databases, Cache Storage, and origin data intact. `estimateModelCache(scope?)` returns deduplicated model bytes, entry count, and scope; omitting the scope measures all models owned by this SDK. These are logical model bytes, not origin quota or physical disk usage.

New writes use a JSON tuple key with format version `v2`, preserving model ID, version, variant, and checksum as separate fields. Slashes and percent signs cannot change field boundaries. Legacy path keys remain readable only when the entry's key, model ID, version, variant, SHA-256, and byte count all match, followed by content verification. A different model under a colliding legacy key is neither reused nor overwritten; new models receive independent keys.

Detectors also expose `clearCurrentModelCache()` for their own model, `clearAllModelCache()`, and `estimateModelCache(scope?)`. Legacy `clearModelCache()` still clears all SDK models, and `listModelCache()` still lists all SDK models. Top-level cache APIs need no model download first. Cleanup leaves existing inference sessions usable; call `dispose()` to release them. Within the same module context, cleanup prevents earlier downloads from repopulating the cache when they finish. Hosts must coordinate other tabs or independent SDK copies.

Loading and inference accept `AbortSignal`. Cancellation is checked after cache reads, integrity checks, and session creation; cancelled initialization never returns a usable detector. Underlying session creation may finish before cancellation can be observed, after which the session is released. Load progress adds `cache` and `integrity` stages.
