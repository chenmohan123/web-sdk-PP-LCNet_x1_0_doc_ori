import { DocOrientationError } from "../errors";
import type {
  ModelCacheEntry,
  ModelCacheScope,
  ModelCacheEstimate,
  ModelManifest,
  ModelVariant,
  ProgressEvent,
} from "../types";
import { createDefaultCache } from "../cache/indexeddb-cache";
import type { CacheStorage } from "../cache/cache-storage";
import { verifyModelIntegrity } from "./integrity";

export interface LoadedModel {
  readonly data: ArrayBuffer;
  readonly source: "network" | "cache" | "memory" | "custom";
  readonly downloadMs: number;
  readonly modelDownloadMs: number;
  readonly modelCacheReadMs: number;
  readonly integrityMs: number;
}

export interface ModelLoadOptions {
  readonly cache?: boolean;
  readonly data?: ArrayBuffer;
  readonly signal?: AbortSignal;
  readonly onProgress?: (event: ProgressEvent) => void;
}

const cacheStates = new WeakMap<
  CacheStorage,
  {
    generation: number;
    modelGenerations: Map<string, number>;
    queue: Promise<void>;
  }
>();
const now = () =>
  typeof performance === "object" ? performance.now() : Date.now();

function assertActive(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new DocOrientationError("ABORTED", "模型加载已取消", {
      reason: signal.reason,
    });
}

function matches(entry: ModelCacheEntry, scope?: ModelCacheScope): boolean {
  return (
    scope === undefined ||
    (entry.modelId === scope.modelId && entry.version === scope.version)
  );
}

export class ModelManager {
  constructor(private readonly cache: CacheStorage = createDefaultCache()) {}
  private get state() {
    let state = cacheStates.get(this.cache);
    if (state === undefined) {
      state = {
        generation: 0,
        modelGenerations: new Map(),
        queue: Promise.resolve(),
      };
      cacheStates.set(this.cache, state);
    }
    return state;
  }
  private enqueue(operation: () => Promise<void>): Promise<void> {
    const task = this.state.queue.then(operation);
    this.state.queue = task.catch(() => undefined);
    return task;
  }
  async load(
    manifest: ModelManifest,
    variant: ModelVariant,
    options: ModelLoadOptions = {},
  ): Promise<LoadedModel> {
    assertActive(options.signal);
    const generation = this.state.generation;
    const identity = JSON.stringify([
      manifest.model.id,
      manifest.model.version,
    ]);
    const modelGeneration = this.state.modelGenerations.get(identity) ?? 0;
    const canMutateCache = () =>
      generation === this.state.generation &&
      modelGeneration === (this.state.modelGenerations.get(identity) ?? 0);
    let modelCacheReadMs = 0;
    let integrityMs = 0;
    const verify = async (data: ArrayBuffer) => {
      options.onProgress?.({ stage: "integrity" });
      const started = now();
      try {
        await verifyModelIntegrity(data, variant);
      } finally {
        integrityMs += Math.max(0, now() - started);
      }
      assertActive(options.signal);
    };
    if (options.data !== undefined) {
      await verify(options.data);
      return {
        data: options.data,
        source: "custom",
        downloadMs: 0,
        modelDownloadMs: 0,
        modelCacheReadMs,
        integrityMs,
      };
    }
    // 结构化元组保留分段边界；格式版本独立于模型版本，也不会与旧路径键重合。
    const key = JSON.stringify([
      "v2",
      manifest.model.id,
      manifest.model.version,
      variant.id,
      variant.sha256,
    ]);
    const legacyKey = `${manifest.model.id}/${manifest.model.version}/${variant.id}/${variant.sha256}`;
    if (options.cache !== false) {
      options.onProgress?.({ stage: "cache" });
      for (const candidateKey of [key, legacyKey]) {
        const cacheStarted = now();
        let cached: Awaited<ReturnType<CacheStorage["get"]>>;
        try {
          cached = await this.cache.get(candidateKey);
        } catch {
          cached = undefined;
        }
        modelCacheReadMs += Math.max(0, now() - cacheStarted);
        assertActive(options.signal);
        const entry = cached?.entry;
        // 旧路径键可能与另一模型相撞；字节校验相同也不能替代完整身份匹配。
        if (
          cached !== undefined &&
          entry?.key === candidateKey &&
          entry.modelId === manifest.model.id &&
          entry.version === manifest.model.version &&
          entry.variant === variant.id &&
          entry.sha256 === variant.sha256 &&
          entry.bytes === variant.bytes
        ) {
          try {
            await verify(cached.data);
            return {
              data: cached.data,
              source: "cache",
              downloadMs: 0,
              modelDownloadMs: 0,
              modelCacheReadMs,
              integrityMs,
            };
          } catch (error) {
            assertActive(options.signal);
            if (
              !(error instanceof DocOrientationError) ||
              error.code !== "MODEL_INTEGRITY_FAILED"
            )
              throw error;
            await this.enqueue(async () => {
              if (canMutateCache()) await this.cache.delete(candidateKey);
            }).catch(() => undefined);
          }
        }
      }
    }
    if (options.signal?.aborted)
      throw new DocOrientationError("ABORTED", "Model download was aborted", {
        reason: options.signal.reason,
      });
    const started =
      typeof performance === "object" ? performance.now() : Date.now();
    let response: Response;
    try {
      response = await fetch(
        new URL(variant.url, manifest.source.url).href,
        options.signal === undefined ? {} : { signal: options.signal },
      );
    } catch (error) {
      if (options.signal?.aborted)
        throw new DocOrientationError("ABORTED", "Model download was aborted", {
          reason: options.signal.reason,
        });
      throw new DocOrientationError(
        "MODEL_DOWNLOAD_FAILED",
        "Unable to download model",
        { url: variant.url, cause: String(error) },
      );
    }
    if (!response.ok)
      throw new DocOrientationError(
        "MODEL_DOWNLOAD_FAILED",
        `Model download returned HTTP ${response.status}`,
        { status: response.status },
      );
    const total = Number(
      response.headers.get("content-length") ?? variant.bytes,
    );
    const buffer = await response.arrayBuffer();
    const modelDownloadMs = Math.max(0, now() - started);
    assertActive(options.signal);
    options.onProgress?.({
      stage: "download",
      loaded: buffer.byteLength,
      total,
    });
    await verify(buffer);
    const entry: ModelCacheEntry = {
      key,
      modelId: manifest.model.id,
      version: manifest.model.version,
      variant: variant.id,
      sha256: variant.sha256,
      bytes: variant.bytes,
    };
    if (options.cache !== false)
      await this.enqueue(async () => {
        if (canMutateCache() && !options.signal?.aborted)
          await this.cache.put(key, { data: buffer, entry });
      }).catch(() => undefined);
    assertActive(options.signal);
    return {
      data: buffer,
      source: "network",
      modelDownloadMs,
      modelCacheReadMs,
      integrityMs,
      downloadMs: Math.max(
        0,
        (typeof performance === "object" ? performance.now() : Date.now()) -
          started,
      ),
    };
  }
  clearCache(scope?: ModelCacheScope) {
    // 当前清理只使对应身份的旧下载失效，全清才影响全部模型。
    if (scope === undefined) this.state.generation += 1;
    else {
      const identity = JSON.stringify([scope.modelId, scope.version]);
      this.state.modelGenerations.set(
        identity,
        (this.state.modelGenerations.get(identity) ?? 0) + 1,
      );
    }
    return this.enqueue(async () => {
      if (scope === undefined) await this.cache.clear();
      else
        for (const entry of await this.cache.list()) {
          if (matches(entry, scope)) await this.cache.delete(entry.key);
        }
    });
  }
  listCache() {
    return this.cache.list();
  }
  async estimateCache(scope?: ModelCacheScope): Promise<ModelCacheEstimate> {
    await this.state.queue;
    const entries = (await this.cache.list()).filter((entry) =>
      matches(entry, scope),
    );
    return {
      bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      entries: entries.length,
      scope: scope ?? "all",
    };
  }
}

export function clearCurrentModelCache(scope: ModelCacheScope): Promise<void> {
  if (!scope?.modelId || !scope.version)
    return Promise.reject(
      new TypeError("清理当前模型必须提供 modelId 与 version"),
    );
  return new ModelManager().clearCache(scope);
}

export function clearAllModelCache(): Promise<void> {
  return new ModelManager().clearCache();
}

export function estimateModelCache(
  scope?: ModelCacheScope,
): Promise<ModelCacheEstimate> {
  return new ModelManager().estimateCache(scope);
}
