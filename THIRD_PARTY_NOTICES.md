# Third-Party Notices

The checked-in `models/v1.0.0/inference.onnx` file is the official ONNX export
from PaddlePaddle's `PP-LCNet_x1_0_doc_ori_onnx` repository.

- Source: https://huggingface.co/PaddlePaddle/PP-LCNet_x1_0_doc_ori_onnx
- Upstream revision: `7330ab7039123e46af2dc03154b9969aa412c61d`
- License: Apache License 2.0

The SDK uses ONNX Runtime Web, distributed under the MIT License, as an npm
runtime dependency.

## PaddleOCR orientation sample

The Demo includes `apps/demo/public/samples/orientation-180.jpg`, copied from
the official PaddleOCR document-image orientation classification example:

- Source: <https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/img_rot180_demo.jpg>
- PaddleOCR documentation commit: `2661c7c0ef5c613e8f93c6e93b2e052399f0f854`
- License: Apache License 2.0, as stated by the PaddleOCR repository
- SHA-256: `c5a77e031470e13878ff4f28a06ca843fd455d95c20b1b49b486681e346209ed`

The `orientation-0.jpg`, `orientation-90.jpg`, and `orientation-270.jpg`
files are deterministic pixel rotations derived from that official source
image. They are provided to exercise the model's four orientation classes and
are not separate official PaddleOCR samples. Their hashes are recorded in
`apps/demo/src/samples.json`.
