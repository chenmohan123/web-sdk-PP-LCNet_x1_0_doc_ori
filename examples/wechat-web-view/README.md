# 微信 H5 / web-view 示例

这个示例适用于公众号 H5 和微信小程序 `web-view` 页面。模型和运行时资源需要 HTTPS 与 CORS；默认使用 `backend: "wasm"`，支持 WebGPU 时可以由用户显式改为 `backend: "webgpu"`。

微信原生小程序页面不支持直接运行 ONNX Runtime Web，请使用 H5 或 `web-view` 承载页面。在线 Demo：[PP-LCNet orientation](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/)。

Native mini-program pages are unsupported; use an H5 or `web-view` page.
