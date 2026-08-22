import type { Backend, Capabilities } from "../types";
import { DocOrientationError } from "../errors";

interface WebGpuAdapterLike {
  readonly features: ReadonlySet<string>;
}

export interface CapabilityEnvironment {
  readonly crossOriginIsolated?: boolean;
  readonly offscreenCanvas?: boolean;
  readonly requestAdapter?: () => Promise<WebGpuAdapterLike | null>;
  readonly secureContext?: boolean;
  readonly sharedArrayBuffer?: boolean;
  readonly validateWasm?: (bytes: BufferSource) => boolean;
  readonly wasm?: boolean;
  readonly wasmSimd?: boolean;
  readonly wasmThreads?: boolean;
  readonly worker?: boolean;
}

export async function probeCapabilities(
  environment: CapabilityEnvironment = readGlobalEnvironment(),
): Promise<Capabilities> {
  const wasm = environment.wasm ?? typeof WebAssembly === "object";
  const wasmSimd =
    environment.wasmSimd ??
    (wasm && validateWasm(environment.validateWasm, SIMD_PROBE));
  const wasmThreads =
    environment.wasmThreads ??
    (wasm &&
      environment.crossOriginIsolated === true &&
      environment.sharedArrayBuffer === true &&
      validateWasm(environment.validateWasm, THREADS_PROBE));
  let webgpu = false;
  if (environment.secureContext === true && environment.requestAdapter) {
    try {
      webgpu = (await environment.requestAdapter()) !== null;
    } catch {
      webgpu = false;
    }
  }
  return {
    wasm,
    wasmSimd,
    wasmThreads,
    webgpu,
    worker: environment.worker ?? typeof Worker === "function",
    offscreenCanvas:
      environment.offscreenCanvas ?? typeof OffscreenCanvas === "function",
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
  if (backend === "wasm" && !capabilities.wasm)
    throw new DocOrientationError(
      "CAPABILITY_UNSUPPORTED",
      "WebAssembly is unavailable in this environment",
      { backend },
    );
}

function readGlobalEnvironment(): CapabilityEnvironment {
  const runtimeNavigator = globalThis.navigator as Navigator & {
    gpu?: {
      requestAdapter(): Promise<WebGpuAdapterLike | null>;
    };
  };
  const wasm = typeof WebAssembly === "object";
  return {
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    offscreenCanvas: typeof OffscreenCanvas === "function",
    ...(runtimeNavigator.gpu === undefined
      ? {}
      : { requestAdapter: () => runtimeNavigator.gpu!.requestAdapter() }),
    secureContext: globalThis.isSecureContext === true,
    sharedArrayBuffer: typeof SharedArrayBuffer === "function",
    ...(wasm
      ? {
          validateWasm: (bytes: BufferSource) =>
            WebAssembly.validate(bytes),
        }
      : {}),
    wasm,
    worker: typeof Worker === "function",
  };
}

function validateWasm(
  validate: CapabilityEnvironment["validateWasm"],
  bytes: Uint8Array,
): boolean {
  if (validate === undefined) return false;
  try {
    return validate(bytes as unknown as BufferSource);
  } catch {
    return false;
  }
}

const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30,
  1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 253, 186, 1, 26, 11,
]);

const THREADS_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4,
  1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11,
]);
