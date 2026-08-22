const scope = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(message: unknown): void };
scope.onmessage = () => scope.postMessage({ type: "error", code: "SESSION_CREATE_FAILED", message: "Worker runtime is unavailable" });
