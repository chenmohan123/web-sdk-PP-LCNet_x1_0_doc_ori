import { describe, expect, it, vi } from "vitest";
import { createOrtSession } from "../src/runtime/ort-session";
import type { ModelManifest } from "../src/types";

describe("createOrtSession", () => {
  it.each(["wasm", "webgpu"] as const)("%s 使用固定版本的默认 WASM 资源地址", async (backend) => {
    const create = vi.fn(() => Promise.resolve({
      run: vi.fn(),
      release: vi.fn(() => Promise.resolve()),
    }));
    const ort = {
      env: { wasm: {} },
      Tensor: class {
        constructor() {}
        dispose() {}
      },
      InferenceSession: { create },
    } as never;

    await createOrtSession({
      backend,
      capabilities: {
        wasm: true,
        wasmSimd: true,
        wasmThreads: false,
        webgpu: false,
        worker: false,
        offscreenCanvas: false,
      },
      manifest: {} as ModelManifest,
      modelBytes: new ArrayBuffer(4),
      ort,
    });

    expect((ort as { env: { wasm: { wasmPaths?: string } } }).env.wasm.wasmPaths).toBe(
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/",
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.any(Uint8Array), expect.objectContaining({
      executionProviders: backend === "webgpu"
        ? [{ name: "webgpu", preferredLayout: "NCHW" }]
        : ["wasm"],
    }));
  });

  it.each([
    "https://example.com/demo/ort/",
    { wasm: new URL("https://example.com/demo/ort/runtime.wasm"), mjs: "https://example.com/demo/ort/runtime.mjs" },
  ])("WebGPU 在创建会话前应用自定义 WASM 资源地址 %j", async (paths) => {
    const ort = {
      env: { wasm: { wasmPaths: undefined as unknown } },
      Tensor: class {
        readonly data = new Float32Array();
        readonly dims = [];
        dispose() {}
      },
      InferenceSession: {
        create: vi.fn(() => {
          expect(ort.env.wasm.wasmPaths).toBe(paths);
          return Promise.resolve({ run: vi.fn(), release: vi.fn() });
        }),
      },
    };
    await createOrtSession({
      backend: "webgpu",
      capabilities: { wasm: true, wasmThreads: false, webgpu: true, worker: false, offscreenCanvas: false },
      manifest: {} as ModelManifest,
      modelBytes: new ArrayBuffer(4),
      wasm: { paths },
      ort: ort as never,
    });
    expect(ort.InferenceSession.create).toHaveBeenCalledTimes(1);
  });
});
