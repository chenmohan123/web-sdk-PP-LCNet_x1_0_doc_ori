# API

[English](../en/api.md)

`createDocOrientation({ backend: "wasm" | "webgpu" })` 创建检测器；`detect()` 返回方向、纠正角度、置信度、概率、模型信息和分阶段耗时；`detectBatch()` 保持输入顺序。`detector.loadTimings` 区分 manifest、模型下载/缓存、Session 创建和初始化总耗时。`rotate()` 返回纠正后的 Blob。

`detector.runtime` 与每个结果的 `runtime` 来自已成功创建的实际执行会话，包含 `requestedBackend`、`actualBackend`、`execution`（`main` 或 `worker`）、`runtimeVersion`、`executionProvider`，WASM 还报告实际配置的线程数。旧 `backend` 字段继续保留。SDK 只为会话配置显式选择的单一执行提供程序，失败即报错；`actualBackend` 表示会话提供程序，不声称每个算子都运行在 GPU。Worker 的运行信息来自 Worker 内的会话；自定义 `workerUrl` 必须与 SDK 使用相同版本。

```ts
import {
  clearCurrentModelCache,
  clearAllModelCache,
  estimateModelCache,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";

const scope = { modelId: "PP-LCNet_x1_0_doc_ori", version: "1.0.0" };
const current = await estimateModelCache(scope);
console.log(current.bytes, current.entries);
await clearCurrentModelCache(scope);
await clearAllModelCache();
```

缓存作用域是本 SDK 的 `pp-lcnet-doc-orientation/models` IndexedDB 存储及当前 JavaScript 上下文中的共享内存降级缓存。当前清理按模型 ID 与版本精确匹配，包含其全部精度和校验和；全部清理仅删除本 SDK 模型缓存，不操作其他数据库、Cache Storage 或 origin 数据。`estimateModelCache(scope?)` 返回去重后的模型字节数、条目数与作用域；省略参数统计本 SDK 全部模型。它是缓存模型数据量，不是浏览器整个 origin 的配额或物理占用。

新写入使用带格式版本 `v2` 的 JSON 元组键，独立保存模型 ID、版本、变体与校验和，斜杠和百分号不会改变字段边界。仍可读取旧路径键，但必须同时匹配条目中的键、模型 ID、版本、变体、SHA-256 和字节数，并再次校验内容。碰撞旧键中的另一模型不会被命中或覆盖；新模型写入独立键。

检测器提供无参 `clearCurrentModelCache()`（使用自身模型）、`clearAllModelCache()` 和 `estimateModelCache(scope?)`。原有 `clearModelCache()` 仍清空本 SDK 全部模型，`listModelCache()` 仍列出全部模型。无需先下载模型即可调用顶层缓存 API。清理不会释放已创建会话；若还需释放推理资源，调用 `dispose()`。同一模块上下文内，清理会阻止此前开始的下载在完成后回填缓存；其他标签页和独立 SDK 副本需由宿主协调。

加载与推理接受 `AbortSignal`；缓存读取、校验以及会话创建完成后均检查取消，已取消的加载不会返回可用检测器。初始化阶段的底层会话创建可能无法立即中断，但随后会释放会话。加载进度增加 `cache` 与 `integrity` 阶段。
