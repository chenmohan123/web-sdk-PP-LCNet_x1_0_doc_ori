import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = resolve(root, "apps/demo/src/samples.json");
const sampleDir = resolve(root, "apps/demo/public/samples");

test("orientation sample manifest covers all four angles with verified files", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.length, 4);
  assert.deepEqual(
    manifest.map((sample) => sample.expectedOrientation).sort((a, b) => a - b),
    [0, 90, 180, 270],
  );
  assert.equal(new Set(manifest.map((sample) => sample.filename)).size, 4);
  assert.equal(manifest.find((sample) => sample.expectedOrientation === 180).kind, "official");
  assert.equal(
    manifest.filter((sample) => sample.kind === "derived").length,
    3,
  );

  for (const sample of manifest) {
    const bytes = await readFile(resolve(sampleDir, sample.filename));
    assert.ok(bytes.byteLength > 0, `${sample.filename} is empty`);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash, sample.sha256, `${sample.filename} hash mismatch`);
  }
});
