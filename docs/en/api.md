# API

`createDocOrientation({ backend: "wasm" | "webgpu" })` loads a strict manifest and returns a detector. `detect(image)` returns `orientation`, `correctionAngle`, `score`, `probabilities`, image dimensions, model metadata, runtime metadata, and decode/preprocess/inference/postprocess timings. `detectBatch(images)` returns ordered results and aggregate timings. `detector.loadTimings` separates manifest, model download/cache, Session creation, and total initialization time.

`rotate(image, angle)` returns a PNG Blob by default. The angle is clockwise and accepts `0`, `90`, `180`, or `270`.

Call `dispose()` when the detector is no longer needed. `clearModelCache()` and `listModelCache()` manage IndexedDB entries.
