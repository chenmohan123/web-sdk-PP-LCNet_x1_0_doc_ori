# web-sdk-PP-LCNet_x1_0_doc_ori

面向浏览器的文档方向检测 SDK，使用 PaddlePaddle 官方 `PP-LCNet_x1_0_doc_ori` ONNX 模型和 ONNX Runtime Web。在 PC、移动浏览器、公众号 H5 和微信小程序 `web-view` 中本地运行，图片不会上传到服务器。

[在线 Demo](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) · [GitHub](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori) · [npm](https://www.npmjs.com/package/web-sdk-pp-lcnet-x1-0-doc-ori) · [English](README.en.md)

## 安装

```bash
npm install web-sdk-pp-lcnet-x1-0-doc-ori@0.2.0
```

## 快速开始

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

`backend` 必须显式选择 `wasm`（WASM/CPU）或 `webgpu`（WebGPU/GPU），SDK 不会静默切换 provider。单张图片通常使用 WASM/CPU；批量任务可在支持 WebGPU 的浏览器中显式选择 GPU，并使用 `detectBatch(images)` 保持输入顺序。

```ts
const gpuDetector = await createDocOrientation({ backend: "webgpu" });
```

## 能力

- 默认内置官方 PP-LCNet ONNX 模型，并使用 IndexedDB 缓存模型。
- 返回方向、置信度、概率、校正角度、模型信息、实际 backend 和分阶段耗时。
- `rotate()` 独立生成校正后的 PNG Blob；`worker: true` 可把推理放入模块 Worker。
- JPEG `Blob`/`File` 的 EXIF Orientation 1-8 会在 SDK 内关闭浏览器自动旋转后只归一化一次。
- `Canvas`、`ImageBitmap`、`OffscreenCanvas` 被视为调用方已经完成解码和方向处理。
- 支持用户提供自定义 manifest URL/对象，或经过 SHA-256 校验的 `{ manifest, data }` 微调模型。

## 浏览器与微信

模型和 ONNX Runtime Web 资源需要 HTTPS 与 CORS；WebGPU 还需要安全上下文和浏览器支持。微信支持公众号 H5 和小程序 `web-view` 页面，不支持在原生小程序页面直接运行 ONNX Runtime Web。

## 文档与示例

- [中文快速开始](docs/zh-CN/quick-start.md) · [中文 API](docs/zh-CN/api.md) · [中文 EXIF](docs/zh-CN/exif.md)
- [英文快速开始](docs/en/quick-start.md) · [英文 API](docs/en/api.md) · [英文 EXIF](docs/en/exif.md)
- [自定义模型](docs/zh-CN/custom-models.md) · [兼容性](docs/zh-CN/compatibility.md) · [性能](docs/zh-CN/performance.md) · [故障排查](docs/zh-CN/troubleshooting.md)
- [CDN 示例](examples/cdn/README.md) · [Vite 示例](examples/vite/README.md) · [React 示例](examples/react/README.md) · [微信 web-view 示例](examples/wechat-web-view/README.md)

## Demo 示例文档

在线 Demo 的“示例文档”区域位于 Original 和 Corrected 预览下方，提供 0°、90°、180°、270° 四个方向样例。180° 文档是 PaddleOCR 官方 `img_rot180_demo.jpg`；其余三张是从官方原图生成的派生旋转图，并在 Demo 中明确标注。来源、固定 commit 和 SHA-256 见 [第三方声明](THIRD_PARTY_NOTICES.md)。

浏览器全局构建：

```html
<script src="https://unpkg.com/web-sdk-pp-lcnet-x1-0-doc-ori@0.2.0/dist/browser-global.global.js"></script>
<script>
  const detector = await PPDocOrientation.createDocOrientation({ backend: "wasm" });
</script>
```

## 开发与许可

```bash
pnpm install --frozen-lockfile
pnpm verify
```

模型和 SDK 使用 Apache-2.0；第三方组件和模型来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## English

The complete English README is available at [README.en.md](README.en.md).
