import { v4 as uuidv4 } from 'uuid';
import { Store, MemoryStore } from '../storage/Store';

/** Outcome of a task run recorded in the audit log. */
export type AuditOutcome = 'completed' | 'failed' | 'denied';

/**
 * A single immutable audit record created for every task run attempt
 * (both sync POST /agents/run and async POST /agents/run/async).
 *
 * Provides governance, debugging, and compliance traceability:
 * who did what, against which site, with what tools, and what happened.
 */
export interface AuditEntry {
  /** Unique record ID */
  id: string;
  /** The agent that ran the task */
  agentId: string;
  /** Target hostname (e.g. "example.com") */
  domain: string;
  /** Starting URL */
  startUrl: string;
  /** Tool names invoked (or intended, for denied requests) */
  tools: string[];
  /** ISO timestamp when the task was initiated */
  startedAt: string;
  /** ISO timestamp when the task finished (undefined if still running) */
  finishedAt?: string;
  /** Final outcome */
  outcome: AuditOutcome;
  /** Job ID for async tasks */
  jobId?: string;
  /** Session ID */
  sessionId?: string;
  /** Error message for failed or denied tasks */
  error?: string;
}

/** Filters accepted by AuditLog.list() */
export interface AuditFilter {
  agentId?: string;
  domain?: string;
  outcome?: AuditOutcome;
  /** ISO date string — only entries at or after this timestamp */
  since?: string;
  /** ISO date string — only entries at or before this timestamp */
  until?: string;
  limit?: number;
  offset?: number;
}

/**
 * Append-only audit log for all task run attempts.
 * Backed by the same generic Store<T> interface used elsewhere in Agent-hub.
 */
export class AuditLog {
  private readonly entries: Store<AuditEntry>;

  constructor(store?: Store<AuditEntry>) {
    this.entries = store ?? new MemoryStore<AuditEntry>();
  }

  /** Append a new entry and return it. */
  append(entry: Omit<AuditEntry, 'id'>): AuditEntry {
    const record: AuditEntry = { ...entry, id: uuidv4() };
    this.entries.set(record.id, record);
    return record;
  }

  /** Update finishedAt and outcome on an existing entry (called when task completes). */
  finalize(
    id: string,
    outcome: AuditOutcome,
    finishedAt: string,
    error?: string,
  ): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.outcome = outcome;
      entry.finishedAt = finishedAt;
      if (error !== undefined) entry.error = error;
      this.entries.set(id, entry);
    }
  }

  /** Retrieve a single entry by ID. */
  get(id: string): AuditEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * List entries, optionally filtered.
   * Returns { entries, total, limit, offset }.
   */
  list(filter: AuditFilter = {}): {
    entries: AuditEntry[];
    total: number;
    limit: number;
    offset: number;
  } {
    let results = this.entries.values();

    if (filter.agentId) {
      results = results.filter((e) => e.agentId === filter.agentId);
    }
    if (filter.domain) {
      results = results.filter((e) => e.domain === filter.domain);
    }
    if (filter.outcome) {
      results = results.filter((e) => e.outcome === filter.outcome);
    }
    if (filter.since) {
      const since = filter.since;
      results = results.filter((e) => e.startedAt >= since);
    }
    if (filter.until) {
      const until = filter.until;
      results = results.filter((e) => e.startedAt <= until);
    }

    // Sort newest-first
    results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));

    const total = results.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    return {
      entries: results.slice(offset, offset + limit),
      total,
      limit,
      offset,
    };
  }
}
