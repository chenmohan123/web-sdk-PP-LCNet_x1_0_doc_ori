# PP-LCNet Demo, Documentation, and Release Design

**Date:** 2026-08-22  
**Repository:** `web-sdk-PP-LCNet_x1_0_doc_ori`  
**Status:** Approved for implementation planning

## Goal

完善已发布的 `web-sdk-pp-lcnet-x1-0-doc-ori`，使 Demo、README、文档、示例和 GitHub 发布信息达到可公开维护的状态。Demo 默认显示中文，支持当前页面内的中英文切换；刷新后始终恢复中文。桌面端和移动端采用参考 `web-sdk-PP-DocLayoutV3` 的 A 方案布局。

## Scope

- Demo 顶部轻量品牌栏：较小的 `PP-LCNet document orientation` 标题、SDK 版本号、GitHub 链接、中文/English 切换。
- 单按钮图片选择；隐藏原生文件输入；Original/Corrected 使用干净空状态，避免无 `src` 的破图。
- 保留并整理 WASM/CPU 与 WebGPU/GPU 手动选择、模型信息、加载耗时、推理耗时和方向结果。
- README 与 docs 提供中文和英文，中文默认展示；中英文页面相互链接并提供在线 Demo。
- 增加可运行的 React 示例，补齐 npm/CDN、Vite、React、微信 H5/web-view 文档入口。
- 新增或整理 changelog；使用已存在的 `v0.1.1` tag 创建 GitHub Release；设置 GitHub About Homepage、description 和 topics。

不在本次范围内：增加新的 ONNX Runtime backend、自动 backend 切换、原生微信小程序页面推理、SDK API 破坏性改动、将主 Demo 改写为 React。

## Chosen Approach

采用保留原生 TypeScript Demo、抽出类型化文案和渲染职责的方案。这样不增加框架依赖，保持 SDK 框架无关，同时把双语、空状态和测试从单一模板字符串中分离出来。React 只作为独立 examples 消费 SDK，不反向影响主 Demo 的运行时。

## Architecture

### Demo modules

- `apps/demo/src/i18n/zh-CN.ts`：中文完整文案，作为默认语言。
- `apps/demo/src/i18n/en.ts`：英文完整文案，键名与中文保持一致。
- `apps/demo/src/i18n/index.ts`：`Language` 类型、当前语言状态、文案访问和切换；状态仅存在内存中，不写 `localStorage`。
- `apps/demo/src/render.ts`（或同等职责的拆分模块）：生成顶部栏、控制区、预览区、结果/模型/耗时区，并使用稳定的 `data-testid` 或语义标记。
- `apps/demo/src/main.ts`：SDK 生命周期、文件状态、object URL 管理、语言切换和事件绑定。
- `apps/demo/src/styles.css`：A 方案布局和响应式断点，复用旧 SDK 的工具页视觉语言。

页面布局为：顶部品牌栏 -> 控制带 -> 状态行 -> 工作区。桌面工作区左侧为预览，右侧为结果/模型/耗时；窄屏堆叠为单列。按钮和选择器使用稳定高度，避免文件名、状态或长模型名造成布局跳动。

### Preview state

未选择图片时，Original 和 Corrected 区域渲染带标题的空状态容器，不渲染没有 `src` 的 `<img>`。选择文件后只创建原图 object URL；检测成功并完成 `rotate()` 后再创建校正图 object URL。重新选择文件、切换后端、重新检测或销毁 detector 时释放旧 URL 和 detector。

### Runtime data flow

1. 初始化时加载中文文案，并从构建注入值或 SDK package metadata 显示版本号。
2. 用户显式选择 `wasm` 或 `webgpu`；SDK 不做静默 provider 替换。
3. 选择 `image/*` 文件后显示文件名/尺寸、原图预览，并清空上一轮结果和校正图。
4. 点击检测后调用 `createDocOrientation({ backend, onProgress })`，实时更新模型加载状态。
5. 调用 `detector.detect(file)`，渲染方向、置信度、校正角度、模型元数据、实际 backend 与所有 timing 字段。
6. 调用 `rotate(file, correctionAngle)` 生成校正 Blob 并渲染；EXIF 归一化由 SDK 完成一次，Demo 不重复处理。
7. 切换语言只替换 Demo 文案和状态文本，不改变 SDK API、模型数据或检测结果。

React 示例复用同一数据流，通过组件状态呈现 `empty/loading/success/error`，并提供 backend 选择、选图、检测、结果、原图/校正图和 timing 信息。

## Error Handling

- `DocOrientationError` 显示稳定错误码、可读消息和非敏感 details。
- WebGPU 不可用、安全上下文不足或初始化失败时，明确提示用户手动切换 WASM；不自动切换。
- 自定义 manifest 缺失、输入输出契约不符或 SHA-256 校验失败时停止推理并展示 SDK 错误。
- 图片解码、EXIF 或旋转失败时保留可用的原图/检测状态，不生成破图校正预览。
- 所有异步路径在 `finally` 中恢复按钮可用性；重复点击不能创建并行 detector。

## Documentation and Examples

- `README.md`：中文默认；顶部列出 npm 安装、在线 Demo、GitHub、中文/英文文档、API、EXIF、自定义模型、Worker、React、CDN、Vite、微信 web-view 入口。
- `README.en.md`：完整英文等价内容。
- `packages/sdk/README.md`：npm 页面中文在前，英文放入 `## English`；包含在线 Demo 与 GitHub 链接。
- `docs/zh-CN/*` 与 `docs/en/*`：API、EXIF、自定义模型、Worker 和示例页面，中英文互链。
- `examples/react`：独立 Vite + React + TypeScript 示例，真实导入 SDK，默认 WASM，可手动切换 WebGPU，并展示检测结果和耗时。
- 现有 `examples/cdn`、`examples/vite`、`examples/wechat-web-view` 保留，README 统一说明微信只支持 H5 / `web-view`，不支持原生小程序页面直接运行 ONNX Runtime Web。

## Release and GitHub Metadata

- 新增或整理根目录 `CHANGELOG.md`，记录 Demo 双语、预览空状态、React 示例、文档和发布元数据完善。
- 先检查 `v0.1.1` 是否已有 Release；若没有，使用现有 tag 创建 `v0.1.1` Release，不重新创建或移动 tag。
- Release notes 标明官方 PaddlePaddle 模型来源、Apache-2.0、默认内置模型、WASM/WebGPU、EXIF 归一化、Worker、自定义模型和示例。
- GitHub About 设置 Homepage 为 `https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/`，并补充描述和主题。
- npm 发布继续使用已验证的 GitHub Actions Trusted Publishing；本次不在本地写入 token。

## Verification

### Automated checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @pplcnet/demo test
node --test scripts/check-doc-parity.test.mjs scripts/verify-release.mjs
npm pack --dry-run
```

### Demo Playwright coverage

- 初始中文文案、GitHub 链接和 `SDK v0.1.1` 可见。
- 语言切换后英文可见，刷新后中文恢复。
- 原生 file input 不可见，选择图片按钮存在且可用。
- 未选图时没有 broken image；选择图片后只有原图 object URL，检测完成后才出现校正图。
- 结果、模型信息、CPU/GPU backend 和加载/推理耗时可见。
- Desktop 与 Pixel 5 视口无横向溢出，预览和信息区不重叠。

### Example checks

`examples/react` 可独立安装、构建和启动；所有示例 README 链接指向可用路径；npm dry-run 包含默认模型、声明文件、browser-global 构建和 Worker 资源。

