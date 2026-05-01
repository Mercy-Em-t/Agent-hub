import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AgentRegistry } from '../../registry/AgentRegistry';
import { SiteRegistry } from '../../registry/SiteRegistry';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const AgentRegisterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  owner: z.string().min(1),
  contactEmail: z.string().email(),
  purpose: z.string().min(1),
  allowedDomains: z.array(z.string()).default([]),
  deniedDomains: z.array(z.string()).default([]),
  allowedTools: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
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

// ── Router factory ───────────────────────────────────────────────────────────

export function registryRouter(
  agentRegistry: AgentRegistry,
  siteRegistry: SiteRegistry,
): Router {
  const router = Router();

  // ──────────────────────────────────────────── Agent registration endpoints

  /**
   * POST /registry/agents
   * Register a new AI agent.  Returns the full registration including
   * the generated agentId and apiKey (store the apiKey — it is only shown once).
   * Status starts as "pending"; an operator must call PATCH …/approve to allow operation.
   */
  router.post('/agents', (req: Request, res: Response) => {
    const parsed = AgentRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const registration = agentRegistry.register(parsed.data);
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
