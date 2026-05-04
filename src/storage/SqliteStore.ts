import Database from 'better-sqlite3';
import { Store } from './Store';

/**
 * File-backed store using SQLite (better-sqlite3).
 *
 * Implements the same generic Store<T> interface used by MemoryStore and
 * JsonFileStore — zero changes required in AgentRegistry, SiteRegistry or
 * JobStore to switch to this backend.
 *
 * Each logical store maps to one table in the SQLite database file, keeping
 * all Agent-hub data in a single file that can be backed up with a simple
 * file copy.
 *
 * Activate by setting SQLITE_FILE env var, e.g.:
 *   SQLITE_FILE=/var/agent-hub/hub.db npm start
 *
 * @param db     An open better-sqlite3 Database instance (shared across stores).
 * @param table  The table name for this store (e.g. "agents", "sites", "jobs").
 */
export class SqliteStore<T> implements Store<T> {
  private readonly db: Database.Database;
  private readonly table: string;

  constructor(db: Database.Database, table: string) {
    this.db = db;
    this.table = sanitizeIdentifier(table);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "${this.table}" (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )
    `);
  }

  get(key: string): T | undefined {
    const row = this.db
      .prepare<[string], { value: string }>(`SELECT value FROM "${this.table}" WHERE key = ?`)
      .get(key);
    return row ? (JSON.parse(row.value) as T) : undefined;
  }

  set(key: string, value: T): void {
    this.db
      .prepare(
        `INSERT INTO "${this.table}" (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, JSON.stringify(value));
  }

  delete(key: string): void {
    this.db.prepare(`DELETE FROM "${this.table}" WHERE key = ?`).run(key);
  }

  values(): T[] {
    const rows = this.db
      .prepare<[], { value: string }>(`SELECT value FROM "${this.table}"`)
      .all();
    return rows.map((r) => JSON.parse(r.value) as T);
  }

  size(): number {
    const row = this.db
      .prepare<[], { n: number }>(`SELECT COUNT(*) AS n FROM "${this.table}"`)
      .get();
    return row?.n ?? 0;
  }
}

/**
 * Open (or create) a SQLite database file and return it.
 * Call this once per process and share the instance across all SqliteStore objects.
 */
export function openDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  // WAL mode gives much better concurrent read performance
  db.pragma('journal_mode = WAL');
  return db;
}

/**
 * Prevent SQL-injection through table names by allowing only word characters.
 * This is a defence-in-depth measure since table names come from internal code,
 * not user input.
 */
function sanitizeIdentifier(name: string): string {
  if (!/^\w+$/.test(name)) {
    throw new Error(`Invalid SQLite table name: "${name}"`);
  }
  return name;
}
