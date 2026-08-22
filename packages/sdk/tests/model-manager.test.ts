import { describe, expect, it, vi } from "vitest";
import { ModelManager } from "../src/model/model-manager";
import type { CacheStorage } from "../src/cache/cache-storage";
import type { ModelManifest, ModelVariant } from "../src/types";

const modelBytes = new Uint8Array([1, 2, 3, 4]).buffer;

async function sha256(data: ArrayBuffer): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function contract(): Promise<{
  manifest: ModelManifest;
  variant: ModelVariant;
}> {
  const digest = await sha256(modelBytes);
  const variant: ModelVariant = {
    id: "test",
    bytes: modelBytes.byteLength,
    opset: 7,
    sha256: digest,
    url: "https://example.test/model.onnx",
  };
  return {
    variant,
    manifest: {
      model: { id: "test-model", version: "1", architecture: "test", modelType: "test", parameterCount: 1 },
      source: { name: "test", url: "https://example.test", license: "Apache-2.0", files: {} },
    } as unknown as ModelManifest,
  };
}

class FakeCache implements CacheStorage {
  constructor(private value?: { data: ArrayBuffer; entry: never }) {}
  deleted = false;
  get() {
    return Promise.resolve(this.value);
  }
  put(_key: string, value: { data: ArrayBuffer; entry: never }) {
    this.value = value;
    return Promise.resolve();
  }
  delete() {
    this.deleted = true;
    this.value = undefined;
    return Promise.resolve();
  }
  clear() {
    return Promise.resolve();
  }
  list() {
    return Promise.resolve(this.value === undefined ? [] : [this.value.entry]);
  }
}

class FailingCache implements CacheStorage {
  get(): Promise<never> {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  put(): Promise<void> {
    return Promise.resolve();
  }
  delete(): Promise<void> {
    return Promise.resolve();
  }
  clear(): Promise<void> {
    return Promise.resolve();
  }
  list(): Promise<never[]> {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
}

describe("ModelManager", () => {
  it("accepts verified in-memory model bytes without downloading", async () => {
    const { manifest, variant } = await contract();
    const manager = new ModelManager(new FakeCache());

    const loaded = await manager.load(manifest, variant, { data: modelBytes });

    expect(loaded.source).toBe("custom");
    expect(new Uint8Array(loaded.data)).toEqual(new Uint8Array(modelBytes));
  });

  it("evicts corrupt cached bytes and retries from the network", async () => {
    const { manifest, variant } = await contract();
    const cache = new FakeCache({
      data: new Uint8Array([9, 9, 9, 9]).buffer,
      entry: {} as never,
    });
    const fetchMock = vi.fn(() => Promise.resolve(new Response(modelBytes, { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const loaded = await new ModelManager(cache).load(manifest, variant);
      expect(loaded.source).toBe("network");
      expect(cache.deleted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("continues with the network when persistent cache reads fail", async () => {
    const { manifest, variant } = await contract();
    const fetchMock = vi.fn(() => Promise.resolve(new Response(modelBytes, { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const loaded = await new ModelManager(new FailingCache()).load(manifest, variant);
      expect(loaded.source).toBe("network");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
