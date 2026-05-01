import { v4 as uuidv4 } from 'uuid';

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
}

/**
 * In-memory store for async agent job records.
 *
 * Jobs are submitted via `POST /agents/run/async` and polled via
 * `GET /agents/jobs/:jobId`.  The runner executes the task in the
 * background and calls `complete` or `fail` when done.
 */
export class JobStore {
  private readonly jobs: Map<string, JobRecord> = new Map();

  /** Create a new queued job record and return it. */
  create(agentId: string): JobRecord {
    const record: JobRecord = {
      jobId: uuidv4(),
      agentId,
      createdAt: new Date().toISOString(),
      status: 'queued',
    };
    this.jobs.set(record.jobId, record);
    return record;
  }

  /** Transition a job to "running". */
  setRunning(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
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
    }
  }

  /** Mark a job as failed with an error message. */
  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.finishedAt = new Date().toISOString();
    }
  }

  /** Retrieve a job by ID. Returns `undefined` if not found. */
  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId);
  }

  /** List all jobs. */
  list(): JobRecord[] {
    return [...this.jobs.values()];
  }
}
