import { Request, Response, NextFunction } from 'express';

/**
 * Simple per-agent sliding-window rate limiter.
 *
 * Tracks two limits per agentId:
 *   1. maxPerMinute  – maximum task submissions in any 60-second window (default: 30)
 *   2. maxConcurrent – maximum simultaneous in-flight tasks (default: 3)
 *
 * The agentId is read from req.body.agentId (set by the JSON body parser before
 * this middleware runs).  Unknown / missing agentIds always pass through so that
 * upstream handlers can return their own 400/403 responses.
 *
 * Usage:
 *   const limiter = createRateLimiter();
 *   router.post('/run',       limiter, handler);
 *   router.post('/run/async', limiter, handler);
 *
 * Call limiter.release(agentId) after a concurrent slot is freed.
 */

interface AgentWindow {
  count: number;
  windowStart: number;
}

interface AgentConcurrency {
  active: number;
}

export interface RateLimiterOptions {
  /** Max task starts per agent per 60-second window. Default: 30 */
  maxPerMinute?: number;
  /** Max simultaneous in-flight tasks per agent. Default: 3 */
  maxConcurrent?: number;
}

export interface RateLimiter {
  /** Express middleware — call next() if within limits, 429 otherwise. */
  middleware: (req: Request, res: Response, next: NextFunction) => void;
  /** Decrement the concurrent-task counter for the given agent. */
  release(agentId: string): void;
  /** Expose current counters (used by tests and the health endpoint). */
  stats(agentId: string): { windowCount: number; active: number };
}

const WINDOW_MS = 60_000;

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const maxPerMinute = options.maxPerMinute ?? 30;
  const maxConcurrent = options.maxConcurrent ?? 3;

  const windows = new Map<string, AgentWindow>();
  const concurrency = new Map<string, AgentConcurrency>();

  function getWindow(agentId: string): AgentWindow {
    const now = Date.now();
    let w = windows.get(agentId);
    if (!w || now - w.windowStart >= WINDOW_MS) {
      w = { count: 0, windowStart: now };
      windows.set(agentId, w);
    }
    return w;
  }

  function getConcurrency(agentId: string): AgentConcurrency {
    let c = concurrency.get(agentId);
    if (!c) {
      c = { active: 0 };
      concurrency.set(agentId, c);
    }
    return c;
  }

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentId = (req.body as any)?.agentId as string | undefined;
    if (!agentId || typeof agentId !== 'string') {
      // No agentId — pass through; upstream validation will handle it
      next();
      return;
    }

    const w = getWindow(agentId);
    if (w.count >= maxPerMinute) {
      const retryAfterSec = Math.ceil((WINDOW_MS - (Date.now() - w.windowStart)) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Rate limit exceeded.',
        reason: `This agent may submit at most ${maxPerMinute} tasks per minute. Retry after ${retryAfterSec}s.`,
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    const c = getConcurrency(agentId);
    if (c.active >= maxConcurrent) {
      res.status(429).json({
        error: 'Too many concurrent tasks.',
        reason: `This agent may run at most ${maxConcurrent} tasks concurrently. Wait for a running task to finish.`,
      });
      return;
    }

    // Reserve slots
    w.count += 1;
    c.active += 1;

    next();
  };

  const release = (agentId: string): void => {
    const c = concurrency.get(agentId);
    if (c && c.active > 0) {
      c.active -= 1;
    }
  };

  const stats = (agentId: string) => ({
    windowCount: windows.get(agentId)?.count ?? 0,
    active: concurrency.get(agentId)?.active ?? 0,
  });

  return { middleware, release, stats };
}
