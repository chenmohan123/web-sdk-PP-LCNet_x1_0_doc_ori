# Troubleshooting

[中文](../zh-CN/troubleshooting.md)

If WebGPU is unavailable, explicitly use `backend: "wasm"`; the SDK does not silently switch providers. Model download failures usually indicate HTTPS/CORS or an incorrect GitHub Pages URL. For custom model manifest errors, check input/output names, shapes, labels, preprocessing, byte size, and SHA-256. Native WeChat mini-program pages are unsupported; use H5 or `web-view`.
