import type { ModelCacheEntry } from "../types";
import type { CacheStorage } from "./cache-storage";
import { MemoryCache } from "./memory-cache";

interface RecordValue { key: string; data: ArrayBuffer; entry: ModelCacheEntry; }

export class IndexedDbCache implements CacheStorage {
  private readonly database: Promise<IDBDatabase>;
  constructor(name = "pp-lcnet-doc-orientation") { this.database = new Promise((resolve, reject) => { const request = indexedDB.open(name, 1); request.onupgradeneeded = () => request.result.createObjectStore("models", { keyPath: "key" }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  async get(key: string) { const record = await this.request<RecordValue | undefined>("readonly", (store) => store.get(key)); return record === undefined ? undefined : { data: record.data, entry: record.entry }; }
  async put(key: string, value: { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry }) { await this.request("readwrite", (store) => store.put({ key, data: value.data, entry: value.entry } satisfies RecordValue)); }
  async delete(key: string) { await this.request("readwrite", (store) => store.delete(key)); }
  async clear() { await this.request("readwrite", (store) => store.clear()); }
  async list() { const records = await this.request<RecordValue[]>("readonly", (store) => store.getAll()); return records.map((record) => record.entry); }
  private request<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> { return this.database.then((database) => new Promise((resolve, reject) => { const request = action(database.transaction("models", mode).objectStore("models")); request.onsuccess = () => resolve(request.result as T); request.onerror = () => reject(request.error); })); }
}

export function createDefaultCache(): CacheStorage { return typeof indexedDB === "undefined" ? new MemoryCache() : new IndexedDbCache(); }
