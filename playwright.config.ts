import { defineConfig } from "playwright/test";

export default defineConfig({ testDir: "./apps/demo/tests", use: { browserName: "chromium", headless: true }, workers: 1 });
