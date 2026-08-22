# Models

[中文](../zh-CN/models.md)

`models/v1.0.0` contains the official ONNX file and strict manifest. The SDK build copies these assets to `dist/models` and uses the package copy first, falling back to GitHub Pages when a bundler cannot expose package assets. The manifest declares model input/output contracts, preprocessing, parameter count, byte size, and SHA-256.
