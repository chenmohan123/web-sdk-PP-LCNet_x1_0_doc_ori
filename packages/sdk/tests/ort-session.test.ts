import { describe, expect, it, vi } from "vitest";
import { createOrtSession } from "../src/runtime/ort-session";
import type { ModelManifest } from "../src/types";

describe("createOrtSession", () => {
  it("uses a stable default WASM asset base URL", async () => {
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
      backend: "wasm",
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
  });
});
