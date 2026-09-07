# Vite 示例

可独立安装、运行和构建的完整版本位于 [Vanilla Vite 示例](../vanilla-vite/README.md)。本目录保留最小 API 集成片段。

在 Vite/TypeScript 应用中导入 SDK，`detectSelectedFile(file, "wasm")` 默认使用 CPU；批量任务可显式传入 `"webgpu"`，不会自动切换 provider。

```ts
const result = await detectSelectedFile(file, "wasm");
const gpuResult = await detectSelectedFile(file, "webgpu");
```

```bash
pnpm install
pnpm run build
```

在线 Demo：[PP-LCNet orientation](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/)。
