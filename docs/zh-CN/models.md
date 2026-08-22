# 模型

仓库内 `models/v1.0.0` 保存官方 ONNX 文件和严格 manifest，构建 SDK 时会复制到 npm 包的 `dist/models`，默认优先使用包内文件；打包器无法暴露静态资源时回退到 GitHub Pages。manifest 包含输入输出契约、预处理、参数量、大小和 SHA-256。
