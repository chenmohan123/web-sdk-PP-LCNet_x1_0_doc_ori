# 模型

[English](../en/models.md)

仓库内 `models` 根目录保存当前唯一的官方 ONNX 文件和严格 manifest。模型由 Git LFS 管理，更新时直接替换根目录文件，不再按版本建立模型目录；构建 SDK 时会复制到 npm 包的 `dist/models`，默认优先使用包内文件，打包器无法暴露静态资源时回退到 GitHub Pages。manifest 包含输入输出契约、预处理、参数量、大小和 SHA-256。
