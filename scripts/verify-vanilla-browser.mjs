import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const exampleRoot = process.argv[2];
assert.ok(exampleRoot, "必须通过 pnpm examples:verify 指定临时消费者目录");
const require = createRequire(join(exampleRoot, "package.json"));
const installed = require("web-sdk-pp-lcnet-x1-0-doc-ori/package.json");
const sdk = JSON.parse(readFileSync(join(root, "packages/sdk/package.json"), "utf8"));
assert.equal(installed.version, sdk.version, "消费者必须使用当前打包版本");
const sdkRequire = createRequire(
  require.resolve("web-sdk-pp-lcnet-x1-0-doc-ori"),
);
const ortDirectory = dirname(sdkRequire.resolve("onnxruntime-web"));
const manifest = JSON.parse(
  readFileSync(join(root, "models/manifest.json"), "utf8"),
);
const model = readFileSync(join(root, "models/inference.onnx"));
const server = await preview({
  root: exampleRoot,
  preview: { host: "127.0.0.1", port: 4298, strictPort: true },
});
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // 保留完整 SDK/WASM 推理，固定模型传输以避免外部网络影响回归。
  await page.route("**/manifest.json*", (route) =>
    route.fulfill({ json: manifest }),
  );
  await page.route("**/inference.onnx*", (route) =>
    route.fulfill({ body: model, contentType: "application/octet-stream" }),
  );
  await page.route(
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/**",
    (route) => {
      const filename = new URL(route.request().url()).pathname
        .split("/")
        .at(-1);
      assert.match(filename, /^ort-[\w.-]+\.(mjs|wasm)$/);
      return route.fulfill({
        body: readFileSync(join(ortDirectory, filename)),
        contentType: filename.endsWith(".wasm")
          ? "application/wasm"
          : "text/javascript",
      });
    },
  );
  await page.goto("http://127.0.0.1:4298/");
  await page
    .locator("#image")
    .setInputFiles(join(root, "apps/demo/public/samples/orientation-90.jpg"));
  await page.locator("#detect").click();
  await page.waitForFunction(
    () => /检测完成|失败/.test(document.querySelector("#status").textContent),
    null,
    { timeout: 30000 },
  );
  assert.equal(await page.locator("#status").innerText(), "检测完成");
  const result = JSON.parse(await page.locator("#output").innerText());
  assert.equal(result.orientation, 90);
  assert.equal(result.runtime.requestedBackend, "wasm");
  assert.equal(result.runtime.actualBackend, "wasm");
  assert.equal(typeof result.loadTimings.modelDownloadMs, "number");
  assert.equal(typeof result.loadTimings.modelCacheReadMs, "number");
  assert.equal(typeof result.loadTimings.integrityMs, "number");
  assert.deepEqual(errors, []);
  const evidenceDirectory = join(root, "node_modules/.cache/vanilla-review");
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({
    path: join(evidenceDirectory, "success.png"),
    fullPage: true,
  });

  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.unroute("**/manifest.json*");
  await page.route("**/manifest.json*", async (route) => {
    await gate;
    await route.fulfill({ status: 500 });
  });
  await page.locator("#detect").click();
  await page.locator("#cancel").click();
  release();
  await page.waitForFunction(
    () => document.querySelector("#status").textContent === "已取消",
  );
  assert.equal(await page.locator("#detect").isEnabled(), true);
  await page.unroute("**/manifest.json*");
  await page.route("**/manifest.json*", (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.locator("#detect").click();
  await page.waitForFunction(
    () => document.querySelector("#status").textContent === "检测失败",
  );
  assert.match(
    await page.locator("#output").innerText(),
    /^MODEL_DOWNLOAD_FAILED: /,
  );
  assert.equal(await page.locator("#detect").isEnabled(), true);
  assert.deepEqual(errors, []);
  await page.unroute("**/manifest.json*");
  await page.route("**/manifest.json*", (route) => route.fulfill({ json: manifest }));
  await page.locator("#detect").click();
  await page.waitForFunction(
    () => document.querySelector("#status").textContent === "检测完成",
    null,
    { timeout: 30000 },
  );
  const recovered = JSON.parse(await page.locator("#output").innerText());
  assert.equal(recovered.orientation, 90);
  assert.equal(recovered.runtime.actualBackend, "wasm");
  assert.deepEqual(errors, []);
  console.log(`Vanilla 当前 SDK ${installed.version} 真实 90 度推理、取消与失败后再次推理通过`);
} finally {
  await browser?.close();
  await server.close();
}
