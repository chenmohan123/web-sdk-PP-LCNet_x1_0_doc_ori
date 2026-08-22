# API

`createDocOrientation({ backend: "wasm" | "webgpu" })` 创建检测器；`detect()` 返回方向、纠正角度、置信度、概率、模型信息和分阶段耗时；`detectBatch()` 保持输入顺序。`rotate()` 返回纠正后的 Blob。
