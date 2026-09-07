import type { Backend, DocOrientationRuntimeInfo, ModelManifest, NormalizedRaster, CreateDocOrientationOptions } from "../types";
import type { OrtRunResult } from "../runtime/ort-session";
export interface InferenceExecutor {
  readonly mode: "main" | "worker";
  readonly runtime: DocOrientationRuntimeInfo;
  readonly sessionCreateMs: number;
  run(
    data: Float32Array,
    dims: readonly number[],
    signal?: AbortSignal,
  ): Promise<OrtRunResult>;
  dispose(): Promise<void>;
}
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}
export async function createWorkerExecutor(options: {
  readonly createWorker?: () => WorkerLike;
  readonly worker?: boolean;
  readonly model: ArrayBuffer;
  readonly manifest: ModelManifest;
  readonly backend: Backend;
  readonly wasm?: NonNullable<CreateDocOrientationOptions["ort"]>["wasm"];
}): Promise<InferenceExecutor | undefined> {
  if (!options.worker || options.createWorker === undefined) return undefined;
  const worker = options.createWorker();
  let nextRequestId = 1;
  return new Promise((resolve, reject) => {
    const pending = new Map<
      number,
      {
        resolve: (value: OrtRunResult) => void;
        reject: (error: Error) => void;
        cleanup: () => void;
      }
    >();
    const readyRequestId = nextRequestId++;
    worker.onmessage = (event) => {
      const message = event.data as {
        type: string;
        requestId?: number;
        sessionCreateMs?: number;
        runtime?: DocOrientationRuntimeInfo;
        result?: OrtRunResult;
        message?: string;
      };
      if (message.type === "ready" && message.requestId === readyRequestId) {
        if (message.runtime === undefined) {
          worker.terminate();
          reject(new Error("Worker 未返回会话运行信息，请使用同版本 Worker"));
          return;
        }
        resolve({
          mode: "worker",
          runtime: message.runtime,
          sessionCreateMs: message.sessionCreateMs ?? 0,
          run(data, dims, signal) {
            if (signal?.aborted)
              return Promise.reject(new Error("Worker inference was aborted"));
            return new Promise((done, fail) => {
              const requestId = nextRequestId++;
              const abort = (): void => {
                pending.delete(requestId);
                fail(new Error("Worker inference was aborted"));
                worker.postMessage({
                  type: "abort",
                  requestId: nextRequestId++,
                  targetRequestId: requestId,
                });
              };
              pending.set(requestId, {
                resolve: done,
                reject: fail,
                cleanup: () => signal?.removeEventListener("abort", abort),
              });
              signal?.addEventListener("abort", abort, { once: true });
              worker.postMessage({ type: "run", requestId, data, dims }, [
                data.buffer,
              ]);
            });
          },
          dispose() {
            for (const [requestId, request] of pending) {
              pending.delete(requestId);
              request.cleanup();
              request.reject(new Error("Worker inference was disposed"));
            }
            const requestId = nextRequestId++;
            worker.postMessage({ type: "dispose", requestId });
            worker.terminate();
            return Promise.resolve();
          },
        });
      } else if (message.type === "result" && message.requestId !== undefined) {
        const request = pending.get(message.requestId);
        if (request !== undefined) {
          pending.delete(message.requestId);
          request.cleanup();
          if (message.result === undefined)
            request.reject(new Error("Worker result is missing"));
          else request.resolve(message.result);
        }
      } else if (message.type === "error") {
        const error = new Error(message.message ?? "Worker failed");
        if (message.requestId === readyRequestId) {
          worker.terminate();
          reject(error);
          return;
        }
        if (message.requestId !== undefined) {
          const request = pending.get(message.requestId);
          if (request !== undefined) {
            pending.delete(message.requestId);
            request.cleanup();
            request.reject(error);
            return;
          }
        }
        // 已取消请求的延迟响应不得终止仍在运行的新请求。
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      const error =
        event.error instanceof Error
          ? event.error
          : new Error(event.message ?? "Worker failed");
      for (const [requestId, request] of pending) {
        pending.delete(requestId);
        request.cleanup();
        request.reject(error);
      }
      reject(error);
    };
    worker.postMessage(
      {
        type: "init",
        requestId: readyRequestId,
        model: options.model,
        manifest: options.manifest,
        backend: options.backend,
        ...(options.wasm === undefined ? {} : { wasm: options.wasm }),
      },
      [options.model],
    );
  });
}
export function transferRaster(raster: NormalizedRaster): Transferable[] {
  return [raster.data.buffer];
}
