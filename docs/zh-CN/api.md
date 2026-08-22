# API

`createDocOrientation({ backend: "wasm" | "webgpu" })` 创建检测器；`detect()` 返回方向、纠正角度、置信度、概率、模型信息和分阶段耗时；`detectBatch()` 保持输入顺序。`detector.loadTimings` 区分 manifest、模型下载/缓存、Session 创建和初始化总耗时。`rotate()` 返回纠正后的 Blob。
