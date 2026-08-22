import type { Backend, Capabilities } from "../types";
import { DocOrientationError } from "../errors";

export function probeCapabilities(): Capabilities {
  const webgpu =
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    (globalThis.isSecureContext ?? false);
  return {
    wasm: true,
    webgpu,
    worker: typeof Worker === "function",
    offscreenCanvas: typeof OffscreenCanvas === "function",
    wasmSimd: true,
    wasmThreads:
      typeof crossOriginIsolated === "boolean" && crossOriginIsolated,
  };
}

export function assertBackendSupported(
  backend: Backend,
  capabilities: Capabilities,
): void {
  if (backend === "webgpu" && !capabilities.webgpu)
    throw new DocOrientationError(
      "CAPABILITY_UNSUPPORTED",
      "WebGPU is unavailable in this environment",
      { backend },
    );
}
