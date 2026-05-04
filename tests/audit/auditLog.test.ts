import { AuditLog } from '../../src/audit/AuditLog';

describe('AuditLog', () => {
  function buildLog() {
    return new AuditLog();
  }

  it('appends entries with auto-generated ids', () => {
    const log = buildLog();
    const e = log.append({
      agentId: 'a1',
      domain: 'example.com',
      startUrl: 'https://example.com',
      tools: ['navigate', 'click'],
      startedAt: new Date().toISOString(),
      outcome: 'completed',
    });
    expect(e.id).toBeDefined();
    expect(e.agentId).toBe('a1');
  });

  it('finalizes an entry', () => {
    const log = buildLog();
    const e = log.append({
      agentId: 'a1',
      domain: 'example.com',
      startUrl: 'https://example.com',
      tools: [],
      startedAt: new Date().toISOString(),
      outcome: 'completed',
    });
    const now = new Date().toISOString();
    log.finalize(e.id, 'failed', now, 'oops');
    const updated = log.get(e.id)!;
    expect(updated.outcome).toBe('failed');
    expect(updated.finishedAt).toBe(now);
    expect(updated.error).toBe('oops');
  });

  it('lists all entries', () => {
    const log = buildLog();
    log.append({ agentId: 'a1', domain: 'd1', startUrl: 'https://d1', tools: [], startedAt: new Date().toISOString(), outcome: 'completed' });
    log.append({ agentId: 'a2', domain: 'd2', startUrl: 'https://d2', tools: [], startedAt: new Date().toISOString(), outcome: 'failed' });
    const result = log.list();
    expect(result.total).toBe(2);
    expect(result.entries).toHaveLength(2);
  });

  it('filters by agentId', () => {
    const log = buildLog();
    log.append({ agentId: 'a1', domain: 'd', startUrl: 'https://d', tools: [], startedAt: new Date().toISOString(), outcome: 'completed' });
    log.append({ agentId: 'a2', domain: 'd', startUrl: 'https://d', tools: [], startedAt: new Date().toISOString(), outcome: 'completed' });
    const result = log.list({ agentId: 'a1' });
    expect(result.total).toBe(1);
    expect(result.entries[0].agentId).toBe('a1');
  });

  it('filters by outcome', () => {
    const log = buildLog();
    log.append({ agentId: 'a', domain: 'd', startUrl: 'https://d', tools: [], startedAt: new Date().toISOString(), outcome: 'completed' });
    log.append({ agentId: 'a', domain: 'd', startUrl: 'https://d', tools: [], startedAt: new Date().toISOString(), outcome: 'denied' });
    expect(log.list({ outcome: 'denied' }).total).toBe(1);
    expect(log.list({ outcome: 'completed' }).total).toBe(1);
  });

  it('paginates', () => {
    const log = buildLog();
    for (let i = 0; i < 10; i++) {
      log.append({ agentId: 'a', domain: 'd', startUrl: 'https://d', tools: [], startedAt: new Date().toISOString(), outcome: 'completed' });
    }
    const page1 = log.list({ limit: 3, offset: 0 });
    expect(page1.entries).toHaveLength(3);
    expect(page1.total).toBe(10);

    const page2 = log.list({ limit: 3, offset: 3 });
    expect(page2.entries).toHaveLength(3);
    expect(page2.offset).toBe(3);
  });

  it('filters by since / until', () => {
    const log = buildLog();
    const t1 = '2025-01-01T00:00:00Z';
    const t2 = '2025-06-01T00:00:00Z';
    const t3 = '2025-12-01T00:00:00Z';
    log.append({ agentId: 'a', domain: 'd', startUrl: 'https://d', tools: [], startedAt: t1, outcome: 'completed' });
    log.append({ agentId: 'a', domain: 'd', startUrl: 'https://d', tools: [], startedAt: t2, outcome: 'completed' });
    log.append({ agentId: 'a', domain: 'd', startUrl: 'https://d', tools: [], startedAt: t3, outcome: 'completed' });
    expect(log.list({ since: t2 }).total).toBe(2);
    expect(log.list({ until: t2 }).total).toBe(2);
    expect(log.list({ since: t2, until: t2 }).total).toBe(1);
  });
});
