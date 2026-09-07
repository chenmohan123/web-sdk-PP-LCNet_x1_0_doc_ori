import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("发布元数据具有公开权限、Apache-2.0 许可和当前版本日志", async () => {
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
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  const manifest = await readFile(new URL("../sdk-manifest.yaml", import.meta.url), "utf8");
  const packageBlock = /^package:\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)+)/m.exec(manifest)?.[1];
  assert.equal(/^  version:\s*(\S+)\s*$/m.exec(packageBlock ?? "")?.[1], packageJson.version);
  assert.equal(
    packageJson.homepage,
    "https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/",
  );
  assert.match(license, /Apache License/);
  assert.match(changelog, new RegExp(`^## ${packageJson.version.replaceAll(".", "\\.")} - \\d{4}-\\d{2}-\\d{2}`, "m"));
});

test("集成示例记录运行范围", async () => {
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
