import type { ModelCacheEntry } from "../types";
import type { CacheStorage } from "./cache-storage";

export class MemoryCache implements CacheStorage {
  private readonly entries = new Map<string, { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry }>();
  async get(key: string) { const value = this.entries.get(key); return value === undefined ? undefined : { data: value.data.slice(0), entry: value.entry }; }
  async put(key: string, value: { readonly data: ArrayBuffer; readonly entry: ModelCacheEntry }) { this.entries.set(key, { data: value.data.slice(0), entry: value.entry }); }
  async delete(key: string) { this.entries.delete(key); }
  async clear() { this.entries.clear(); }
  async list() { return [...this.entries.values()].map((value) => value.entry); }
}
