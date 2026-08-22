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
          data: { type: "ready", requestId: typed.requestId, sessionCreateMs: 1 },
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
