import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["cache-standard.spec.ts", "runtime-assets.spec.ts"],
  webServer: {
    command: "pnpm exec vite preview --host 127.0.0.1 --port 4184",
    port: 4184,
    reuseExistingServer: false,
  },
  use: { baseURL: "http://127.0.0.1:4184" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } },
  ],
});
