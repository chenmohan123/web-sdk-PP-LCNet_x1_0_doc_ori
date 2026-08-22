import type { ModelCacheEntry } from "../types";
import type { CacheStorage } from "./cache-storage";
import { MemoryCache } from "./memory-cache";

interface RecordValue {
  key: string;
  data: ArrayBuffer;
  entry: ModelCacheEntry;
}

export class IndexedDbCache implements CacheStorage {
  private readonly database: Promise<IDBDatabase>;
  constructor(name = "pp-lcnet-doc-orientation") {
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("models", { keyPath: "key" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB open failed"));
    });
  }
  async get(key: string) {
    const record = await this.request<RecordValue | undefined>(
      "readonly",
      (store) => store.get(key),
    );
    return record === undefined
      ? undefined
      : { data: record.data, entry: record.entry };
  }
  async put(
    key: string,
    value: { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry },
  ) {
    await this.request("readwrite", (store) =>
      store.put({
        key,
        data: value.data,
        entry: value.entry,
      } satisfies RecordValue),
    );
  }
  async delete(key: string) {
    await this.request("readwrite", (store) => store.delete(key));
  }
  async clear() {
    await this.request("readwrite", (store) => store.clear());
  }
  async list() {
    const records = await this.request<RecordValue[]>("readonly", (store) =>
      store.getAll(),
    );
    return records.map((record) => record.entry);
  }
  private request<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    return this.database.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = action(
            database.transaction("models", mode).objectStore("models"),
          );
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () =>
            reject(request.error ?? new Error("IndexedDB request failed"));
        }),
    );
  }
}

export function createDefaultCache(): CacheStorage {
  if (typeof indexedDB === "undefined") return new MemoryCache();
  try {
    return new ResilientCache(new IndexedDbCache());
  } catch {
    return new MemoryCache();
  }
}

class ResilientCache implements CacheStorage {
  private readonly memory = new MemoryCache();

  constructor(private readonly persistent: CacheStorage) {}

  async get(key: string) {
    try {
      const value = await this.persistent.get(key);
      if (value !== undefined) return value;
    } catch {
      // Fall back to memory when persistent storage is unavailable.
    }
    return this.memory.get(key);
  }

  async put(
    key: string,
    value: { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry },
  ) {
    await this.memory.put(key, value);
    try {
      await this.persistent.put(key, value);
      return;
    } catch {
      // The memory copy remains available if persistent storage fails later.
    }
  }

  async delete(key: string) {
    await this.memory.delete(key);
    try {
      await this.persistent.delete(key);
    } catch {
      // Persistent storage may already be unavailable.
    }
  }

  async clear() {
    await this.memory.clear();
    try {
      await this.persistent.clear();
    } catch {
      // Persistent storage may already be unavailable.
    }
  }

  async list() {
    const entries = new Map<string, ModelCacheEntry>();
    for (const entry of await this.memory.list()) entries.set(entry.key, entry);
    try {
      for (const entry of await this.persistent.list())
        entries.set(entry.key, entry);
    } catch {
      // Return the memory entries when persistent storage is unavailable.
    }
    return [...entries.values()];
  }
}
