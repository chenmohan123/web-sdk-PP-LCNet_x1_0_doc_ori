import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("official model manifest matches the checked-in ONNX asset", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(root, "models/manifest.json"), "utf8"),
  );
  const modelPath = resolve(root, "models/inference.onnx");
  const modelStat = await stat(modelPath);

  assert.equal(manifest.model.id, "PP-LCNet_x1_0_doc_ori");
  assert.deepEqual(manifest.labels, ["0", "90", "180", "270"]);
  assert.deepEqual(manifest.input.shape, ["batch", 3, 224, 224]);
  assert.deepEqual(manifest.output.shape, ["batch", 4]);
  assert.deepEqual(manifest.input.shape.slice(-2), [224, 224]);
  assert.equal(manifest.maxBatchSize, 8);
  assert.match(manifest.variant.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.variant.bytes, modelStat.size);
});
