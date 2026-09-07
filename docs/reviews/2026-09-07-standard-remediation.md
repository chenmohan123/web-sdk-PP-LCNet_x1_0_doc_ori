# 2026-09-07 标准缺项整改验证

本次属于单 SDK 层整改，依据门户 `standards/v1` 的 SDK、Demo、性能、Examples 与文档契约。SDK 与模型版本保持 `0.1.2`、`1.0.0`。原始审查记录 [2026-09-07-pages-manifest.md](2026-09-07-pages-manifest.md) 保留不变。

## 标准检查结果

从门户仓库执行：

```powershell
pnpm sdk:check -- --repo ../web-sdk-PP-LCNet_x1_0_doc_ori --format table
```

整改前：`partial`，required 失败 8 项。整改后：`locally-compliant`，required 失败 0 项、跳过 4 项、未知 0 项，recommended 失败 0 项。远程 Ruleset、发布标签、部署及 Pages 配置仍按只读本地检查的规则跳过，不能据此称为完整远程合规。

| 缺项        | 已实现的行为                                                                                                      | 证据                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| PERF-001    | 独立记录 `modelDownloadMs`、`modelCacheReadMs`、`integrityMs`，保留旧 `downloadMs` 的网络下载/校验/写缓存合计语义 | `packages/sdk/src/model/model-manager.ts`、`packages/sdk/tests/model-manager.test.ts`                       |
| RUNTIME-001 | 运行信息来自创建成功的会话，主线程和 Worker 都传递请求/实际后端、执行模式、运行时版本；旧 `backend` 仍可用        | `packages/sdk/src/runtime/ort-session.ts`、`packages/sdk/src/worker/`、`packages/sdk/src/detector.ts`       |
| CACHE-001   | 顶层与检测器公开当前/全部清理和估计；当前精确匹配模型 ID 与版本，覆盖全部精度；全部仅作用于本 SDK 存储            | `packages/sdk/src/cache/indexeddb-cache.ts`、`packages/sdk/src/model/model-manager.ts`、`docs/zh-CN/api.md` |
| DEMO-004    | 展示当前缓存字节数，分别清理当前模型与全部 SDK 模型；加载/清理中禁用冲突操作，清理失败显示错误并恢复按钮          | `apps/demo/src/main.ts`、`apps/demo/src/render.ts`、`apps/demo/tests/cache-standard.spec.ts`                |
| DEMO-005    | 模型、运行时和标准耗时区域具有 DOM 标记；显示冷启动语义、实际会话后端、版本与测试环境                             | `apps/demo/src/render.ts`、`apps/demo/tests/runtime-assets.spec.ts`                                         |
| EXAMPLE-001 | 独立可安装运行的 Vanilla TypeScript/Vite 示例使用公开 SDK，清单指向有效目录                                       | `examples/vanilla-vite/`、`scripts/verify-vanilla-example.test.mjs`                                         |

## 回归覆盖

- 新增测试先复现了独立计时和缓存/运行时接口缺失；实际生产逻辑修改后通过。
- 使用可控时钟验证网络 20 ms、单次缓存读取 10 ms、校验 30 ms、写缓存 40 ms 时，标准下载值为 20 ms，旧下载值仍为 90 ms。首次未命中会依次查找新键和旧键，缓存读取累计 20 ms；新键命中只读取一次，累计 10 ms。
- 当前模型清理覆盖两个精度，保留另一版本和另一模型。不同管理器共享清理代次，清理前启动的下载不能在完成后回填。
- 缓存读取期间取消加载会返回 `ABORTED`。会话创建完成后若已取消，释放会话后拒绝返回检测器。
- Worker 取消任务的迟到错误曾终止新任务，测试先复现后验证修复；运行信息从 Worker 会话回传。
- 真实 IndexedDB 清理失败曾被吞掉，Demo 错报“清理完成”；测试先复现后验证错误显示、重试与数据保留。事务成功必须等待提交，事务中止不会当作成功。
- 真实浏览器验证禁用 IndexedDB 后内存降级缓存仍可通过公开 API 估计和清理。
- 生产浏览器使用仓库官方 ONNX 模型，在两个来源选择下实际执行 WASM 推理，识别 90° 文档；验证标准耗时、运行时版本、模型缓存容量及校正图。

## 首轮验证命令与结果

以下命令从本仓库根目录执行；Windows 验证会话设置了 `$env:PATHEXT = '.COM;.EXE;.BAT;.CMD'`，未修改持久化宿主配置。

| 命令                                                                                                                                                               | 结果                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `pnpm verify`                                                                                                                                                      | 通过：5 项 Node 校验、13 个测试文件的 49 项单元测试、SDK/Demo 类型检查与生产构建、npm 模型资产校验 |
| `pnpm lint`                                                                                                                                                        | 通过，SDK 和 Demo 均无 lint 错误                                                                   |
| `pnpm typecheck`                                                                                                                                                   | 通过                                                                                               |
| `node node_modules/playwright/cli.js test -c apps/demo/playwright.config.ts`                                                                                       | 30 项通过，4 项 WebGPU 用例因无适配器跳过                                                          |
| `pnpm --filter @pplcnet/demo build`                                                                                                                                | 最终生产构建通过                                                                                   |
| `node node_modules/playwright/cli.js test -c apps/demo/playwright.production.config.ts --output apps/demo/test-results/standard-production`                        | 8 项通过，4 项 WebGPU 环境跳过                                                                     |
| `node node_modules/playwright/cli.js test -c apps/demo/playwright.production.config.ts runtime-assets --output apps/demo/test-results/standard-production-runtime` | 增补 IndexedDB 禁用后的降级覆盖：4 项通过，4 项 WebGPU 环境跳过                                    |
| `git diff --check`                                                                                                                                                 | 通过                                                                                               |

验证日期为 2026-09-07。浏览器为 Windows 宿主上的 Playwright 无头 Chromium，包含桌面及 390 × 844 移动端模拟。测试使用实际 ONNX Runtime Web `1.27.0` 与本地官方模型字节，来源测试通过网络路由固定模型，不能推导远程模型站点的持续可用性。截图存于被忽略的 `apps/demo/test-results/standard-production/` 与 `standard-production-runtime/`，可由上述命令重新生成；390px 截图已检查无横向溢出。

## 保留的边界

### 补充复查：缓存身份碰撞

复查发现旧键直接拼接 `${modelId}/${version}/${variant}/${sha256}`，在模型 ID、版本或变体含斜杠时存在字段边界碰撞。例如 `modelId=x/y, version=z` 与 `modelId=x, version=y/z` 会共用旧键；即使模型字节相同，也会导致缓存容量和当前清理作用域错误。

本次增加 13 项回归，其中 9 项在修复前失败。新写入改用 `JSON.stringify(["v2", modelId, version, variant, sha256])`，对所有字段保留结构边界，斜杠与百分号不会被混淆。该格式与以 SHA-256 结尾的旧路径键分离。旧键读取必须同时验证缓存条目的键、模型 ID、版本、变体、SHA-256、字节数与实际内容；发生碰撞时保留另一模型的旧条目，为当前模型写入独立新键。

回归覆盖普通旧键、斜杠/百分号旧键复用，模型 ID/版本和版本/变体边界碰撞，百分号与斜杠区分，六种身份字段篡改，以及当前缓存容量与清理后的其他模型保留。`ModelManager` 测试 22 项通过；根 `pnpm verify` 49 项单元测试通过，lint、类型检查、SDK/Demo 生产构建与标准检查均通过。

缓存键修复后的生产 Demo 使用 `playwright.production.config.ts` 验证，8 项通过、4 项 WebGPU 环境跳过，包含真实 WASM 推理、缓存清理错误和 IndexedDB 禁用后的内存降级。输出目录为 `apps/demo/test-results/standard-cache-identity/`。SDK、模型版本和公开调用方式未变。

### 最终复查：并发清理与当前来源身份

- 新增两项并发回归，先复现清理 A 会阻止正在下载的 B 写缓存；修复后分别维护全局与模型身份代次，只有清理对应身份才阻止该模型的旧下载回填。
- Demo 不再固定使用编译时的本地模型身份。按当前来源读取并验证清单，切换时取消旧解析；加载成功后以 `detector.model` 更新身份。身份未知时禁用当前清理，保留 SDK 全清。
- 浏览器先复现来源切换后容量仍针对旧版本，再验证版本切换、迟到旧清单、当前清理保留另一版本。真实 WASM 推理用例还验证了清单预读与实际加载之间版本变化时，缓存清理跟随实际会话。
- 清单预读会增加同来源的请求次数，原换图竞态测试改为检查连续来源切换顺序，仍禁止返回旧来源。

主代理最终执行 `pnpm verify`：5 项 Node 校验、51 项单元测试、工作区类型检查、生产构建与包内模型校验通过；lint 与类型检查再次通过。最终完整 Demo 回归 32 项通过、4 项 WebGPU 环境跳过。最终生产浏览器回归 10 项通过、4 项 WebGPU 因无适配器跳过，证据保存在 `node_modules/.cache/standard-final-browser/`。示例独立验证使用公开 npm `0.1.2`，不把它记为未发布新 API 的 npm 验证。

### 适用范围

- WebGPU 仍为已有显式可选后端，本轮无头浏览器没有适配器，不新增 WebGPU 或任何 NPU 兼容性证据。
- `actualBackend` 表示成功创建的会话执行提供程序，不表示逐算子的 GPU 执行比例；SDK 没有静默换后端。
- 容量估计是去重模型数据字节数，不是 origin 配额或物理内存/磁盘占用。当前/全部清理不会释放已经加载的推理会话。
- 清理与防回填的同步边界是同一 SDK 模块和 JavaScript 上下文；其他标签页或独立 SDK 副本的并发加载需由宿主协调。
- 自定义 Worker 文件需要与 SDK 构建匹配，Worker 无法回传新协议的运行信息时会明确失败。
- 旧 `clearModelCache()` 仍清空本 SDK 全部模型缓存；旧 `downloadMs`、`backend` 字段继续保留。历史报告未覆盖，未提交或修改远程 GitHub 状态。
