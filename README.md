# web-sdk-PP-LCNet_x1_0_doc_ori

Browser-first document image orientation SDK for PaddlePaddle `PP-LCNet_x1_0_doc_ori`, powered by ONNX Runtime Web. It runs locally in PC/mobile browsers, WeChat Official Account H5, and WeChat mini-program `web-view` pages. Native mini-program inference is not supported.

## Install

```bash
npm install web-sdk-pp-lcnet-x1-0-doc-ori
```

```ts
import { createDocOrientation, rotate } from "web-sdk-pp-lcnet-x1-0-doc-ori";

const detector = await createDocOrientation({ backend: "wasm" });
const file =
  document.querySelector<HTMLInputElement>("input[type=file]")!.files![0]!;
const result = await detector.detect(file);
console.log(result.orientation, result.score, result.probabilities);
const corrected = await rotate(file, result.correctionAngle);
await detector.dispose();
```

`backend` is explicit and accepts only `wasm` (the default CPU path) or `webgpu`. The SDK never silently changes provider. Use `detectBatch(files)` for batches; requests are split at the manifest `maxBatchSize` while preserving order.

To explicitly request the GPU path, pass `backend: "webgpu"`:

```ts
const gpuDetector = await createDocOrientation({ backend: "webgpu" });
```

For an optional module Worker, pass `worker: true` and the URL of the published
`inference.worker.js` asset when your bundler does not colocate it automatically.

The default manifest is served from GitHub Pages and the model is cached in IndexedDB. Images never leave the browser. Model and ORT assets require HTTPS and CORS; WebGPU requires a secure context and browser WebGPU support.

## Model and EXIF

The official model input is `[N, 3, 224, 224]` with short-side resize 256, center crop 224, and ImageNet normalization. It returns the four labels `0`, `90`, `180`, and `270`. JPEG Blob/File input is decoded with EXIF auto-rotation disabled and Orientation 1-8 normalized exactly once. Canvas/ImageBitmap inputs are treated as already decoded and oriented.

Custom models must provide a strict manifest describing input/output names and shapes, labels, preprocessing, URL, byte size, and SHA-256. An ONNX URL without a manifest is rejected.

## Browser-global usage

```html
<script src="https://unpkg.com/web-sdk-pp-lcnet-x1-0-doc-ori/dist/browser-global.global.js"></script>
<script>
  const detector = await PPDocOrientation.createDocOrientation({ backend: "wasm" });
</script>
```

See [API](docs/en/api.md), [EXIF behavior](docs/en/exif.md), [custom models](docs/en/custom-models.md), and the [demo](apps/demo).

## Development

```bash
pnpm install --frozen-lockfile
pnpm verify
```

The model is Apache-2.0 licensed by PaddlePaddle. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
