import { createOrtSession } from "../runtime/ort-session";
import { probeCapabilities } from "../runtime/capabilities";
import type { ModelManifest, Backend } from "../types";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

let session: Awaited<ReturnType<typeof createOrtSession>> | undefined;

scope.onmessage = (event) => {
  void handleMessage(event.data as Record<string, unknown>);
};

async function handleMessage(message: Record<string, unknown>): Promise<void> {
  const requestId =
    typeof message.requestId === "number" ? message.requestId : 0;
  try {
    if (message.type === "init") {
      await session?.dispose();
      session = await createOrtSession({
        backend: message.backend as Backend,
        capabilities: probeCapabilities(),
        manifest: message.manifest as ModelManifest,
        modelBytes: message.model as ArrayBuffer,
      });
      scope.postMessage({
        type: "ready",
        requestId,
        sessionCreateMs: session.sessionCreateMs,
      });
      return;
    }
    if (message.type === "run") {
      if (session === undefined)
        throw new Error("Worker session is not initialized");
      const data = message.data;
      const dims = message.dims;
      if (!(data instanceof Float32Array) || !Array.isArray(dims))
        throw new Error("Worker run payload is invalid");
      const result = await session.run(data, dims as number[]);
      scope.postMessage({ type: "result", requestId, result }, [
        result.logits.buffer,
      ]);
      return;
    }
    if (message.type === "dispose") {
      await session?.dispose();
      session = undefined;
      scope.postMessage({ type: "result", requestId });
      return;
    }
    throw new Error(`Unknown worker message: ${String(message.type)}`);
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId,
      code: "WORKER_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
