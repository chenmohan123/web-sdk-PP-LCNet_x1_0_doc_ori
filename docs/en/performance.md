# Performance

[中文](../zh-CN/performance.md)

Use WASM/CPU for a single image and explicitly choose WebGPU for larger batches when supported. `loadTimings` and result `timings` separately report manifest loading, model download/cache, session creation, decode, preprocess, inference, and postprocess durations. Reuse a detector for multiple images and call `dispose()` when finished.

`loadTimings.modelDownloadMs` measures network model-byte acquisition only; `modelCacheReadMs` measures cache lookup and reading, including misses; `integrityMs` measures SHA-256 and length verification. A corrupt-cache retry accumulates both integrity checks. `sessionMs` measures session creation, `manifestMs` measures manifest loading, and `totalMs` covers full initialization including cache writes and scheduling overhead. Cache hits have zero download time. Direct model bytes have zero download and cache-read time but still report integrity checks.

Legacy `downloadMs` retains its behavior: on network loads it includes download, verification, and cache writing, while cache hits and direct bytes report zero. It is not the standard network-only timing. Result `timings` contains `decodeMs`, `preprocessMs`, `inferenceMs`, `postprocessMs`, and `totalMs` for that detection only, excluding initialization.

A cold start creates a detector and performs its first detection; report load and detection durations separately with `source`. A cache hit still creates a new session and remains a cold start. A warm run calls `detect()` on an existing detector session; cached acquisition is not warm inference. The Demo's load-and-detect action always recreates the session and shows source, phase timings, actual backend, execution mode, runtime version, browser, and test date. The public SDK supports warm runs through detector reuse.

`estimateModelCache()` measures logical cached model bytes, counting persistent and memory copies of the same key once. Performance evidence only applies to the stated browser, OS, device, backend, and date. This standards remediation adds no device or backend compatibility claims.
