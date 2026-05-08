import { openDatabase, SqliteStore } from '../../src/storage/SqliteStore';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface Item {
  id: string;
  value: number;
}

function tmpDbPath(): string {
  return path.join(os.tmpdir(), `agent-hub-test-${Date.now()}-${Math.random()}.db`);
}

describe('SqliteStore', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = tmpDbPath();
  });

  afterEach(() => {
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + '-wal'); } catch { /* ignore */ }
    try { fs.unlinkSync(dbPath + '-shm'); } catch { /* ignore */ }
  });

  it('stores and retrieves a value', () => {
    const db = openDatabase(dbPath);
    const store = new SqliteStore<Item>(db, 'items');
    store.set('k1', { id: 'k1', value: 42 });
    expect(store.get('k1')).toEqual({ id: 'k1', value: 42 });
    db.close();
  });

  it('returns undefined for missing keys', () => {
    const db = openDatabase(dbPath);
    const store = new SqliteStore<Item>(db, 'items');
    expect(store.get('missing')).toBeUndefined();
    db.close();
  });

  it('updates an existing key', () => {
    const db = openDatabase(dbPath);
    const store = new SqliteStore<Item>(db, 'items');
    store.set('k1', { id: 'k1', value: 1 });
    store.set('k1', { id: 'k1', value: 99 });
    expect(store.get('k1')!.value).toBe(99);
    db.close();
  });

  it('deletes a key', () => {
    const db = openDatabase(dbPath);
    const store = new SqliteStore<Item>(db, 'items');
    store.set('k1', { id: 'k1', value: 1 });
    store.delete('k1');
    expect(store.get('k1')).toBeUndefined();
    db.close();
  });

  it('lists all values', () => {
    const db = openDatabase(dbPath);
    const store = new SqliteStore<Item>(db, 'items');
    store.set('a', { id: 'a', value: 1 });
    store.set('b', { id: 'b', value: 2 });
    const vals = store.values();
    expect(vals).toHaveLength(2);
    expect(vals.map((v) => v.id).sort()).toEqual(['a', 'b']);
    db.close();
  });

  it('reports correct size', () => {
    const db = openDatabase(dbPath);
    const store = new SqliteStore<Item>(db, 'items');
    expect(store.size()).toBe(0);
    store.set('a', { id: 'a', value: 1 });
    expect(store.size()).toBe(1);
    db.close();
  });

  it('persists across database reopens', () => {
    const db1 = openDatabase(dbPath);
    const store1 = new SqliteStore<Item>(db1, 'items');
    store1.set('k1', { id: 'k1', value: 7 });
    db1.close();

    const db2 = openDatabase(dbPath);
    const store2 = new SqliteStore<Item>(db2, 'items');
    expect(store2.get('k1')).toEqual({ id: 'k1', value: 7 });
    db2.close();
  });

  it('isolates different table names', () => {
    const db = openDatabase(dbPath);
    const storeA = new SqliteStore<Item>(db, 'tableA');
    const storeB = new SqliteStore<Item>(db, 'tableB');
    storeA.set('shared', { id: 'shared', value: 1 });
    expect(storeB.get('shared')).toBeUndefined();
    db.close();
  });

  it('rejects invalid table names', () => {
    const db = openDatabase(dbPath);
    expect(() => new SqliteStore(db, 'bad-name')).toThrow();
    expect(() => new SqliteStore(db, 'bad name')).toThrow();
    db.close();
  });
});
