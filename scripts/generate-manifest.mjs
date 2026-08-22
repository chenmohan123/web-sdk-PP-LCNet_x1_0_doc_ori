import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = process.argv[2] ?? "v1.0.0";
const modelPath = resolve(root, "models", version, "inference.onnx");
const manifestPath = resolve(root, "models", version, "manifest.json");
const data = await readFile(modelPath);
const sha256 = createHash("sha256").update(data).digest("hex");

const manifest = {
  schemaVersion: 1,
  model: {
    id: "PP-LCNet_x1_0_doc_ori",
    version: version.replace(/^v/, ""),
    architecture: "PP-LCNet_x1_0",
    modelType: "doc_img_orientation_classification",
    parameterCount: 1687613
  },
  input: { name: "x", dtype: "float32", shape: ["batch", 3, 224, 224] },
  output: { name: "fetch_name_0", dtype: "float32", shape: ["batch", 4] },
  labels: ["0", "90", "180", "270"],
  maxBatchSize: 8,
  preprocessing: {
    resizeShort: 256,
    cropSize: 224,
    rescaleFactor: 1 / 255,
    imageMean: [0.485, 0.456, 0.406],
    imageStd: [0.229, 0.224, 0.225]
  },
  variant: {
    id: "official-fp32",
    bytes: data.byteLength,
    opset: 7,
    sha256,
    url: `./inference.onnx`
  },
  source: {
    name: "PaddlePaddle/PP-LCNet_x1_0_doc_ori_onnx",
    url: "https://huggingface.co/PaddlePaddle/PP-LCNet_x1_0_doc_ori_onnx",
    license: "Apache-2.0",
    files: { model: "inference.onnx" }
  }
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${manifestPath}`);
