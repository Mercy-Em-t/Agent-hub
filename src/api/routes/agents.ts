import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SessionManager } from '../../sessions/SessionManager';
import { WebAgent } from '../../agents/WebAgent';
import { AgentGateway } from '../../gateway/AgentGateway';

export function agentRouter(sessions: SessionManager, gateway: AgentGateway): Router {
  const router = Router();

  // ------------------------------------------------------------------ POST /agents/run
  // Kick off a new WebAgent task and return the results synchronously.
  // The request must include agentId + apiKey — no anonymous agent runs.
  // ------------------------------------------------------------------
  const RunTaskSchema = z.object({
    /** Registered agent ID — must be approved in the AgentRegistry. */
    agentId: z.string().uuid('agentId must be a valid UUID'),
    /** API key issued when the agent was registered. */
    apiKey: z.string().min(1, 'apiKey is required'),
    startUrl: z.string().url(),
    steps: z
      .array(
        z.object({
          tool: z.string().min(1),
          input: z.record(z.unknown()),
        }),
      )
      .default([]),
    metadata: z.record(z.unknown()).optional(),
  });

  router.post('/run', async (req: Request, res: Response) => {
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
      res.status(403).json({
        error: 'Gateway denied the request.',
        reason: gatewayResult.reason,
      });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

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
      res.status(500).json({ error: (err as Error).message });
    } finally {
      if (sessionId) {
        await sessions.close(sessionId);
      }
    }
  });

  // ------------------------------------------------------------------ GET /agents/sessions
  // List active sessions.
  // ------------------------------------------------------------------
  router.get('/sessions', (_req: Request, res: Response) => {
    res.json({ sessions: sessions.list() });
  });

  return router;
}

