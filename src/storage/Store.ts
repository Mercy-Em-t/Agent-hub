/**
 * Generic key/value store interface used by AgentRegistry, SiteRegistry and JobStore.
 *
 * Two implementations are provided:
 *   MemoryStore   – plain in-memory Map (default, used in tests and development)
 *   JsonFileStore – file-backed store that persists data across restarts (production)
 */
export interface Store<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  /** Return all stored values as an array. */
  values(): T[];
  size(): number;
}

/** Default in-memory implementation — no persistence. */
export class MemoryStore<T> implements Store<T> {
  private readonly map = new Map<string, T>();

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  set(key: string, value: T): void {
    this.map.set(key, value);
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  values(): T[] {
    return [...this.map.values()];
  }

  size(): number {
    return this.map.size;
  }
}
