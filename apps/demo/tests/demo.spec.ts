import { test, expect } from "playwright/test";

const pixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("demo exposes backend, image and result controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("PP-LCNet");
  await expect(page.locator("#backend")).toHaveValue("wasm");
  await expect(page.locator("#file")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Model" })).toBeVisible();
});

test("demo separates model load timings from inference timings", async ({ page }) => {
  await page.goto("/");
  await page.locator("#file").setInputFiles({
    name: "orientation.png",
    mimeType: "image/png",
    buffer: Buffer.from(pixelPng, "base64"),
  });
  await page.getByRole("button", { name: "Load model and detect" }).click();
  await expect(page.getByRole("status")).toContainText("Detection complete", {
    timeout: 30_000,
  });
  await expect(page.locator("#timing")).toContainText("Manifest");
  await expect(page.locator("#timing")).toContainText("Load total");
  await expect(page.locator("#timing")).toContainText("Total");
});
