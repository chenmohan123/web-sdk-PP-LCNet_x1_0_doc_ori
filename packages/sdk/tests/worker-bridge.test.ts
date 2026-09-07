import { describe, expect, it } from "vitest";
import { createWorkerExecutor, type WorkerLike } from "../src/worker/worker-bridge";
import type { ModelManifest } from "../src/types";

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.messages.push(message);
    const typed = message as { type?: string; requestId?: number };
    if (typed.type === "init") {
      queueMicrotask(() =>
        this.onmessage?.({
          data: { type: "ready", requestId: typed.requestId, sessionCreateMs: 1, runtime: { backend: "wasm", requestedBackend: "wasm", actualBackend: "wasm", executionProvider: "wasm", execution: "worker", runtimeVersion: "1.27.0", threads: 1 } },
        } as MessageEvent),
      );
    }
  }

  terminate(): void {
    this.terminated = true;
  }
}

const manifest = {} as ModelManifest;

async function createExecutor(worker: FakeWorker) {
  return createWorkerExecutor({
    createWorker: () => worker,
    worker: true,
    model: new ArrayBuffer(4),
    manifest,
    backend: "wasm",
  });
}

describe("createWorkerExecutor", () => {
  it("取消任务的延迟错误不终止随后运行的新任务", async () => {
    const worker = new FakeWorker();
    const executor = (await createExecutor(worker))!;
    const controller = new AbortController();
    const first = executor.run(new Float32Array([1]), [1], controller.signal);
    controller.abort();
    await expect(first).rejects.toThrow("aborted");
    const second = executor.run(new Float32Array([2]), [1]);
    worker.onmessage?.({ data: { type: "error", requestId: 2, code: "ABORTED", message: "旧任务已取消" } } as MessageEvent);
    expect(worker.terminated).toBe(false);
    worker.onmessage?.({ data: { type: "result", requestId: 4, result: { logits: new Float32Array([2]), inferenceMs: 1 } } } as MessageEvent);
    expect((await second).logits).toEqual(new Float32Array([2]));
    await executor.dispose();
  });

  it("公开 Worker 实际创建会话的运行信息", async () => {
    const executor = await createExecutor(new FakeWorker());
    expect(executor?.runtime).toMatchObject({ requestedBackend: "wasm", actualBackend: "wasm", execution: "worker", runtimeVersion: "1.27.0", threads: 1 });
    await executor?.dispose();
  });

  it("sends an abort message when an inference signal is cancelled", async () => {
    const worker = new FakeWorker();
    const executor = await createExecutor(worker);
    if (executor === undefined) throw new Error("executor was not created");
    const controller = new AbortController();
    const running = executor.run(new Float32Array([1]), [1], controller.signal);

    controller.abort("cancelled");

    await expect(running).rejects.toThrow("aborted");
    expect(worker.messages).toContainEqual(expect.objectContaining({ type: "abort" }));
    await executor.dispose();
  });

  it("rejects pending inference when disposed", async () => {
    const worker = new FakeWorker();
    const executor = await createExecutor(worker);
    if (executor === undefined) throw new Error("executor was not created");
    const running = executor.run(new Float32Array([1]), [1]);

    await executor.dispose();

    await expect(running).rejects.toThrow("disposed");
    expect(worker.terminated).toBe(true);
  });
});
