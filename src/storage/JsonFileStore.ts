import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { Store } from './Store';

/**
 * File-backed JSON store.  Reads from and writes to a single JSON file on disk,
 * so data survives server restarts.  All mutations are flushed synchronously
 * after each write to guarantee durability on every operation.
 *
 * Usage:
 *   const store = new JsonFileStore<AgentRegistration>(
 *     '/data/agents.json',
 *     dateReviver,   // optional JSON.parse reviver
 *   );
 *
 * Set DATA_DIR (or another path via the constructor) to enable persistence.
 * When the file does not yet exist, the store starts empty and creates the
 * file on the first write.
 */
export class JsonFileStore<T> implements Store<T> {
  private readonly map = new Map<string, T>();
  private readonly filePath: string;
  private readonly reviver?: (key: string, value: unknown) => unknown;

  constructor(filePath: string, reviver?: (key: string, value: unknown) => unknown) {
    this.filePath = filePath;
    this.reviver = reviver;
    this.load();
  }

  // ── Store interface ─────────────────────────────────────────────────────────

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  set(key: string, value: T): void {
    this.map.set(key, value);
    this.flush();
  }

  delete(key: string): void {
    this.map.delete(key);
    this.flush();
  }

  values(): T[] {
    return [...this.map.values()];
  }

  size(): number {
    return this.map.size;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw, this.reviver) as Record<string, T>;
      for (const [key, value] of Object.entries(data)) {
        this.map.set(key, value);
      }
    } catch (err) {
      console.error(`[JsonFileStore] Failed to load "${this.filePath}":`, err);
    }
  }

  private flush(): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true });
      const data: Record<string, T> = {};
      for (const [key, value] of this.map.entries()) {
        data[key] = value;
      }
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`[JsonFileStore] Failed to persist "${this.filePath}":`, err);
    }
  }
}

/**
 * JSON.parse reviver that converts ISO-8601 date strings (e.g. "2024-01-01T00:00:00.000Z")
 * back into JavaScript Date objects.  Safe to use for agent and site registrations
 * which store registeredAt / approvedAt / revokedAt as Date instances.
 */
export function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    // Guard against non-date strings that happen to look similar
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}
