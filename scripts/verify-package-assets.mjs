import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "models", "v1.0.0", "inference.onnx");
const packaged = resolve(
  root,
  "packages",
  "sdk",
  "dist",
  "models",
  "v1.0.0",
  "inference.onnx",
);
const [sourceBytes, packagedBytes] = await Promise.all([
  readFile(source),
  readFile(packaged),
]);
const sourceDigest = createHash("sha256").update(sourceBytes).digest("hex");
const packagedDigest = createHash("sha256").update(packagedBytes).digest("hex");
if (
  sourceBytes.byteLength !== packagedBytes.byteLength ||
  sourceDigest !== packagedDigest
) {
  throw new Error(
    `packaged model mismatch: source=${sourceBytes.byteLength}/${sourceDigest} packaged=${packagedBytes.byteLength}/${packagedDigest}`,
  );
}
console.log(
  `verified npm model asset (${packagedBytes.byteLength} bytes, sha256 ${packagedDigest})`,
);
