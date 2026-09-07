import { expect, test } from "playwright/test";
import { readFileSync } from "node:fs";
import type { ModelManifest } from "web-sdk-pp-lcnet-x1-0-doc-ori";

const manifest = JSON.parse(
  readFileSync(
    new URL("../../../models/manifest.json", import.meta.url),
    "utf8",
  ),
) as ModelManifest;

test("当前缓存身份随来源清单版本切换，迟到旧清单不能覆盖新来源", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "https://modelscope.cn/**/manifest.json?*",
    async (route) => {
      await gate;
      await route.fulfill({ json: manifest });
    },
  );
  await page.route("https://huggingface.co/**/manifest.json?*", (route) =>
    route.fulfill({
      json: { ...manifest, model: { ...manifest.model, version: "2.0.0" } },
    }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("pp-lcnet-doc-orientation", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("models", { keyPath: "key" });
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve) => {
      const transaction = database.transaction("models", "readwrite");
      for (const [version, bytes] of [
        ["1.0.0", 4],
        ["2.0.0", 16],
      ] as const) {
        transaction.objectStore("models").put({
          key: version,
          data: new ArrayBuffer(bytes),
          entry: {
            key: version,
            modelId: "PP-LCNet_x1_0_doc_ori",
            version,
            variant: "fp32",
            sha256: "test",
            bytes,
          },
        });
      }
      transaction.oncomplete = () => resolve();
    });
    database.close();
  });
  await page.locator("#model-source").selectOption("huggingface");
  release();
  await expect(page.locator("[data-sdk-cache-usage]")).toContainText("16 B");
  await page.locator('[data-sdk-cache-clear="current"]').click();
  await expect(page.locator("[data-sdk-cache-usage]")).toContainText("0 B");
  await page.locator("#model-source").selectOption("modelscope");
  await expect(page.locator("[data-sdk-cache-usage]")).toContainText("4 B");
});

test("当前模型缓存计量与清理保留其他版本、其他 SDK 数据", async ({ page }) => {
  await page.route("https://modelscope.cn/**/manifest.json?*", (route) =>
    route.fulfill({ json: manifest }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pp-lcnet-doc-orientation", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("models", { keyPath: "key" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("数据库打开失败"));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("models", "readwrite");
      const store = transaction.objectStore("models");
      for (const [key, version, bytes] of [
        ["a", "1.0.0", 4],
        ["b", "1.0.0", 8],
        ["c", "2.0.0", 16],
      ] as const) {
        store.put({
          key,
          data: new ArrayBuffer(bytes),
          entry: {
            key,
            modelId: "PP-LCNet_x1_0_doc_ori",
            version,
            variant: key,
            sha256: "test",
            bytes,
          },
        });
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("缓存写入失败"));
    });
    database.close();
    const cache = await caches.open("other-sdk");
    await cache.put("/unrelated", new Response("保留"));
  });
  await page.reload();
  await expect(page.locator("[data-sdk-cache-usage]")).toContainText("12 B");
  await page.evaluate(() => {
    IDBObjectStore.prototype.delete = () => {
      throw new Error("清理受阻");
    };
  });
  await page.locator('[data-sdk-cache-clear="current"]').click();
  await expect(page.locator("#cache-status")).toContainText("清理受阻");
  await expect(page.locator('[data-sdk-cache-clear="current"]')).toBeEnabled();
  await page.reload();
  await page.locator('[data-sdk-cache-clear="current"]').click();
  await expect(page.locator("[data-sdk-cache-usage]")).toContainText("0 B");
  const remaining = async () =>
    page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("pp-lcnet-doc-orientation", 1);
        request.onsuccess = () => resolve(request.result);
      });
      const entries = await new Promise<unknown[]>((resolve) => {
        const request = database
          .transaction("models")
          .objectStore("models")
          .getAll();
        request.onsuccess = () => resolve(request.result);
      });
      database.close();
      return entries;
    });
  expect(await remaining()).toHaveLength(1);
  await page.locator('[data-sdk-cache-clear="all"]').click();
  await expect(page.locator("#cache-status")).toContainText("清理完成");
  expect(await remaining()).toHaveLength(0);
  expect(await page.evaluate(() => caches.has("other-sdk"))).toBe(true);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator('[data-sdk-cache-clear="current"]')).toHaveText(
    "Clear current model cache",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("加载时禁用缓存清理，加载失败后恢复操作", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "https://modelscope.cn/**/manifest.json?*",
    async (route) => {
      await gate;
      await route.fulfill({ status: 500, body: "失败" });
    },
  );
  await page.goto("/");
  await page.locator('[data-sample-id="orientation-90"]').click();
  await page.getByRole("button", { name: "加载模型并检测" }).click();
  await expect(page.locator('[data-sdk-cache-clear="current"]')).toBeDisabled();
  await expect(page.locator('[data-sdk-cache-clear="all"]')).toBeDisabled();
  release();
  await expect(page.getByRole("status")).toContainText("MODEL_DOWNLOAD_FAILED");
  // 清单没有成功解析时，当前身份未知；仍可清空本 SDK 全部缓存。
  await expect(page.locator('[data-sdk-cache-clear="current"]')).toBeDisabled();
  await expect(page.locator('[data-sdk-cache-clear="all"]')).toBeEnabled();
});
