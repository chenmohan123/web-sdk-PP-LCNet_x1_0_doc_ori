import { DocOrientationError } from "../errors";
import type {
  ModelCacheEntry,
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
}

export interface ModelLoadOptions {
  readonly cache?: boolean;
  readonly data?: ArrayBuffer;
  readonly signal?: AbortSignal;
  readonly onProgress?: (event: ProgressEvent) => void;
}

export class ModelManager {
  constructor(private readonly cache: CacheStorage = createDefaultCache()) {}
  async load(
    manifest: ModelManifest,
    variant: ModelVariant,
    options: ModelLoadOptions = {},
  ): Promise<LoadedModel> {
    if (options.data !== undefined) {
      await verifyModelIntegrity(options.data, variant);
      return { data: options.data, source: "custom", downloadMs: 0 };
    }
    const key = `${manifest.model.id}/${manifest.model.version}/${variant.id}/${variant.sha256}`;
    if (options.cache !== false) {
      let cached:
        | Awaited<ReturnType<CacheStorage["get"]>>
        | undefined;
      try {
        cached = await this.cache.get(key);
      } catch {
        cached = undefined;
      }
      if (cached !== undefined) {
        try {
          await verifyModelIntegrity(cached.data, variant);
          return { data: cached.data, source: "cache", downloadMs: 0 };
        } catch {
          await this.cache.delete(key).catch(() => undefined);
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
    options.onProgress?.({
      stage: "download",
      loaded: buffer.byteLength,
      total,
    });
    await verifyModelIntegrity(buffer, variant);
    const entry: ModelCacheEntry = {
      key,
      modelId: manifest.model.id,
      version: manifest.model.version,
      variant: variant.id,
      sha256: variant.sha256,
      bytes: variant.bytes,
    };
    if (options.cache !== false)
      await this.cache.put(key, { data: buffer, entry }).catch(() => undefined);
    return {
      data: buffer,
      source: "network",
      downloadMs: Math.max(
        0,
        (typeof performance === "object" ? performance.now() : Date.now()) -
          started,
      ),
    };
  }
  clearCache() {
    return this.cache.clear();
  }
  listCache() {
    return this.cache.list();
  }
}
