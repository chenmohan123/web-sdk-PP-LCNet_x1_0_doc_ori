import { test, expect } from "playwright/test";
test("demo exposes backend, image and result controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("PP-LCNet");
  await expect(page.locator("#backend")).toHaveValue("wasm");
  await expect(page.locator("#file")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Model" })).toBeVisible();
});
