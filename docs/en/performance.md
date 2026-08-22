# Performance

[中文](../zh-CN/performance.md)

Use WASM/CPU for a single image and explicitly choose WebGPU for larger batches when supported. `loadTimings` and result `timings` separately report manifest loading, model download/cache, session creation, decode, preprocess, inference, and postprocess durations. Reuse a detector for multiple images and call `dispose()` when finished.
