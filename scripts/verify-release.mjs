import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("release metadata is public and Apache-2.0 licensed", async () => {
  const packageJson = JSON.parse(
    await readFile(
      new URL("../packages/sdk/package.json", import.meta.url),
      "utf8",
    ),
  );
  const license = await readFile(
    new URL("../LICENSE", import.meta.url),
    "utf8",
  );
  const changelog = await readFile(
    new URL("../CHANGELOG.md", import.meta.url),
    "utf8",
  );
  assert.equal(packageJson.publishConfig.access, "public");
  assert.equal(packageJson.version, "0.1.2");
  assert.equal(
    packageJson.homepage,
    "https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/",
  );
  assert.match(license, /Apache License/);
  assert.match(changelog, /## 0\.1\.1/);
});

test("integration examples document their execution surface", async () => {
  const paths = ["cdn", "vite", "react", "wechat-web-view"];
  for (const name of paths) {
    const readme = await readFile(
      new URL(`../examples/${name}/README.md`, import.meta.url),
      "utf8",
    );
    assert.match(
      readme,
      /https:\/\/chenmohan123\.github\.io\/web-sdk-PP-LCNet_x1_0_doc_ori/,
    );
    assert.match(readme, /wasm/);
    assert.match(readme, /webgpu/);
  }
  const wechat = await readFile(
    new URL("../examples/wechat-web-view/README.md", import.meta.url),
    "utf8",
  );
  assert.match(wechat, /H5|web-view/);
  assert.match(wechat, /native mini-program/i);
});
