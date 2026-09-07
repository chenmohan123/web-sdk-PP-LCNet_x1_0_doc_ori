import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Vanilla 示例具有独立安装和构建入口，并只依赖公开 SDK", async () => {
  const root = new URL("../examples/vanilla-vite/", import.meta.url);
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const sdk = JSON.parse(
    await readFile(
      new URL("../packages/sdk/package.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(pkg.dependencies[sdk.name], sdk.version);
  assert.equal(pkg.scripts.dev, "vite");
  assert.match(pkg.scripts.build, /tsc.*vite build/);
  assert.match(
    await readFile(new URL("index.html", root), "utf8"),
    /src\/main\.ts/,
  );
  const source = await readFile(new URL("src/main.ts", root), "utf8");
  assert.match(source, /createDocOrientation/);
  assert.match(source, /AbortController/);
  assert.match(source, /onProgress/);
  assert.match(source, /finally[\s\S]*dispose/);
  assert.doesNotMatch(source, /packages\/sdk|workspace:/);
});
