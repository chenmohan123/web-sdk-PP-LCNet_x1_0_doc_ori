import type { Backend, ModelManifest, NormalizedRaster } from "../types";
import type { OrtRunResult } from "../runtime/ort-session";
export interface InferenceExecutor { readonly mode: "main" | "worker"; readonly sessionCreateMs: number; run(data: Float32Array, dims: readonly number[], signal?: AbortSignal): Promise<OrtRunResult>; dispose(): Promise<void>; }
export interface WorkerLike { postMessage(message: unknown, transfer?: Transferable[]): void; terminate(): void; onmessage: ((event: MessageEvent) => void) | null; onerror: ((event: ErrorEvent) => void) | null; }
export async function createWorkerExecutor(options: { readonly createWorker?: () => WorkerLike; readonly worker?: boolean; readonly model: ArrayBuffer; readonly manifest: ModelManifest; readonly backend: Backend }): Promise<InferenceExecutor | undefined> {
  if (!options.worker || options.createWorker === undefined) return undefined;
  const worker = options.createWorker();
  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => { const message = event.data as { type: string; sessionCreateMs?: number; result?: OrtRunResult; message?: string }; if (message.type === "ready") { resolve({ mode: "worker", sessionCreateMs: message.sessionCreateMs ?? 0, run(data, dims) { return new Promise((done, fail) => { worker.onmessage = (resultEvent) => { const result = resultEvent.data as { type: string; result?: OrtRunResult; message?: string }; if (result.type === "result") done(result.result!); else fail(new Error(result.message)); }; worker.postMessage({ type: "run", data, dims }, [data.buffer]); }); }, dispose() { worker.terminate(); return Promise.resolve(); } }); } else if (message.type === "error") { worker.terminate(); reject(new Error(message.message)); } };
    worker.onerror = (event) => { worker.terminate(); reject(event.error ?? new Error(event.message)); };
    worker.postMessage({ type: "init", model: options.model, manifest: options.manifest, backend: options.backend }, [options.model]);
  });
}
export function transferRaster(raster: NormalizedRaster): Transferable[] { return [raster.data.buffer]; }
