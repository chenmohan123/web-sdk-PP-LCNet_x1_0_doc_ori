import { readFileSync } from "node:fs";
import { expect, test, type Response } from "playwright/test";
import type { ModelManifest } from "web-sdk-pp-lcnet-x1-0-doc-ori";
import { selectionToModel } from "../src/model-sources";

const manifest = JSON.parse(readFileSync(new URL("../../../models/manifest.json", import.meta.url), "utf8")) as ModelManifest;
const modelBytes = readFileSync(new URL("../../../models/inference.onnx", import.meta.url));

for (const source of ["modelscope", "huggingface"] as const) {
  const manifestUrl = selectionToModel(source);
  if (manifestUrl === undefined) throw new Error("远程模型来源缺少清单地址");
  for (const backend of ["wasm", "webgpu"] as const) {
    test(`${source} 的 ${backend} 加载真实运行时并识别 90 度文档`, async ({ page }, testInfo) => {
      const modelUrl = new URL("inference.onnx", manifestUrl).href;
      // 使用仓库中的官方模型，保留 SDK、运行时和浏览器推理的完整执行链。
      await page.route(manifestUrl, (route) => route.fulfill({
        json: { ...manifest, variant: { ...manifest.variant, url: modelUrl } },
      }));
      await page.route(modelUrl, (route) => route.fulfill({
        body: modelBytes,
        contentType: "application/octet-stream",
      }));
      const wasmResponses: Response[] = [];
      const errors: string[] = [];
      page.on("response", (response) => {
        if (new URL(response.url()).pathname.endsWith(".wasm")) wasmResponses.push(response);
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("./");
      if (backend === "webgpu") {
        const adapter = await page.evaluate(async () => {
          const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ info: { vendor: string; isFallbackAdapter: boolean } } | null> } }).gpu;
          const adapter = await gpu?.requestAdapter();
          return adapter ? { vendor: adapter.info.vendor, fallback: adapter.info.isFallbackAdapter } : null;
        });
        test.skip(adapter === null, "当前浏览器未提供 WebGPU 适配器；硬件验证需使用支持 GPU 的浏览器运行");
        await testInfo.attach("GPU 适配器", { body: JSON.stringify(adapter), contentType: "application/json" });
      }
      await page.getByLabel("模型来源", { exact: true }).selectOption(source);
      await page.locator("#backend").selectOption(backend);
      await page.locator('[data-sample-id="orientation-90"]').click();
      await page.getByRole("button", { name: "加载模型并检测" }).click();
      await expect(page.getByRole("status")).toContainText("检测完成", { timeout: 30_000 });
      await expect(page.locator("#result dd").first()).toHaveText("90°");
      await expect(page.locator("#model")).toContainText(backend);
      await expect(page.locator("#corrected-preview img")).toBeVisible();
      expect(errors).toEqual([]);
      expect(wasmResponses.length).toBeGreaterThan(0);
      for (const response of wasmResponses) {
        expect(new URL(response.url()).pathname).toContain("/ort/");
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("application/wasm");
        // 大型文件可能被浏览器调试缓存淘汰，通过相同地址检查 WASM 文件头。
        const asset = await page.request.get(response.url());
        expect(asset.status()).toBe(200);
        expect([...(await asset.body()).subarray(0, 4)]).toEqual([0, 97, 115, 109]);
        await asset.dispose();
      }
      await page.screenshot({ path: testInfo.outputPath("检测完成.png"), fullPage: true });
    });
  }
}
