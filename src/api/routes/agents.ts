import { Router, Request, Response } from 'express';
import * as http from 'http';
import * as https from 'https';
import { z } from 'zod';
import { SessionManager } from '../../sessions/SessionManager';
import { WebAgent } from '../../agents/WebAgent';
import { AgentGateway } from '../../gateway/AgentGateway';
import { JobStore } from '../../jobs/JobStore';
import { AuditLog } from '../../audit/AuditLog';
import { RateLimiter } from '../middleware/rateLimiter';

// ── Pagination helper ─────────────────────────────────────────────────────────

function parsePagination(query: Record<string, unknown>): { limit: number; offset: number } {
  const limit  = Math.max(1, Math.min(1000, parseInt(String(query.limit  ?? '100'), 10) || 100));
  const offset = Math.max(0, parseInt(String(query.offset ?? '0'),   10) || 0);
  return { limit, offset };
}

function paginate<T>(items: T[], limit: number, offset: number) {
  return {
    total: items.length,
    limit,
    offset,
    items: items.slice(offset, offset + limit),
  };
}

// ── Webhook delivery ──────────────────────────────────────────────────────────

function deliverWebhook(url: string, payload: unknown): void {
  try {
    const parsedUrl = new URL(url);
    const body = Buffer.from(JSON.stringify(payload));
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          'User-Agent': 'AgentHub-Webhook/0.1',
        },
      },
      (res) => {
        // Drain the response to free the socket
        res.resume();
      },
    );

    req.on('error', (err) => {
      console.error('[webhook] delivery failed:', err.message);
    });

    req.write(body);
    req.end();
  } catch (err) {
    console.error('[webhook] invalid callbackUrl:', (err as Error).message);
  }
}

export function agentRouter(
  sessions: SessionManager,
  gateway: AgentGateway,
  jobStore: JobStore,
  auditLog?: AuditLog,
  rateLimiter?: RateLimiter,
): Router {
  const router = Router();

  // ------------------------------------------------------------------ POST /agents/run
  // Kick off a new WebAgent task and return the results synchronously.
  // The request must include agentId + apiKey — no anonymous agent runs.
  // ------------------------------------------------------------------
  const StepSchema = z.object({
    tool: z.string().min(1),
    input: z.record(z.unknown()),
    retries: z.number().int().min(0).max(10).optional(),
    retryDelayMs: z.number().int().min(0).max(30_000).optional(),
    onFail: z.enum(['abort', 'skip']).optional(),
  });

  const RunTaskSchema = z.object({
    /** Registered agent ID — must be approved in the AgentRegistry. */
    agentId: z.string().uuid('agentId must be a valid UUID'),
    /** API key issued when the agent was registered. */
    apiKey: z.string().min(1, 'apiKey is required'),
    startUrl: z.string().url(),
    steps: z.array(StepSchema).default([]),
    metadata: z.record(z.unknown()).optional(),
  });

  const AsyncRunTaskSchema = RunTaskSchema.extend({
    /**
     * Optional URL to POST the completed job record to when the task finishes.
     * When provided, Agent-hub delivers a webhook instead of requiring polling.
     */
    callbackUrl: z.string().url().optional(),
  });

  const limiterMw = rateLimiter?.middleware ?? ((_req: Request, _res: Response, next: () => void) => next());

  router.post('/run', limiterMw, async (req: Request, res: Response) => {
    const parsed = RunTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { agentId, apiKey, startUrl, steps, metadata } = parsed.data;

    // ── Gateway check ─────────────────────────────────────────────────────
    const intendedTools = steps.map((s) => s.tool);
    const gatewayResult = gateway.check(agentId, apiKey, startUrl, intendedTools);

    if (!gatewayResult.allowed) {
      auditLog?.append({
        agentId,
        domain: (() => { try { return new URL(startUrl).hostname; } catch { return startUrl; } })(),
        startUrl,
        tools: intendedTools,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        outcome: 'denied',
        error: gatewayResult.reason,
      });
      res.status(403).json({
        error: 'Gateway denied the request.',
        reason: gatewayResult.reason,
      });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    const domain = (() => { try { return new URL(startUrl).hostname; } catch { return startUrl; } })();
    const auditId = auditLog?.append({
      agentId,
      domain,
      startUrl,
      tools: intendedTools,
      startedAt: new Date().toISOString(),
      outcome: 'completed',
    })?.id;

    let sessionId: string | undefined;

    try {
      const session = await sessions.create(agentId);
      sessionId = session.id;
      sessions.setRunning(sessionId);

      const page = await sessions.newPage(sessionId);
      const agent = new WebAgent(
        {
          agentId,
          sessionId,
          metadata: metadata ?? {},
          registration: gatewayResult.agent,
        },
        { startUrl, steps: steps as Array<{ tool: string; input: Record<string, unknown> }> },
      );

      await agent.run(page);
      sessions.setCompleted(sessionId);

      if (auditId) auditLog?.finalize(auditId, 'completed', new Date().toISOString());

      res.json({
        agentId,
        sessionId,
        status: 'completed',
        results: agent.results,
      });
    } catch (err) {
      if (sessionId) {
        sessions.setError(sessionId, (err as Error).message);
      }
      if (auditId) auditLog?.finalize(auditId, 'failed', new Date().toISOString(), (err as Error).message);
      res.status(500).json({ error: (err as Error).message });
    } finally {
      if (sessionId) {
        await sessions.close(sessionId);
      }
      rateLimiter?.release(agentId);
    }
  });

  // ------------------------------------------------------------------ POST /agents/run/async
  // Submit a task for async execution.  Returns a jobId immediately.
  // The caller polls GET /agents/jobs/:jobId for status and results,
  // OR supplies callbackUrl to receive a webhook when the task finishes.
  // ------------------------------------------------------------------
  router.post('/run/async', limiterMw, async (req: Request, res: Response) => {
    const parsed = AsyncRunTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { agentId, apiKey, startUrl, steps, metadata, callbackUrl } = parsed.data;

    // ── Gateway check ─────────────────────────────────────────────────────
    const intendedTools = steps.map((s) => s.tool);
    const gatewayResult = gateway.check(agentId, apiKey, startUrl, intendedTools);

    if (!gatewayResult.allowed) {
      auditLog?.append({
        agentId,
        domain: (() => { try { return new URL(startUrl).hostname; } catch { return startUrl; } })(),
        startUrl,
        tools: intendedTools,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        outcome: 'denied',
        error: gatewayResult.reason,
      });
      res.status(403).json({
        error: 'Gateway denied the request.',
        reason: gatewayResult.reason,
      });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    const job = jobStore.create(agentId, callbackUrl);
    res.status(202).json({ jobId: job.jobId, status: 'queued' });

    const domain = (() => { try { return new URL(startUrl).hostname; } catch { return startUrl; } })();
    const auditId = auditLog?.append({
      agentId,
      domain,
      startUrl,
      tools: intendedTools,
      startedAt: new Date().toISOString(),
      outcome: 'completed',
      jobId: job.jobId,
    })?.id;

    // Run in the background — do not await
    (async () => {
      let sessionId: string | undefined;
      jobStore.setRunning(job.jobId);
      try {
        const session = await sessions.create(agentId);
        sessionId = session.id;
        sessions.setRunning(sessionId);

        const page = await sessions.newPage(sessionId);
        const agent = new WebAgent(
          {
            agentId,
            sessionId,
            metadata: metadata ?? {},
            registration: gatewayResult.agent,
          },
          {
            startUrl,
            steps: steps as Array<{ tool: string; input: Record<string, unknown> }>,
          },
        );

        await agent.run(page);
        sessions.setCompleted(sessionId);
        jobStore.complete(job.jobId, agent.results);
        if (auditId) auditLog?.finalize(auditId, 'completed', new Date().toISOString());

        if (callbackUrl) {
          const finishedJob = jobStore.get(job.jobId);
          deliverWebhook(callbackUrl, finishedJob);
        }
      } catch (err) {
        if (sessionId) {
          sessions.setError(sessionId, (err as Error).message);
        }
        const errMsg = (err as Error).message;
        jobStore.fail(job.jobId, errMsg);
        if (auditId) auditLog?.finalize(auditId, 'failed', new Date().toISOString(), errMsg);

        if (callbackUrl) {
          const finishedJob = jobStore.get(job.jobId);
          deliverWebhook(callbackUrl, finishedJob);
        }
      } finally {
        if (sessionId) {
          await sessions.close(sessionId);
        }
        rateLimiter?.release(agentId);
      }
    })();
  });

  // ------------------------------------------------------------------ GET /agents/jobs/:jobId
  // Poll for the status and results of an async job.
  // ------------------------------------------------------------------
  router.get('/jobs/:jobId', (req: Request, res: Response) => {
    const job = jobStore.get(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: `Job "${req.params.jobId}" not found.` });
      return;
    }
    res.json(job);
  });

  // ------------------------------------------------------------------ GET /agents/jobs
  // List all submitted jobs, with optional pagination.
  // ------------------------------------------------------------------
  router.get('/jobs', (req: Request, res: Response) => {
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const all = jobStore.list();
    const page = paginate(all, limit, offset);
    res.json({ jobs: page.items, total: page.total, limit: page.limit, offset: page.offset });
  });

  // ------------------------------------------------------------------ GET /agents/sessions
  // List active sessions.
  // ------------------------------------------------------------------
  router.get('/sessions', (_req: Request, res: Response) => {
    res.json({ sessions: sessions.list() });
  });

  // ------------------------------------------------------------------ GET /agents/audit
  // Audit log — records of every task run attempt.
  // ------------------------------------------------------------------
  router.get('/audit', (req: Request, res: Response) => {
    if (!auditLog) {
      res.json({ entries: [], total: 0, limit: 100, offset: 0 });
      return;
    }
    const q = req.query as Record<string, string>;
    const { limit, offset } = parsePagination(q);
    const result = auditLog.list({
      agentId: q.agentId,
      domain: q.domain,
      outcome: q.outcome as 'completed' | 'failed' | 'denied' | undefined,
      since: q.since,
      until: q.until,
      limit,
      offset,
    });
    res.json(result);
  });

  return router;
}
