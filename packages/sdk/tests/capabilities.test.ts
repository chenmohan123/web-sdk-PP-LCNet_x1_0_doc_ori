import { describe, expect, it } from "vitest";
import { probeCapabilities } from "../src/runtime/capabilities";

describe("probeCapabilities", () => {
  it("does not report WebGPU when adapter acquisition returns null", async () => {
    const result = await probeCapabilities({
      secureContext: true,
      requestAdapter: () => Promise.resolve(null),
      wasm: true,
      wasmSimd: false,
      wasmThreads: false,
      worker: false,
      offscreenCanvas: false,
    });

    expect(result.webgpu).toBe(false);
    expect(result.wasm).toBe(true);
    expect(result.wasmSimd).toBe(false);
  });

  it("reports WebGPU only after an adapter is acquired", async () => {
    const result = await probeCapabilities({
      secureContext: true,
      requestAdapter: () => Promise.resolve({ features: new Set<string>() }),
      wasm: true,
      wasmSimd: true,
      wasmThreads: true,
      worker: true,
      offscreenCanvas: true,
    });

    expect(result.webgpu).toBe(true);
    expect(result.wasmThreads).toBe(true);
  });
});
