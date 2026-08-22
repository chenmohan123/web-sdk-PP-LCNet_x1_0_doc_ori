import type { ModelCacheEntry } from "../types";

export interface CacheStorage {
  get(
    key: string,
  ): Promise<
    { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry } | undefined
  >;
  put(
    key: string,
    value: { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  list(): Promise<readonly ModelCacheEntry[]>;
}
