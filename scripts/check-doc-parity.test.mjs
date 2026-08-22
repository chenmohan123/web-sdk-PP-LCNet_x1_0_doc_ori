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
  const packageReadme = await readFile(
    new URL("../packages/sdk/README.md", import.meta.url),
    "utf8",
  );
  const englishReadme = await readFile(
    new URL("../README.en.md", import.meta.url),
    "utf8",
  );
  const notices = await readFile(
    new URL("../THIRD_PARTY_NOTICES.md", import.meta.url),
    "utf8",
  );
  assert.match(readme, /backend: "wasm"/);
  assert.match(readme, /backend: "webgpu"/);
  assert.match(readme, /manifest, data/);
  assert.match(
    readme,
    /chenmohan123\.github\.io\/web-sdk-PP-LCNet_x1_0_doc_ori/,
  );
  assert.match(readme, /README\.en\.md/);
  assert.match(readme, /React/);
  assert.match(readme, /web-view/);
  assert.match(readme, /不支持在原生小程序页面直接运行 ONNX Runtime Web/);
  assert.match(
    englishReadme,
    /native mini-program pages cannot run ONNX Runtime Web/i,
  );
  assert.match(packageReadme, /在线 Demo/);
  assert.match(packageReadme, /## English/);
  assert.match(readme, /示例图片/);
  assert.match(englishReadme, /Sample images/i);
  assert.match(notices, /img_rot180_demo\.jpg/);
  assert.match(notices, /Apache License 2\.0/);
  assert.match(api, /detectBatch/);
  assert.match(api, /rotate/);
  assert.match(api, /loadTimings/);
  assert.match(exif, /Orientation 1-8/);
});

test("Chinese and English docs are paired and cross-linked", async () => {
  const pairs = [
    "quick-start",
    "api",
    "models",
    "custom-models",
    "exif",
    "compatibility",
    "performance",
    "troubleshooting",
  ];
  for (const name of pairs) {
    const zh = await readFile(
      new URL(`../docs/zh-CN/${name}.md`, import.meta.url),
      "utf8",
    );
    const en = await readFile(
      new URL(`../docs/en/${name}.md`, import.meta.url),
      "utf8",
    );
    assert.match(zh, new RegExp(`\\.\\./en/${name}\\.md`));
    assert.match(en, new RegExp(`\\.\\./zh-CN/${name}\\.md`));
  }
});
