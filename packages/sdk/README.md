# web-sdk-pp-lcnet-x1-0-doc-ori

Browser SDK for PaddlePaddle `PP-LCNet_x1_0_doc_ori`, powered by ONNX Runtime Web.
Images are processed locally in the browser.

## Install

```bash
npm install web-sdk-pp-lcnet-x1-0-doc-ori
```

```ts
import { createDocOrientation, rotate } from "web-sdk-pp-lcnet-x1-0-doc-ori";

const detector = await createDocOrientation({ backend: "wasm" });
const file = document.querySelector<HTMLInputElement>("input[type=file]")!.files![0]!;
const result = await detector.detect(file);
console.log(result.orientation, result.score, detector.loadTimings);
const corrected = await rotate(file, result.correctionAngle);
console.log(corrected.type, corrected.size);
await detector.dispose();
```

Use `backend: "wasm"` for CPU/WASM or explicitly choose `backend: "webgpu"` for
GPU inference. The SDK never silently changes the selected provider. Use
`detectBatch()` for ordered batch results.

Blob/File JPEG inputs normalize EXIF Orientation 1-8 exactly once. Canvas and
ImageBitmap inputs are treated as already decoded and oriented.

Custom fine-tuned models can be supplied as a manifest URL/object or as verified
in-memory `{ manifest, data }` model bytes. The manifest must preserve the
PP-LCNet input/output and preprocessing contract.

The default manifest and model are bundled in the npm package and cached in
IndexedDB with a memory fallback. The SDK falls back to the project GitHub
Pages copy when a bundler cannot expose package assets. WASM runtime assets
default to the ONNX Runtime Web CDN and can be overridden with `ort.wasm.paths`.

See the full documentation and examples in the repository:
https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori
