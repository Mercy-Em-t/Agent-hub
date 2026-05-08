/**
 * Tests for JsonFileStore — the file-backed persistence adapter.
 * Covers read/write, reload from disk, and the dateReviver helper.
 */
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { JsonFileStore, dateReviver } from '../../src/storage/JsonFileStore';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { SiteRegistry } from '../../src/registry/SiteRegistry';
import { JobStore } from '../../src/jobs/JobStore';
import type { AgentRegistration } from '../../src/registry/AgentRegistry';
import type { SiteRegistration } from '../../src/registry/SiteRegistry';
import type { JobRecord } from '../../src/jobs/JobStore';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'agent-hub-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ── JsonFileStore core behaviour ─────────────────────────────────────────────

describe('JsonFileStore — basic CRUD', () => {
  it('starts empty when file does not exist', () => {
    const store = new JsonFileStore<string>(join(tmpDir, 'missing.json'));
    expect(store.values()).toEqual([]);
    expect(store.size()).toBe(0);
  });

  it('set and get round-trips correctly', () => {
    const store = new JsonFileStore<string>(join(tmpDir, 'kv.json'));
    store.set('k1', 'hello');
    expect(store.get('k1')).toBe('hello');
  });

  it('returns undefined for unknown key', () => {
    const store = new JsonFileStore<string>(join(tmpDir, 'kv.json'));
    expect(store.get('nope')).toBeUndefined();
  });

  it('delete removes the entry', () => {
    const store = new JsonFileStore<string>(join(tmpDir, 'kv.json'));
    store.set('k1', 'hello');
    store.delete('k1');
    expect(store.get('k1')).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('values() returns all stored values', () => {
    const store = new JsonFileStore<number>(join(tmpDir, 'nums.json'));
    store.set('a', 1);
    store.set('b', 2);
    store.set('c', 3);
    expect(store.values().sort()).toEqual([1, 2, 3]);
  });

  it('size() reflects the number of entries', () => {
    const store = new JsonFileStore<string>(join(tmpDir, 'sz.json'));
    expect(store.size()).toBe(0);
    store.set('x', 'val');
    expect(store.size()).toBe(1);
    store.set('y', 'val2');
    expect(store.size()).toBe(2);
    store.delete('x');
    expect(store.size()).toBe(1);
  });
});

describe('JsonFileStore — persistence (reload)', () => {
  it('persists data to disk and reloads on new instance', () => {
    const filePath = join(tmpDir, 'persist.json');
    const store1 = new JsonFileStore<string>(filePath);
    store1.set('k1', 'v1');
    store1.set('k2', 'v2');

    // New instance reads from the same file
    const store2 = new JsonFileStore<string>(filePath);
    expect(store2.get('k1')).toBe('v1');
    expect(store2.get('k2')).toBe('v2');
    expect(store2.size()).toBe(2);
  });

  it('persists deletes across reloads', () => {
    const filePath = join(tmpDir, 'del.json');
    const store1 = new JsonFileStore<string>(filePath);
    store1.set('k1', 'v1');
    store1.set('k2', 'v2');
    store1.delete('k1');

    const store2 = new JsonFileStore<string>(filePath);
    expect(store2.get('k1')).toBeUndefined();
    expect(store2.get('k2')).toBe('v2');
  });

  it('writes valid JSON to disk', () => {
    const filePath = join(tmpDir, 'valid.json');
    const store = new JsonFileStore<number>(filePath);
    store.set('x', 42);
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ x: 42 });
  });

  it('creates parent directories automatically', () => {
    const filePath = join(tmpDir, 'deep', 'nested', 'dir', 'store.json');
    const store = new JsonFileStore<string>(filePath);
    store.set('k', 'v');

    const store2 = new JsonFileStore<string>(filePath);
    expect(store2.get('k')).toBe('v');
  });
});

// ── dateReviver helper ───────────────────────────────────────────────────────

describe('dateReviver', () => {
  it('converts an ISO date string to a Date object', () => {
    const result = dateReviver('anyKey', '2024-06-15T10:30:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getFullYear()).toBe(2024);
  });

  it('leaves non-date strings unchanged', () => {
    expect(dateReviver('k', 'hello world')).toBe('hello world');
    expect(dateReviver('k', 'not-a-date')).toBe('not-a-date');
  });

  it('leaves numbers unchanged', () => {
    expect(dateReviver('k', 42)).toBe(42);
  });

  it('leaves null unchanged', () => {
    expect(dateReviver('k', null)).toBeNull();
  });

  it('leaves plain objects unchanged', () => {
    const obj = { a: 1 };
    expect(dateReviver('k', obj)).toBe(obj);
  });

  it('converts registeredAt back to Date when used in JSON.parse', () => {
    const original = { registeredAt: '2024-01-01T00:00:00.000Z', name: 'test' };
    const parsed = JSON.parse(JSON.stringify(original), dateReviver);
    expect(parsed.registeredAt).toBeInstanceOf(Date);
    expect(parsed.name).toBe('test');
  });
});

// ── AgentRegistry with JsonFileStore ────────────────────────────────────────

describe('AgentRegistry with JsonFileStore (end-to-end persistence)', () => {
  function filePath() {
    return join(tmpDir, 'agents.json');
  }

  function makeRegistry() {
    return new AgentRegistry(
      new JsonFileStore<AgentRegistration>(filePath(), dateReviver),
    );
  }

  it('registers an agent and reloads it from disk', () => {
    const reg1 = makeRegistry();
    const agent = reg1.register({
      name: 'PersistBot',
      description: 'D',
      owner: 'O',
      contactEmail: 'o@o.com',
      purpose: 'P',
      allowedDomains: [],
      deniedDomains: [],
      allowedTools: [],
      constraints: [],
    });

    const reg2 = makeRegistry();
    const loaded = reg2.get(agent.agentId);
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('PersistBot');
    expect(loaded!.status).toBe('pending');
    expect(loaded!.registeredAt).toBeInstanceOf(Date);
  });

  it('persists approve() across restarts', () => {
    const reg1 = makeRegistry();
    const agent = reg1.register({
      name: 'ApproveBot',
      description: 'D',
      owner: 'O',
      contactEmail: 'o@o.com',
      purpose: 'P',
      allowedDomains: [],
      deniedDomains: [],
      allowedTools: [],
      constraints: [],
    });
    reg1.approve(agent.agentId);

    const reg2 = makeRegistry();
    const loaded = reg2.get(agent.agentId)!;
    expect(loaded.status).toBe('approved');
    expect(loaded.approvedAt).toBeInstanceOf(Date);
  });

  it('persists revoke() across restarts', () => {
    const reg1 = makeRegistry();
    const agent = reg1.register({
      name: 'RevokeBot',
      description: 'D',
      owner: 'O',
      contactEmail: 'o@o.com',
      purpose: 'P',
      allowedDomains: [],
      deniedDomains: [],
      allowedTools: [],
      constraints: [],
    });
    reg1.approve(agent.agentId);
    reg1.revoke(agent.agentId);

    const reg2 = makeRegistry();
    const loaded = reg2.get(agent.agentId)!;
    expect(loaded.status).toBe('revoked');
    expect(loaded.revokedAt).toBeInstanceOf(Date);
  });
});

// ── SiteRegistry with JsonFileStore ─────────────────────────────────────────

describe('SiteRegistry with JsonFileStore (end-to-end persistence)', () => {
  function filePath() {
    return join(tmpDir, 'sites.json');
  }

  function makeRegistry() {
    return new SiteRegistry(
      new JsonFileStore<SiteRegistration>(filePath(), dateReviver),
    );
  }

  it('registers a site and reloads it from disk', () => {
    const reg1 = makeRegistry();
    const site = reg1.register({
      domain: 'persist.com',
      ownerName: 'PersistCo',
      contactEmail: 'admin@persist.com',
      description: 'Test',
      allowedCapabilities: [],
    });

    const reg2 = makeRegistry();
    const loaded = reg2.get(site.siteId);
    expect(loaded).toBeDefined();
    expect(loaded!.domain).toBe('persist.com');
    expect(loaded!.registeredAt).toBeInstanceOf(Date);
  });

  it('persists approve() across restarts', () => {
    const reg1 = makeRegistry();
    const site = reg1.register({
      domain: 'approved.com',
      ownerName: 'AC',
      contactEmail: 'a@approved.com',
      description: 'A',
      allowedCapabilities: [],
    });
    reg1.approve(site.siteId);

    const reg2 = makeRegistry();
    expect(reg2.get(site.siteId)!.status).toBe('approved');
  });
});

// ── JobStore with JsonFileStore ──────────────────────────────────────────────

describe('JobStore with JsonFileStore (end-to-end persistence)', () => {
  function filePath() {
    return join(tmpDir, 'jobs.json');
  }

  function makeStore() {
    return new JobStore(new JsonFileStore<JobRecord>(filePath()));
  }

  it('creates a job and reloads it from disk', () => {
    const store1 = makeStore();
    const job = store1.create('agent-123');

    const store2 = makeStore();
    const loaded = store2.get(job.jobId);
    expect(loaded).toBeDefined();
    expect(loaded!.agentId).toBe('agent-123');
    expect(loaded!.status).toBe('queued');
  });

  it('persists complete() across restarts', () => {
    const store1 = makeStore();
    const job = store1.create('agent-456');
    store1.complete(job.jobId, [{ step: 1, tool: 'navigate', result: { url: 'https://x.com' } }]);

    const store2 = makeStore();
    const loaded = store2.get(job.jobId)!;
    expect(loaded.status).toBe('completed');
    expect(loaded.results).toHaveLength(1);
    expect(loaded.finishedAt).toBeDefined();
  });

  it('persists fail() across restarts', () => {
    const store1 = makeStore();
    const job = store1.create('agent-789');
    store1.fail(job.jobId, 'Something went wrong');

    const store2 = makeStore();
    const loaded = store2.get(job.jobId)!;
    expect(loaded.status).toBe('failed');
    expect(loaded.error).toBe('Something went wrong');
  });
});
