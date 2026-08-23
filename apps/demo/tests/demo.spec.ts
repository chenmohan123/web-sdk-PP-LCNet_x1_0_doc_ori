import { test, expect } from "playwright/test";

const pixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("demo starts in Chinese with backend, image and result controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("PP-LCNet");
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await expect(page.locator("#backend")).toHaveValue("wasm");
  await expect(page.locator("#file")).toBeHidden();
  await expect(page.getByRole("heading", { name: "模型" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "耗时" })).toBeVisible();
});

test("starts in Chinese and resets to Chinese after reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(
    page.getByRole("button", { name: "Choose image" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await expect(page.getByText("SDK v0.1.2")).toBeVisible();
});

test("uses a clean empty preview and one image action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori",
  );
  await expect(page.locator("[data-testid=sdk-version]")).toHaveText(
    "SDK v0.1.2",
  );
  await expect(page.locator("#file")).toBeHidden();
  await expect(page.getByRole("button", { name: "选择图片" })).toBeVisible();
  await expect(page.locator('img[src=""]')).toHaveCount(0);
  await expect(page.getByTestId("original-empty")).toBeVisible();
  await expect(page.getByTestId("corrected-empty")).toBeVisible();
});

test("shows four orientation sample documents below the previews and loads one", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#samples-section")).toHaveCount(1);
  await expect(page.locator("#samples-section")).toBeVisible();
  await expect(page.getByRole("heading", { name: "示例文档" })).toBeVisible();
  const sampleAfterPreviews = await page.evaluate(() => {
    const panel = document.querySelector(".result-panel");
    const images = panel?.querySelector(".images");
    const samples = panel?.querySelector("#samples-section");
    if (!panel || !images || !samples) return false;
    const imageWidth = images.getBoundingClientRect().width;
    const sampleWidth = samples.getBoundingClientRect().width;
    return (
      Array.from(panel.children).indexOf(samples) > Array.from(panel.children).indexOf(images) &&
      Math.abs(imageWidth - sampleWidth) < 1
    );
  });
  expect(sampleAfterPreviews).toBe(true);
  const samples = page.locator("[data-sample-id]");
  await expect(samples).toHaveCount(4);
  await expect(page.getByRole("button", { name: /官方倒置样例/ })).toBeVisible();
  await page.getByRole("button", { name: /官方倒置样例/ }).click();
  await expect(page.getByRole("button", { name: "加载模型并检测" })).toBeEnabled();
  await expect(page.getByRole("status")).toContainText("示例文档已准备好，可以检测。");
  await expect(page.locator("#original-preview img")).toHaveAttribute(
    "src",
    /blob:/,
  );
  await expect(page.getByText(/orientation-180\.jpg/)).toBeVisible();
  await expect(page.locator("#sample-attribution")).toHaveAttribute(
    "href",
    "https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/img_rot180_demo.jpg",
  );
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Sample documents" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Official upside-down sample/ }),
  ).toBeVisible();
});

test("keeps orientation samples inside the viewport on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("[data-sample-id]")).toHaveCount(4);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("demo separates model load timings from inference timings", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#file").setInputFiles({
    name: "orientation.png",
    mimeType: "image/png",
    buffer: Buffer.from(pixelPng, "base64"),
  });
  await page.getByRole("button", { name: "加载模型并检测" }).click();
  await expect(page.getByRole("status")).toContainText("检测完成", {
    timeout: 30_000,
  });
  await expect(page.locator("#timing")).toContainText("模型清单");
  await expect(page.locator("#timing")).toContainText("加载总计");
  await expect(page.locator("#timing")).toContainText("推理总计");
});

test("keeps the layout inside the viewport", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
