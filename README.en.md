# web-sdk-PP-LCNet_x1_0_doc_ori

Browser-first document orientation SDK for PaddlePaddle's official `PP-LCNet_x1_0_doc_ori` ONNX model, powered by ONNX Runtime Web. It runs locally in PC and mobile browsers, WeChat Official Account H5, and WeChat mini-program `web-view` pages. Images never leave the browser.

[Online Demo](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) · [GitHub](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori) · [npm](https://www.npmjs.com/package/web-sdk-pp-lcnet-x1-0-doc-ori) · [中文 README](README.md)

## Install

```bash
npm install web-sdk-pp-lcnet-x1-0-doc-ori
```

## Quick start

```ts
import { createDocOrientation, rotate } from "web-sdk-pp-lcnet-x1-0-doc-ori";

const detector = await createDocOrientation({ backend: "wasm" });
const file =
  document.querySelector<HTMLInputElement>("input[type=file]")!.files![0]!;
const result = await detector.detect(file);

console.log(result.orientation, result.score, result.probabilities);
const corrected = await rotate(file, result.correctionAngle);
console.log(corrected.type, corrected.size, detector.loadTimings);
await detector.dispose();
```

`backend` is explicit and accepts only `wasm` (WASM/CPU) or `webgpu` (WebGPU/GPU). The SDK never silently changes provider. Use WASM for a single image; for batches, explicitly choose WebGPU where available and call `detectBatch(images)` to preserve input order.

## Features

- The official PP-LCNet ONNX model is bundled by default and cached in IndexedDB.
- Results include orientation, confidence, probabilities, correction angle, model metadata, the actual backend, and phase timings.
- `rotate()` independently returns a corrected PNG Blob; `worker: true` enables module Worker inference.
- JPEG `Blob`/`File` inputs normalize EXIF Orientation 1-8 exactly once with browser auto-rotation disabled.
- `Canvas`, `ImageBitmap`, and `OffscreenCanvas` inputs are treated as already decoded and oriented by the caller.
- Fine-tuned models can be supplied as a manifest URL/object or verified in-memory `{ manifest, data }` bytes.

## Browser and WeChat compatibility

Model and ONNX Runtime Web assets require HTTPS and CORS. WebGPU additionally requires a secure context and browser support. WeChat H5 and mini-program `web-view` pages are supported; native mini-program pages cannot run ONNX Runtime Web directly.

## Documentation and examples

- [English quick start](docs/en/quick-start.md) · [API](docs/en/api.md) · [EXIF](docs/en/exif.md)
- [Custom models](docs/en/custom-models.md) · [Compatibility](docs/en/compatibility.md) · [Performance](docs/en/performance.md) · [Troubleshooting](docs/en/troubleshooting.md)
- [CDN example](examples/cdn/README.md) · [Vite example](examples/vite/README.md) · [React example](examples/react/README.md) · [WeChat web-view example](examples/wechat-web-view/README.md)

Browser-global usage:

```html
<script src="https://unpkg.com/web-sdk-pp-lcnet-x1-0-doc-ori/dist/browser-global.global.js"></script>
<script>
  const detector = await PPDocOrientation.createDocOrientation({ backend: "wasm" });
</script>
```

## Development and license

```bash
pnpm install --frozen-lockfile
pnpm verify
```

The SDK and model are distributed under Apache-2.0. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [CHANGELOG.md](CHANGELOG.md).
