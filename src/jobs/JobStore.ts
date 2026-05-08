import { v4 as uuidv4 } from 'uuid';
import { Store, MemoryStore } from '../storage/Store';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface JobRecord {
  /** Unique job identifier returned to the caller immediately. */
  jobId: string;
  /** The agent that submitted this job. */
  agentId: string;
  /** ISO timestamp when the job was created. */
  createdAt: string;
  /** ISO timestamp when the job finished (completed or failed). */
  finishedAt?: string;
  status: JobStatus;
  /** Step-by-step results populated once the job completes. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results?: Array<{ step: number; tool: string; result: Record<string, any> }>;
  /** Error message populated if the job fails. */
  error?: string;
  /**
   * Optional URL to POST results to when the job finishes.
   * When set, the hub delivers a webhook with the final job record
   * instead of requiring the caller to poll GET /agents/jobs/:jobId.
   */
  callbackUrl?: string;
}

/**
 * In-memory store for async agent job records.
 *
 * Jobs are submitted via `POST /agents/run/async` and polled via
 * `GET /agents/jobs/:jobId`.  The runner executes the task in the
 * background and calls `complete` or `fail` when done.
 */
export class JobStore {
  private readonly jobs: Store<JobRecord>;

  constructor(store?: Store<JobRecord>) {
    this.jobs = store ?? new MemoryStore<JobRecord>();
  }

  /** Create a new queued job record and return it. */
  create(agentId: string, callbackUrl?: string): JobRecord {
    const record: JobRecord = {
      jobId: uuidv4(),
      agentId,
      createdAt: new Date().toISOString(),
      status: 'queued',
      callbackUrl,
    };
    this.jobs.set(record.jobId, record);
    return record;
  }

  /** Transition a job to "running". */
  setRunning(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
      this.jobs.set(jobId, job);
    }
  }

  /** Mark a job as completed with its results. */
  complete(
    jobId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results: Array<{ step: number; tool: string; result: Record<string, any> }>,
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.results = results;
      job.finishedAt = new Date().toISOString();
      this.jobs.set(jobId, job);
    }
  }

  /** Mark a job as failed with an error message. */
  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.finishedAt = new Date().toISOString();
      this.jobs.set(jobId, job);
    }
  }

  /** Retrieve a job by ID. Returns `undefined` if not found. */
  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId);
  }

  /** List all jobs. */
  list(): JobRecord[] {
    return this.jobs.values();
  }
}
