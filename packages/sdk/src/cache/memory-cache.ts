import type { ModelCacheEntry } from "../types";
import type { CacheStorage } from "./cache-storage";

export class MemoryCache implements CacheStorage {
  private readonly entries = new Map<
    string,
    { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry }
  >();
  get(key: string) {
    const value = this.entries.get(key);
    return Promise.resolve(
      value === undefined
        ? undefined
        : { data: value.data.slice(0), entry: value.entry },
    );
  }
  put(
    key: string,
    value: { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry },
  ): Promise<void> {
    this.entries.set(key, { data: value.data.slice(0), entry: value.entry });
    return Promise.resolve();
  }
  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }
  clear(): Promise<void> {
    this.entries.clear();
    return Promise.resolve();
  }
  list(): Promise<readonly ModelCacheEntry[]> {
    return Promise.resolve(
      [...this.entries.values()].map((value) => value.entry),
    );
  }
}
