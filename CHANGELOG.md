# Changelog

## Unreleased

- Added four offline Demo orientation sample documents covering 0°, 90°, 180°, and 270°, using the official PaddleOCR 180° input plus clearly labeled derived rotations. The sample document grid now sits below the Original and Corrected previews.

## 0.1.2 - 2026-08-22

- Published the Chinese-first bilingual npm README with online Demo, GitHub, English, EXIF, custom model, Worker, React, CDN, Vite, and WeChat links.
- Added the React example and integration example documentation to the published package release surface.
- Refined the Demo layout, hidden image input, clean preview states, SDK version display, and mobile behavior.

## 0.1.1 - 2026-08-22

- Bundled the official PaddlePaddle `PP-LCNet_x1_0_doc_ori` ONNX model and strict manifest.
- Added explicit WASM/CPU and WebGPU/GPU execution providers with no silent fallback.
- Added EXIF Orientation 1-8 normalization for JPEG Blob/File inputs and the `rotate()` utility.
- Added model metadata, cache source, load timings, and inference phase timings to results.
- Refreshed the Demo with Chinese-first bilingual controls, SDK version, GitHub link, single image button, and clean Original/Corrected empty states.
- Added React, CDN, Vite, and WeChat H5/web-view examples and bilingual API documentation.
- Documented Apache-2.0 model attribution, HTTPS/CORS requirements, custom manifests, Worker usage, and native WeChat mini-program limitations.

## 0.1.0

- Initial browser SDK for PP-LCNet document orientation classification.
