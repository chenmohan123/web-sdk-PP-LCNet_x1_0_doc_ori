import { readFileSync } from "node:fs";
import { expect, test } from "playwright/test";
import type { ModelManifest } from "web-sdk-pp-lcnet-x1-0-doc-ori";

test("换图不会撤销正在等待旧任务的模型来源切换", async ({ page }) => {
  test.setTimeout(60_000);
  const manifest = JSON.parse(
    readFileSync(
      new URL("../../../models/manifest.json", import.meta.url),
      "utf8",
    ),
  ) as ModelManifest;
  const modelBytes = readFileSync(
    new URL("../../../models/inference.onnx", import.meta.url),
  );
  const requestedSources: string[] = [];
  await page.route("**/manifest.json*", async (route) => {
    const url = new URL(route.request().url());
    requestedSources.push(url.hostname);
    await route.fulfill({
      json: {
        ...manifest,
        variant: {
          ...manifest.variant,
          url: new URL("inference.onnx", url).href,
        },
      },
    });
  });
  await page.route("**/inference.onnx", (route) =>
    route.fulfill({
      body: modelBytes,
      contentType: "application/octet-stream",
    }),
  );
  let release!: () => void;
  let wasmRequested!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const wasmRequest = new Promise<void>((resolve) => {
    wasmRequested = resolve;
  });
  await page.route("**/*.wasm", async (route) => {
    wasmRequested();
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/");
    const image = {
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    };
    await page.locator("#file").setInputFiles({ ...image, name: "first.png" });
    await page.locator("#run").click();
    await wasmRequest;
    await page.locator("#file").setInputFiles({ ...image, name: "second.png" });
    await page.locator("#model-source").selectOption("huggingface");
    await page.locator("#file").setInputFiles({ ...image, name: "last.png" });
    await expect(page.locator("#model-source")).toHaveValue("huggingface");
    await expect(page.locator("#model")).toContainText("Hugging Face");
    release();
    await page.locator("#run").click();
    await expect(page.getByRole("status")).toContainText("检测完成", {
      timeout: 30_000,
    });
    expect(requestedSources).toEqual(["modelscope.cn", "huggingface.co"]);
    await expect(page.locator("#selected-file")).toContainText("last.png");
    await expect(page.locator("#model")).toContainText("Hugging Face");
  } finally {
    release();
  }
});

test("加载中换图会取消旧任务并恢复控件", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://modelscope.cn/**/manifest.json*", async (route) => {
    await gate;
    await route.fulfill({ status: 500 });
  });
  await page.goto("/");
  const image = {
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  };
  await page.locator("#file").setInputFiles({ ...image, name: "first.png" });
  await page.locator("#run").click();
  await expect(page.getByRole("status")).toContainText("正在加载模型清单");
  await page.locator("#file").setInputFiles({ ...image, name: "last.png" });
  release();
  await page.waitForTimeout(500);
  await expect(page.getByRole("status")).toContainText(
    "图片已准备好，可以检测",
  );
  await expect(page.locator("#selected-file")).toContainText("last.png");
  await expect(page.locator("#model-source")).toBeEnabled();
  await expect(page.locator("#backend")).toBeEnabled();
  await expect(page.locator("#result dd")).toHaveText(["-", "-", "-"]);
});
