import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = process.argv[2] ?? "v1.0.0";
const dir = resolve(root, "models", version);
const manifest = JSON.parse(
  await readFile(resolve(dir, "manifest.json"), "utf8"),
);
const data = await readFile(resolve(dir, "inference.onnx"));
const digest = createHash("sha256").update(data).digest("hex");
if (
  data.byteLength !== manifest.variant.bytes ||
  digest !== manifest.variant.sha256
) {
  throw new Error(
    `model integrity mismatch: bytes=${data.byteLength} sha256=${digest}`,
  );
}
console.log(
  `verified ${version}/inference.onnx (${data.byteLength} bytes, sha256 ${digest})`,
);
