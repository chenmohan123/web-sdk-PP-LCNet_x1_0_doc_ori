# 自定义模型

通过 `model` 传入 manifest URL、manifest 对象，或 `{ manifest, data }` 内存模型。`data` 为 ONNX `ArrayBuffer`，SDK 会先校验 SHA-256，再创建 Session。SDK 会校验输入输出、标签、预处理、URL、文件大小和 SHA-256；只传 ONNX URL 不被接受。
