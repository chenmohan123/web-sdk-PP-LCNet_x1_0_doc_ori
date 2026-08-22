# React 示例

这个示例使用 React 19 + Vite + TypeScript 调用 `web-sdk-pp-lcnet-x1-0-doc-ori`，默认 `backend: "wasm"`（WASM/CPU），也可以手动选择 `backend: "webgpu"`（WebGPU/GPU）。

```bash
pnpm install
pnpm run dev
```

打开本地地址后选择图片，页面会展示 Original/Corrected、方向、置信度、模型信息、加载耗时和推理耗时。图片只在浏览器本地处理。

在线 Demo：[PP-LCNet orientation](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) · 仓库：[GitHub](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori)
