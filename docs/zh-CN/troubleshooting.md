# 故障排查

[English](../en/troubleshooting.md)

WebGPU 不可用时请改用 `backend: "wasm"`。模型下载失败通常是 HTTPS/CORS 或 GitHub Pages URL 配置问题。自定义模型报 manifest 错误时检查输入输出名称、形状、标签和 SHA-256。
