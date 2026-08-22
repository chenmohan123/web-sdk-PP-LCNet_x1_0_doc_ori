import { defineConfig } from "tsup";

export default defineConfig({ clean: true, dts: true, entry: { index: "src/index.ts" }, format: ["esm"], outDir: "dist", platform: "browser", target: "es2022", sourcemap: true });
