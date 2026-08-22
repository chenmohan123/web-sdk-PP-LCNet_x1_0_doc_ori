import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("React example is a real SDK consumer", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../react/package.json", import.meta.url), "utf8"),
  );
  const app = await readFile(
    new URL("../react/src/App.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(packageJson.scripts.build, "tsc --noEmit && vite build");
  assert.equal(
    packageJson.dependencies["web-sdk-pp-lcnet-x1-0-doc-ori"],
    "file:../../packages/sdk",
  );
  assert.match(app, /useState<Backend>\("wasm"\)/);
  assert.match(app, /value="webgpu"/);
  assert.match(app, /\.detect\(/);
  assert.match(app, /rotate\(/);
  assert.match(app, /loadTimings/);
  assert.match(app, /dispose\(/);
});
