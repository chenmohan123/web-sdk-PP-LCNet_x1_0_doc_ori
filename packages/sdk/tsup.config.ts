import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
    "browser-global": "src/browser-global.ts",
    "inference.worker": "src/worker/inference.worker.ts",
  },
  format: ["esm", "iife"],
  globalName: "PPDocOrientation",
  outDir: "dist",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  external: ["onnxruntime-web", "onnxruntime-web/webgpu"],
});
