import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const root = resolve(import.meta.dirname, "..");
const version = process.argv[2] ?? "v1.0.0";
const modelPath = resolve(root, "models", version, "inference.onnx");
const manifestPath = resolve(root, "models", version, "manifest.json");
const data = await readFile(modelPath);
const sha256 = createHash("sha256").update(data).digest("hex");
const inspect = promisify(execFile);
const inspectScript = resolve(root, "scripts", "inspect-onnx.py");
let metadata;
let inspectError;
for (const command of process.platform === "win32" ? ["python", "py"] : ["python3", "python"]) {
  try {
    const result = await inspect(command, [inspectScript, modelPath], { maxBuffer: 1024 * 1024 });
    metadata = JSON.parse(result.stdout);
    break;
  } catch (error) {
    inspectError = error;
  }
}
if (metadata === undefined) throw new Error(`Unable to inspect ONNX graph: ${String(inspectError)}`);

const manifest = {
  schemaVersion: 1,
  model: {
    id: "PP-LCNet_x1_0_doc_ori",
    version: version.replace(/^v/, ""),
    architecture: "PP-LCNet_x1_0",
    modelType: "doc_img_orientation_classification",
    parameterCount: metadata.parameterCount
  },
  input: metadata.input,
  output: metadata.output,
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
    opset: metadata.opset,
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
