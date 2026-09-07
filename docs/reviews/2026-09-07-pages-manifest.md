# Pages 与模型声明审查记录

核验日期：2026-09-07。标准版本：1.1.0。

本次属于单 SDK Demo 修复与部署准备，补充现有能力声明，不扩展 runtime API、Examples 结构或浏览器兼容性承诺。模型身份、字节数和 SHA-256 来自 `models/manifest.json`，npm 身份来自 `packages/sdk/package.json`。

## Pages 配置

`.github/workflows/pages.yml` 增加 main 分支手动发布、并发取消控制、`github-pages` 环境及部署 URL，并拆分构建和部署 job。构建只有读取权限，`pages: write` 与 `id-token: write` 仅授予部署 job。

构建沿用 `pnpm --filter web-sdk-pp-lcnet-x1-0-doc-ori build`、包资源校验、`pnpm --filter @pplcnet/demo build` 以及模型复制流程。`apps/demo/vite.config.ts` 在 GitHub Actions 中根据仓库名确定发布子路径。

## 本地检查

在门户仓库运行 `pnpm sdk:check -- --repo ../web-sdk-PP-LCNet_x1_0_doc_ori --format table`：修改前 required 失败 7 项；补齐 manifest 后失败 8 项，远程规则 4 项仍为 skip。仓库状态仍为 `partial`。新增声明让检查器能够逐项列出原先未展开的耗时字段缺口，因此失败数不能直接理解为新增缺陷数。

| 规则                  | 现有证据与影响                                                                                                                                                                     | 后续修复                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| CONFIG-001（3 项）    | `packages/sdk/src/model/model-manager.ts` 的 `downloadMs` 合并网络下载、完整性校验与缓存写入；缓存命中返回零，尚无 `modelDownloadMs`、`modelCacheReadMs`、`integrityMs` 独立阶段。 | 独立改造加载耗时契约，并补充冷/热运行定义和回归测试。                        |
| CONFIG-001、CACHE-001 | `clearModelCache()` 仅清空 SDK 缓存，未实现单模型清理和容量估计；manifest 如实声明 `clearCurrent: false`、`estimate: false`。                                                      | runtime 增加可区分作用域的清理接口与容量估计。                               |
| RUNTIME-001           | `packages/sdk/src/detector.ts` 从请求选项构造 `runtime.backend`，没有独立返回实际后端与执行模式；manifest 保守声明 `actualBackendReported: false`。                                | 将已创建 session/executor 的实际后端和执行模式传入公开结果，并测试。         |
| DEMO-004              | 当前 `apps/demo/src/main.ts` 与 `render.ts` 未暴露当前模型与全部缓存清理控件。                                                                                                     | 配合缓存 API 改造增加两个独立操作与状态。                                    |
| EXAMPLE-001           | 没有 `examples/vanilla`；`examples/vite` 只有片段和 README，尚缺独立运行入口与 package 配置。                                                                                      | 补充可独立安装、运行与构建的 vanilla 示例，再更新 manifest 的 planned 状态。 |

检查器的 `PERF-001` 会根据非空耗时数组判定通过，但 `CONFIG-001` 仍揭示标准加载耗时字段缺项；不得据此宣称完全符合标准。

`GOV-001`、`GOV-002`、`DEPLOY-001`、`PAGES-001` 的 skip 不代表通过。实际分支 Ruleset、Pages Source、HTTPS 与成功部署提交需要发布阶段的 GitHub API 证据。

浏览器矩阵暂保留空数组，此次配置审查不能代替真实推理验证。

## 验证结果

- 使用 Ajv 2020 对门户 `standards/v1/sdk-manifest.schema.json` 校验通过；manifest 中包身份、版本、模型参数量、资源大小及 SHA-256 与仓库源文件逐项一致。
- 使用 YAML 结构化解析检查 Pages 的 main 限制、环境、job 依赖、官方 actions 和最小权限，通过。
- 对本次修改文件执行 Prettier 检查，通过；`git diff --check` 通过。
- Demo 构建、浏览器交互与发布后的远程核验由同一发布任务另行执行，本配置审查不将它们记为通过。
