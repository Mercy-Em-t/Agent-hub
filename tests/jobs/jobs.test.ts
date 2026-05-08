import { JobStore } from '../../src/jobs/JobStore';

describe('JobStore', () => {
  let store: JobStore;

  beforeEach(() => {
    store = new JobStore();
  });

  it('creates a job with status "queued"', () => {
    const job = store.create('agent-1');

    expect(job.jobId).toBeDefined();
    expect(job.agentId).toBe('agent-1');
    expect(job.status).toBe('queued');
    expect(job.createdAt).toBeDefined();
    expect(job.results).toBeUndefined();
    expect(job.error).toBeUndefined();
    expect(job.finishedAt).toBeUndefined();
  });

  it('retrieves a job by its ID', () => {
    const job = store.create('agent-2');
    const found = store.get(job.jobId);

    expect(found).toBeDefined();
    expect(found!.jobId).toBe(job.jobId);
  });

  it('returns undefined for an unknown job ID', () => {
    expect(store.get('non-existent-id')).toBeUndefined();
  });

  it('transitions a job to "running"', () => {
    const job = store.create('agent-3');
    store.setRunning(job.jobId);

    expect(store.get(job.jobId)!.status).toBe('running');
  });

  it('marks a job as "completed" with results', () => {
    const job = store.create('agent-4');
    const results = [{ step: 0, tool: 'navigate', result: { success: true } }];

    store.complete(job.jobId, results);

    const found = store.get(job.jobId)!;
    expect(found.status).toBe('completed');
    expect(found.results).toEqual(results);
    expect(found.finishedAt).toBeDefined();
    expect(found.error).toBeUndefined();
  });

  it('marks a job as "failed" with an error message', () => {
    const job = store.create('agent-5');

    store.fail(job.jobId, 'Something went wrong');

    const found = store.get(job.jobId)!;
    expect(found.status).toBe('failed');
    expect(found.error).toBe('Something went wrong');
    expect(found.finishedAt).toBeDefined();
    expect(found.results).toBeUndefined();
  });

  it('lists all jobs', () => {
    store.create('agent-a');
    store.create('agent-b');
    store.create('agent-c');

    expect(store.list()).toHaveLength(3);
  });

  it('generates unique IDs for each job', () => {
    const ids = Array.from({ length: 10 }, () => store.create('agent').jobId);
    const unique = new Set(ids);

    expect(unique.size).toBe(10);
  });

  it('is a no-op when setRunning / complete / fail is called with an unknown ID', () => {
    // Should not throw
    expect(() => store.setRunning('unknown')).not.toThrow();
    expect(() => store.complete('unknown', [])).not.toThrow();
    expect(() => store.fail('unknown', 'err')).not.toThrow();
  });
});
