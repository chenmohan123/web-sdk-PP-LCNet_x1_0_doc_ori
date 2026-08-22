# Compatibility

[中文](../zh-CN/compatibility.md)

The SDK supports PC browsers, mobile browsers, WeChat Official Account H5, and WeChat mini-program `web-view` pages. Native mini-program pages cannot run ONNX Runtime Web directly. Model and runtime assets require HTTPS and CORS. Blob/File inputs prefer `createImageBitmap`; the SDK falls back to HTML Image + Canvas when available. Test the target WeChat WebView version before production rollout.
