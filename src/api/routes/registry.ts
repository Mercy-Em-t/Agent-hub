import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AgentRegistry } from '../../registry/AgentRegistry';
import { SiteRegistry } from '../../registry/SiteRegistry';
import type { IWhatsAppNotifier } from '../../notifications/WhatsAppNotifier';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const AgentRegisterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  owner: z.string().min(1),
  contactEmail: z.string().email(),
  purpose: z.string().min(1),
  /** High-level outcomes the agent is trying to achieve */
  goals: z.array(z.string()).default([]),
  /** Ordered SOP steps describing how the agent works */
  workingProcedure: z.array(z.string()).default([]),
  /** Explicit responsibility scope */
  responsibilityBounds: z
    .object({
      responsible: z.array(z.string()).default([]),
      notResponsible: z.array(z.string()).default([]),
    })
    .optional(),
  /** Primary home website URL */
  website: z.string().url('Must be a valid URL').optional(),
  allowedDomains: z.array(z.string()).default([]),
  deniedDomains: z.array(z.string()).default([]),
  allowedTools: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  /**
   * Owner's WhatsApp number in E.164 format (e.g. "+1234567890").
   * When provided, lifecycle notifications are sent to this number.
   */
  ownerPhone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Must be a valid E.164 phone number (e.g. "+1234567890")')
    .optional(),
});

const SiteRegisterSchema = z.object({
  domain: z
    .string()
    .min(1)
    .regex(
      /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/,
      'Must be a valid domain or wildcard domain (e.g. example.com or *.example.com)',
    ),
  ownerName: z.string().min(1),
  contactEmail: z.string().email(),
  description: z.string().min(1),
  allowedCapabilities: z.array(z.string()).default([]),
});

// ── Notification helpers ─────────────────────────────────────────────────────

function notifyOwner(
  notifier: IWhatsAppNotifier | undefined,
  phone: string | undefined,
  message: string,
): void {
  if (!notifier || !phone) return;
  notifier.send(phone, message).catch(() => {
    // Fire-and-forget: notification failures must not fail the API request
  });
}

// ── Router factory ───────────────────────────────────────────────────────────

export function registryRouter(
  agentRegistry: AgentRegistry,
  siteRegistry: SiteRegistry,
  notifier?: IWhatsAppNotifier,
): Router {
  const router = Router();

  // ──────────────────────────────────────────── Agent registration endpoints

  /**
   * POST /registry/agents
   * Register a new AI agent.  Returns the full registration including
   * the generated agentId and apiKey (store the apiKey — it is only shown once).
   * Status starts as "pending"; an operator must call PATCH …/approve to allow operation.
   *
   * New onboarding fields (all optional):
   *   goals             – what the agent is trying to achieve
   *   workingProcedure  – ordered steps of its operating procedure
   *   responsibilityBounds – what it IS and IS NOT responsible for
   *   website           – primary home URL
   *   ownerPhone        – E.164 WhatsApp number for lifecycle notifications
   */
  router.post('/agents', (req: Request, res: Response) => {
    const parsed = AgentRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const registration = agentRegistry.register(parsed.data);
      notifyOwner(
        notifier,
        registration.ownerPhone,
        `Agent-hub 🤖\nYour agent "${registration.name}" has been registered.\n` +
          `Status: PENDING – awaiting approval before it can operate.\n` +
          `Agent ID: ${registration.agentId.slice(0, 8)}…\n\n` +
          `Reply "approve ${registration.name}" to activate it, or "help" for all commands.`,
      );
      res.status(201).json(registration);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /registry/agents
   * List all registered agents (all statuses).
   */
  router.get('/agents', (_req: Request, res: Response) => {
    res.json({ agents: agentRegistry.list() });
  });

  /**
   * GET /registry/agents/:agentId
   * Retrieve a specific agent registration.
   */
  router.get('/agents/:agentId', (req: Request, res: Response) => {
    const agent = agentRegistry.get(req.params.agentId);
    if (!agent) {
      res.status(404).json({ error: `Agent "${req.params.agentId}" not found.` });
      return;
    }
    res.json(agent);
  });

  /**
   * PATCH /registry/agents/:agentId/approve
   * Approve a registered agent, granting it permission to operate.
   */
  router.patch('/agents/:agentId/approve', (req: Request, res: Response) => {
    try {
      const agent = agentRegistry.approve(req.params.agentId);
      notifyOwner(
        notifier,
        agent.ownerPhone,
        `Agent-hub ✅\nYour agent "${agent.name}" has been APPROVED and can now operate.`,
      );
      res.json(agent);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  /**
   * PATCH /registry/agents/:agentId/revoke
   * Revoke an agent, immediately blocking it from running any further tasks.
   */
  router.patch('/agents/:agentId/revoke', (req: Request, res: Response) => {
    try {
      const agent = agentRegistry.revoke(req.params.agentId);
      notifyOwner(
        notifier,
        agent.ownerPhone,
        `Agent-hub 🚫\nYour agent "${agent.name}" has been REVOKED and can no longer operate.`,
      );
      res.json(agent);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ──────────────────────────────────────────────── Site registration endpoints

  /**
   * POST /registry/sites
   * Register a website as a consenting participant in the Agent-hub ecosystem.
   * Returns the full registration including siteId and apiKey.
   * Status starts as "pending"; an operator must PATCH …/approve to open the site to agents.
   */
  router.post('/sites', (req: Request, res: Response) => {
    const parsed = SiteRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const registration = siteRegistry.register(parsed.data);
      res.status(201).json(registration);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /registry/sites
   * List all registered sites.
   */
  router.get('/sites', (_req: Request, res: Response) => {
    res.json({ sites: siteRegistry.list() });
  });

  /**
   * GET /registry/sites/:siteId
   * Retrieve a specific site registration.
   */
  router.get('/sites/:siteId', (req: Request, res: Response) => {
    const site = siteRegistry.get(req.params.siteId);
    if (!site) {
      res.status(404).json({ error: `Site "${req.params.siteId}" not found.` });
      return;
    }
    res.json(site);
  });

  /**
   * PATCH /registry/sites/:siteId/approve
   * Approve a registered site, allowing agents to visit it.
   */
  router.patch('/sites/:siteId/approve', (req: Request, res: Response) => {
    try {
      const site = siteRegistry.approve(req.params.siteId);
      res.json(site);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  /**
   * PATCH /registry/sites/:siteId/revoke
   * Revoke a site, immediately blocking agent access.
   */
  router.patch('/sites/:siteId/revoke', (req: Request, res: Response) => {
    try {
      const site = siteRegistry.revoke(req.params.siteId);
      res.json(site);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
