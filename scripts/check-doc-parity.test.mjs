import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("public API documentation covers provider and EXIF contracts", async () => {
  const readme = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );
  const api = await readFile(
    new URL("../docs/en/api.md", import.meta.url),
    "utf8",
  );
  const exif = await readFile(
    new URL("../docs/en/exif.md", import.meta.url),
    "utf8",
  );
  assert.match(readme, /backend: "wasm"/);
  assert.match(readme, /backend: "webgpu"/);
  assert.match(api, /detectBatch/);
  assert.match(api, /rotate/);
  assert.match(exif, /Orientation 1-8/);
});
