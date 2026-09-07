# Vanilla TypeScript / Vite 示例

此目录可以单独复制、安装和运行，仅依赖公开 npm 包 `web-sdk-pp-lcnet-x1-0-doc-ori@0.2.0`，不引用 SDK 内部源码。环境要求 Node.js 22.12+；独立安装需等待该版本发布到 npm。

```powershell
cd examples/vanilla-vite
pnpm install
pnpm dev
```

打开终端给出的地址，选择图片后点击“开始检测”。默认 `wasm`，可显式选择 `webgpu`；不支持所选后端时显示稳定错误码，不自动切换。页面使用 ModelScope 官方模型，下载后由 SDK 校验和缓存；图片不会上传。

```powershell
pnpm build
pnpm preview
```

“取消”通过 AbortSignal 传给模型加载和推理。运行期间禁用图片与后端控件；任务结束后释放 detector，支持再次运行。原始结果和加载耗时以 JSON 展示。

仓库开发与 CI 验证执行根目录的 `pnpm examples:verify`：先打包当前 SDK，再复制本示例到独立临时目录，只在那里将依赖替换为 tarball，完成安装、类型检查、生产构建及浏览器真实 90° 推理、取消、失败后的再次成功推理。正式示例依赖不被改写；验证不依赖新版本已在 npm 发布。

本独立示例不提交锁文件，安装时使用 `pnpm install`；根工作区仍使用自己的冻结锁文件。

[完整 Demo](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) · [SDK 仓库](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori)
