# CDN 示例

无需打包器，直接在 H5 页面使用 browser-global 构建，默认配置为 `backend: "wasm"`（WASM/CPU），也可以在支持 HTTPS/WebGPU 的浏览器中改为 `backend: "webgpu"`。

```html
<script src="https://unpkg.com/web-sdk-pp-lcnet-x1-0-doc-ori/dist/browser-global.global.js"></script>
```

直接打开 `index.html` 或将其部署到 HTTPS 静态站点。在线 Demo：[PP-LCNet orientation](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/)。
