import { DocOrientationError } from "../errors";
import type { Backend, Capabilities, ModelManifest } from "../types";

export interface OrtTensorLike { readonly data: unknown; readonly dims: readonly number[]; dispose(): void; }
export interface OrtSessionLike { run(feeds: Readonly<Record<string, OrtTensorLike>>, options?: { terminate?: boolean }): Promise<Readonly<Record<string, OrtTensorLike | undefined>>>; release(): Promise<void>; }
export interface OrtModuleLike {
  readonly env: { readonly wasm: { numThreads?: number; simd?: boolean; wasmPaths?: string | Readonly<Record<string, string | URL>> } };
  readonly Tensor: new (type: "float32", data: Float32Array, dims: readonly number[]) => OrtTensorLike;
  readonly InferenceSession: { create(model: Uint8Array, options: Readonly<Record<string, unknown>>): Promise<OrtSessionLike> };
}
export interface OrtSessionOptions { readonly backend: Backend; readonly capabilities: Capabilities; readonly manifest: ModelManifest; readonly modelBytes: ArrayBuffer; readonly wasm?: { readonly numThreads?: number; readonly paths?: string | Readonly<Record<string, string | URL>> }; readonly ort?: OrtModuleLike; }
export interface OrtRunResult { readonly logits: Float32Array; readonly inferenceMs: number; }

async function defaultOrt(backend: Backend): Promise<OrtModuleLike> { return (backend === "webgpu" ? await import("onnxruntime-web/webgpu") : await import("onnxruntime-web")) as unknown as OrtModuleLike; }

export async function createOrtSession(options: OrtSessionOptions): Promise<{ readonly backend: Backend; readonly sessionCreateMs: number; run(data: Float32Array, dims: readonly number[], signal?: AbortSignal): Promise<OrtRunResult>; dispose(): Promise<void> }> {
  const ort = options.ort ?? await defaultOrt(options.backend);
  if (options.backend === "wasm") {
    if (options.wasm?.paths !== undefined) ort.env.wasm.wasmPaths = options.wasm.paths;
    if (options.capabilities.wasmSimd !== undefined) ort.env.wasm.simd = options.capabilities.wasmSimd;
    ort.env.wasm.numThreads = options.capabilities.wasmThreads ? Math.max(1, Math.min(4, options.wasm?.numThreads ?? 2)) : 1;
  }
  const started = typeof performance === "object" ? performance.now() : Date.now();
  let session: OrtSessionLike;
  try {
    session = await ort.InferenceSession.create(new Uint8Array(options.modelBytes), { executionProviders: options.backend === "webgpu" ? [{ name: "webgpu", preferredLayout: "NCHW" }] : ["wasm"], executionMode: "sequential", graphOptimizationLevel: "all" });
  } catch (error) { throw new DocOrientationError("SESSION_CREATE_FAILED", `ONNX session creation failed for ${options.backend}`, { backend: options.backend, cause: String(error) }); }
  let disposed = false;
  return {
    backend: options.backend,
    sessionCreateMs: Math.max(0, (typeof performance === "object" ? performance.now() : Date.now()) - started),
    async run(data, dims, signal) {
      if (disposed) throw new DocOrientationError("INFERENCE_FAILED", "ONNX session has been disposed", { disposed: true });
      if (signal?.aborted) throw new DocOrientationError("ABORTED", "ONNX inference was aborted", { reason: signal.reason });
      const input = new ort.Tensor("float32", data, dims);
      const runOptions: { terminate?: boolean } = {};
      const abort = (): void => { runOptions.terminate = true; };
      signal?.addEventListener("abort", abort, { once: true });
      const inferenceStarted = typeof performance === "object" ? performance.now() : Date.now();
      let outputs: Readonly<Record<string, OrtTensorLike | undefined>> | undefined;
      try {
        outputs = await session.run({ [options.manifest.input.name]: input }, runOptions);
        if (signal?.aborted) throw new DocOrientationError("ABORTED", "ONNX inference was aborted", { reason: signal.reason });
        const tensor = outputs[options.manifest.output.name];
        if (tensor === undefined || !(tensor.data instanceof Float32Array)) throw new DocOrientationError("INFERENCE_FAILED", "ONNX logits output is missing or not float32", { output: options.manifest.output.name });
        return { logits: new Float32Array(tensor.data), inferenceMs: Math.max(0, (typeof performance === "object" ? performance.now() : Date.now()) - inferenceStarted) };
      } catch (error) {
        if (error instanceof DocOrientationError) throw error;
        throw new DocOrientationError("INFERENCE_FAILED", `ONNX inference failed for ${options.backend}`, { backend: options.backend, cause: String(error) });
      } finally {
        signal?.removeEventListener("abort", abort);
        input.dispose();
        for (const tensor of Object.values(outputs ?? {})) tensor?.dispose();
      }
    },
    async dispose() { if (!disposed) { disposed = true; await session.release(); } }
  };
}
