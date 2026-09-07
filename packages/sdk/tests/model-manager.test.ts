import { describe, expect, it, vi } from "vitest";
import { ModelManager } from "../src/model/model-manager";
import type { CacheStorage } from "../src/cache/cache-storage";
import type {
  ModelCacheEntry,
  ModelManifest,
  ModelVariant,
} from "../src/types";
import { MemoryCache } from "../src/cache/memory-cache";
import * as cacheApi from "../src/index";

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
      model: {
        id: "test-model",
        version: "1",
        architecture: "test",
        modelType: "test",
        parameterCount: 1,
      },
      source: {
        name: "test",
        url: "https://example.test",
        license: "Apache-2.0",
        files: {},
      },
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
  it.each([
    [
      ["x/y", "z", "test"],
      ["x", "y/z", "test"],
    ],
    [
      ["x", "y/z", "test"],
      ["x", "y", "z/test"],
    ],
    [
      ["x/y", "z", "test"],
      ["x%2Fy", "z", "test"],
    ],
  ])("模型身份 %j 与 %j 不共享缓存或清理作用域", async (first, second) => {
    const { manifest, variant } = await contract();
    const manager = new ModelManager(new MemoryCache());
    const pairs = [first, second].map(([id, version, variantId]) => ({
      manifest: {
        ...manifest,
        model: { ...manifest.model, id: id!, version: version! },
      },
      variant: { ...variant, id: variantId! },
    }));
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(modelBytes)));
    try {
      for (const pair of pairs)
        expect((await manager.load(pair.manifest, pair.variant)).source).toBe(
          "network",
        );
      for (const pair of pairs)
        expect((await manager.load(pair.manifest, pair.variant)).source).toBe(
          "cache",
        );
      const secondScope = { modelId: second[0]!, version: second[1]! };
      expect(await manager.estimateCache(secondScope)).toMatchObject({
        bytes: 4,
        entries: 1,
      });
      await manager.clearCache(secondScope);
      expect(await manager.estimateCache(secondScope)).toMatchObject({
        bytes: 0,
        entries: 0,
      });
      expect(
        (await manager.listCache()).map((entry) => [
          entry.modelId,
          entry.version,
          entry.variant,
        ]),
      ).toEqual([first]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each(["test-model", "x/y", "x%2Fy"])(
    "读取完整身份匹配的旧键 %s，保留既有缓存",
    async (id) => {
      const { manifest, variant } = await contract();
      const resolved = { ...manifest, model: { ...manifest.model, id } };
      const cache = new MemoryCache();
      const key = `${id}/1/test/${variant.sha256}`;
      await cache.put(key, {
        data: modelBytes,
        entry: {
          key,
          modelId: id,
          version: "1",
          variant: "test",
          sha256: variant.sha256,
          bytes: 4,
        },
      });
      const manager = new ModelManager(cache);
      expect((await manager.load(resolved, variant)).source).toBe("cache");
      expect(
        await manager.estimateCache({ modelId: id, version: "1" }),
      ).toMatchObject({ bytes: 4, entries: 1 });
      await manager.clearCache({ modelId: id, version: "1" });
      expect(await manager.listCache()).toEqual([]);
    },
  );

  it("碰撞旧键中的其他模型保持可用，新模型使用独立键", async () => {
    const { manifest, variant } = await contract();
    const cache = new MemoryCache();
    const key = `x/y/z/test/${variant.sha256}`;
    await cache.put(key, {
      data: modelBytes,
      entry: {
        key,
        modelId: "x/y",
        version: "z",
        variant: "test",
        sha256: variant.sha256,
        bytes: 4,
      },
    });
    const manager = new ModelManager(cache);
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(modelBytes)));
    try {
      const other = {
        ...manifest,
        model: { ...manifest.model, id: "x", version: "y/z" },
      };
      expect((await manager.load(other, variant)).source).toBe("network");
      expect(
        await manager.estimateCache({ modelId: "x", version: "y/z" }),
      ).toMatchObject({ bytes: 4, entries: 1 });
      await manager.clearCache({ modelId: "x", version: "y/z" });
      expect(
        (
          await manager.load(
            {
              ...manifest,
              model: { ...manifest.model, id: "x/y", version: "z" },
            },
            variant,
          )
        ).source,
      ).toBe("cache");
      expect((await manager.listCache()).map((entry) => entry.key)).toEqual([
        key,
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    { modelId: "other" },
    { version: "2" },
    { variant: "fp16" },
    { sha256: "0".repeat(64) },
    { bytes: 999 },
    { key: "other/key" },
  ])(
    "拒绝身份字段被篡改的缓存条目 %j",
    async (changed: Partial<ModelCacheEntry>) => {
      const { manifest, variant } = await contract();
      const cache = new MemoryCache();
      const manager = new ModelManager(cache);
      vi.stubGlobal("fetch", () => Promise.resolve(new Response(modelBytes)));
      try {
        await manager.load(manifest, variant);
        const entry = (await cache.list())[0]!;
        await cache.put(entry.key, {
          data: modelBytes,
          entry: { ...entry, ...changed },
        });
        expect((await manager.load(manifest, variant)).source).toBe("network");
        expect((await manager.load(manifest, variant)).source).toBe("cache");
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it("分别记录下载、缓存读取与校验，兼容旧下载字段", async () => {
    const { manifest, variant } = await contract();
    const manager = new ModelManager(new MemoryCache());
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(modelBytes)));
    try {
      const cold = await manager.load(manifest, variant);
      const cached = await manager.load(manifest, variant);
      const custom = await manager.load(manifest, variant, {
        data: modelBytes,
      });
      expect(cold.modelDownloadMs).toBeGreaterThanOrEqual(0);
      expect(cold.downloadMs).toBeGreaterThanOrEqual(
        cold.modelDownloadMs + cold.integrityMs,
      );
      expect(cached).toMatchObject({
        source: "cache",
        downloadMs: 0,
        modelDownloadMs: 0,
      });
      expect(cached.modelCacheReadMs).toBeGreaterThanOrEqual(0);
      expect(cached.integrityMs).toBeGreaterThanOrEqual(0);
      expect(custom).toMatchObject({
        source: "custom",
        downloadMs: 0,
        modelDownloadMs: 0,
        modelCacheReadMs: 0,
      });
      expect(custom.integrityMs).toBeGreaterThanOrEqual(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("当前模型清理覆盖所有精度，保留其他模型和版本", async () => {
    const { manifest, variant } = await contract();
    const manager = new ModelManager(new MemoryCache());
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(modelBytes)));
    try {
      await manager.load(manifest, variant);
      await manager.load(manifest, { ...variant, id: "fp16" });
      await manager.load(
        { ...manifest, model: { ...manifest.model, version: "2" } },
        variant,
      );
      await manager.load(
        { ...manifest, model: { ...manifest.model, id: "other" } },
        variant,
      );
      expect(
        await manager.estimateCache({ modelId: "test-model", version: "1" }),
      ).toMatchObject({ bytes: 8, entries: 2 });
      await manager.clearCache({ modelId: "test-model", version: "1" });
      expect(
        (await manager.listCache()).map((entry) => [
          entry.modelId,
          entry.version,
        ]),
      ).toEqual([
        ["test-model", "2"],
        ["other", "1"],
      ]);
      expect(await manager.estimateCache()).toMatchObject({
        bytes: 8,
        entries: 2,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("清理前开始的下载不能在清理后重新填充缓存", async () => {
    const { manifest, variant } = await contract();
    const cache = new MemoryCache();
    const manager = new ModelManager(cache);
    let finish!: (response: Response) => void;
    let started!: () => void;
    const fetching = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.stubGlobal("fetch", () => {
      started();
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    });
    try {
      const loading = manager.load(manifest, variant);
      await fetching;
      await new ModelManager(cache).clearCache();
      finish(new Response(modelBytes));
      await loading;
      expect(await manager.listCache()).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([true, false])(
    "当前清理仅阻止同一模型的旧下载回填：同一身份=%s",
    async (sameIdentity) => {
      const { manifest, variant } = await contract();
      const cache = new MemoryCache();
      const manager = new ModelManager(cache);
      let finish!: (response: Response) => void;
      let started!: () => void;
      const fetching = new Promise<void>((resolve) => {
        started = resolve;
      });
      vi.stubGlobal("fetch", () => {
        started();
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      });
      try {
        const loading = manager.load(manifest, variant);
        await fetching;
        await new ModelManager(cache).clearCache({
          modelId: sameIdentity ? manifest.model.id : "other-model",
          version: manifest.model.version,
        });
        finish(new Response(modelBytes));
        await loading;
        expect(await manager.estimateCache()).toMatchObject({
          bytes: sameIdentity ? 0 : 4,
          entries: sameIdentity ? 0 : 1,
        });
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );

  it("公开缓存接口可估计并清理默认内存降级中的已加载模型", async () => {
    const { manifest, variant } = await contract();
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(modelBytes)));
    try {
      const manager = new ModelManager();
      await manager.load(manifest, variant);
      expect(
        await cacheApi.estimateModelCache({
          modelId: "test-model",
          version: "1",
        }),
      ).toMatchObject({ bytes: 4, entries: 1 });
      await cacheApi.clearCurrentModelCache({
        modelId: "test-model",
        version: "1",
      });
      expect(await manager.listCache()).toEqual([]);
      await manager.load(manifest, variant);
      await cacheApi.clearAllModelCache();
      expect(await manager.listCache()).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("读取缓存期间取消后拒绝返回模型", async () => {
    const { manifest, variant } = await contract();
    const controller = new AbortController();
    const cache = new FakeCache({ data: modelBytes, entry: {} as never });
    const read = cache.get.bind(cache);
    cache.get = () => {
      controller.abort();
      return read();
    };
    await expect(
      new ModelManager(cache).load(manifest, variant, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("标准下载耗时排除校验和缓存写入，旧字段保持合计", async () => {
    const { manifest, variant } = await contract();
    let clock = 0;
    const cache = new MemoryCache();
    const get = cache.get.bind(cache);
    const put = cache.put.bind(cache);
    cache.get = (key) => {
      clock += 10;
      return get(key);
    };
    cache.put = (key, value) => {
      clock += 40;
      return put(key, value);
    };
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(crypto.subtle, "digest").mockImplementation((algorithm, data) => {
      clock += 30;
      return digest(algorithm, data);
    });
    vi.stubGlobal("fetch", () => {
      clock += 20;
      return Promise.resolve(new Response(modelBytes));
    });
    try {
      const manager = new ModelManager(cache);
      expect(await manager.load(manifest, variant)).toMatchObject({
        modelDownloadMs: 20,
        modelCacheReadMs: 20,
        integrityMs: 30,
        downloadMs: 90,
      });
      expect(await manager.load(manifest, variant)).toMatchObject({
        modelDownloadMs: 0,
        modelCacheReadMs: 10,
        integrityMs: 30,
        downloadMs: 0,
      });
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });

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
      entry: {
        key: `test-model/1/test/${variant.sha256}`,
        modelId: "test-model",
        version: "1",
        variant: "test",
        sha256: variant.sha256,
        bytes: 4,
      } as never,
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(modelBytes, { status: 200 })),
    );
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
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(modelBytes, { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const loaded = await new ModelManager(new FailingCache()).load(
        manifest,
        variant,
      );
      expect(loaded.source).toBe("network");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
