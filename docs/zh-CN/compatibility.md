# 兼容性

支持 PC、移动浏览器、公众号 H5 和微信小程序 `web-view`。不支持微信小程序原生页面直接运行 ONNX Runtime Web。模型和运行时资源需要 HTTPS 与 CORS。Blob/File 优先使用 `createImageBitmap`，不可用时会回退到 HTML Image + Canvas；仍应在目标微信 WebView 版本上实测。
