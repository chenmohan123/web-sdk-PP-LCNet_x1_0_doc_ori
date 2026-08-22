# web-sdk-pp-lcnet-x1-0-doc-ori

面向浏览器的 PP-LCNet 文档方向检测 SDK，使用 ONNX Runtime Web 在本地处理图片。

[在线 Demo](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) · [GitHub](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori) · [完整中文文档](../../README.md) · [English](../../README.en.md)

## 安装

```bash
npm install web-sdk-pp-lcnet-x1-0-doc-ori
```

## 使用

```ts
import { createDocOrientation, rotate } from "web-sdk-pp-lcnet-x1-0-doc-ori";

const detector = await createDocOrientation({ backend: "wasm" });
const file =
  document.querySelector<HTMLInputElement>("input[type=file]")!.files![0]!;
const result = await detector.detect(file);
console.log(result.orientation, result.score, detector.loadTimings);
const corrected = await rotate(file, result.correctionAngle);
console.log(corrected.type, corrected.size);
await detector.dispose();
```

`backend` 只接受 `wasm` 和 `webgpu`，必须由用户显式选择，SDK 不会自动切换 provider。批量任务使用 `detectBatch()`；单张图片通常选择 WASM/CPU，批量可显式选择 WebGPU/GPU。

Blob/File JPEG 输入会将 EXIF Orientation 1-8 只归一化一次；Canvas 和 ImageBitmap 被视为已经完成解码和方向处理。自定义微调模型可传入 manifest URL/对象，或经过 SHA-256 校验的 `{ manifest, data }`。

默认 manifest 与 ONNX 模型内置在 npm 包中并缓存到 IndexedDB；打包器无法暴露包资源时回退到项目 GitHub Pages。WASM 运行时资源默认使用 ONNX Runtime Web CDN，可通过 `ort.wasm.paths` 覆盖。

## 示例与文档

- [中文 API](../../docs/zh-CN/api.md) · [EXIF](../../docs/zh-CN/exif.md) · [自定义模型](../../docs/zh-CN/custom-models.md)
- [English API](../../docs/en/api.md) · [EXIF](../../docs/en/exif.md) · [Custom models](../../docs/en/custom-models.md)
- [CDN](../../examples/cdn/README.md) · [Vite](../../examples/vite/README.md) · [React](../../examples/react/README.md) · [微信 web-view](../../examples/wechat-web-view/README.md)

## English

Browser SDK for PaddlePaddle `PP-LCNet_x1_0_doc_ori`, powered by ONNX Runtime Web. Images are processed locally in the browser.

```bash
npm install web-sdk-pp-lcnet-x1-0-doc-ori
```

Use `backend: "wasm"` for CPU/WASM or explicitly choose `backend: "webgpu"` for GPU inference. The SDK never silently changes the selected provider. Use `detectBatch()` for ordered batch results. JPEG Blob/File inputs normalize EXIF Orientation 1-8 exactly once; Canvas and ImageBitmap inputs are treated as already decoded and oriented.

Custom fine-tuned models can be supplied as a manifest URL/object or as verified in-memory `{ manifest, data }` model bytes. The default manifest and model are bundled in the npm package and cached in IndexedDB with a memory fallback.

See the [English API docs](../../docs/en/api.md), [EXIF behavior](../../docs/en/exif.md), [custom models](../../docs/en/custom-models.md), and [online Demo](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/).
