import { Router, Request, Response } from 'express';
import { builtinTools } from '../../tools';
import { zodToJsonSchema } from '../zodToJsonSchema';
import { openapiSpec, OPENAPI_VERSION } from '../openapi';

/**
 * Capabilities router — agent-first discovery endpoints.
 *
 * GET /capabilities    Bootstrap manifest: who this hub is, what it can do, how to auth.
 *                      An AI agent's first stop — zero human context needed.
 * GET /tools           Live registry of all built-in browser tools with JSON Schemas.
 * GET /openapi.json    Full OpenAPI 3.1 specification (JSON).
 */
export function capabilitiesRouter(): Router {
  const router = Router();

  // ── GET /capabilities ──────────────────────────────────────────────────────

  /**
   * Bootstrap manifest consumed by AI agents on first contact.
   *
   * Contains everything an AI needs to self-orient:
   *  - What this hub is and does
   *  - All available interfaces (REST, CLI, MCP)
   *  - Auth requirements
   *  - The 5-step quickstart
   *  - Links to full spec and tool catalog
   */
  router.get('/capabilities', (_req: Request, res: Response) => {
    res.json({
      name: 'Agent-hub',
      version: OPENAPI_VERSION,
      description:
        'Platform for onboarding and governing AI agents that operate on the web. ' +
        'Agents declare themselves, are approved by operators, and then execute ' +
        'browser-automation tasks through a strict entry gateway.',
      agentFirst: true,
      protocolVersion: '1.0',

      /**
       * Available machine interfaces — every one can be used without a human.
       */
      interfaces: {
        rest: {
          description: 'JSON REST API — primary interface',
          spec: '/openapi.json',
          format: 'OpenAPI 3.1',
        },
        cli: {
          description: 'Command-line interface for scripting and automation',
          invoke: 'npx ts-node src/cli/index.ts <command>',
          help: 'npx ts-node src/cli/index.ts help',
          commands: [
            'health', 'capabilities', 'tools',
            'agents list', 'agents get <id>', 'agents register', 'agents approve <id>', 'agents revoke <id>',
            'sites list', 'sites register', 'sites approve <id>', 'sites revoke <id>',
            'run', 'submit', 'jobs list', 'jobs get <jobId>',
          ],
        },
        mcp: {
          description: 'Model Context Protocol server — use Agent-hub as a tool from any MCP client (Claude, etc.)',
          protocol: 'MCP 2024-11-05',
          invoke: 'npx ts-node src/mcp/index.ts',
          transport: 'stdio (JSON-RPC 2.0)',
          tools: [
            'hub_health', 'hub_capabilities', 'hub_list_tools',
            'hub_register_agent', 'hub_approve_agent', 'hub_revoke_agent',
            'hub_list_agents', 'hub_get_agent',
            'hub_register_site', 'hub_approve_site', 'hub_list_sites',
            'hub_run_task', 'hub_submit_task', 'hub_poll_job', 'hub_list_jobs',
          ],
        },
      },

      /**
       * Authentication model — how agents obtain and use credentials.
       */
      auth: {
        type: 'apiKey',
        description:
          'Register an agent (POST /registry/agents) to receive an agentId and apiKey. ' +
          'Supply both in every POST /agents/run request body. ' +
          'The apiKey is shown only once at registration.',
        fields: {
          agentId: 'body.agentId — the UUID returned by POST /registry/agents',
          apiKey: 'body.apiKey — the secret returned by POST /registry/agents',
        },
        operatorApproval:
          'Every new agent starts in `pending` status. ' +
          'An operator must call PATCH /registry/agents/{agentId}/approve before tasks can run.',
      },

      /**
       * 5-step quickstart an AI can execute sequentially without any human input.
       */
      quickstart: {
        step1_register_agent: {
          method: 'POST',
          path: '/registry/agents',
          description: 'Declare your agent — receive agentId + apiKey',
          requiredFields: ['name', 'description', 'owner', 'contactEmail', 'purpose'],
        },
        step2_approve_agent: {
          method: 'PATCH',
          path: '/registry/agents/{agentId}/approve',
          description: 'Operator approves the agent (grants gateway access)',
        },
        step3_register_site: {
          method: 'POST',
          path: '/registry/sites',
          description: 'Register the target website as a consenting participant',
          requiredFields: ['domain', 'ownerName', 'contactEmail', 'description'],
        },
        step4_approve_site: {
          method: 'PATCH',
          path: '/registry/sites/{siteId}/approve',
          description: 'Operator approves the site',
        },
        step5_run_task: {
          method: 'POST',
          path: '/agents/run',
          description: 'Execute browser-automation steps — see GET /tools for available tools',
          requiredFields: ['agentId', 'apiKey', 'startUrl', 'steps'],
        },
      },

      /**
       * Discovery links — all machine-readable.
       */
      links: {
        openapi: '/openapi.json',
        tools: '/tools',
        health: '/health',
        capabilities: '/capabilities',
      },

      /**
       * Gateway rules — every /agents/run call must satisfy all seven checks.
       */
      gatewayRules: [
        'Agent must be registered with the correct apiKey',
        'Agent must have status: approved',
        'Target domain must be registered and approved as a site',
        "Target domain must not be in the agent's deniedDomains",
        "Target domain must be in the agent's allowedDomains (if that list is non-empty)",
        "All intended tools must be in the agent's allowedTools (if that list is non-empty)",
        "All intended tools must be in the site's allowedCapabilities (if that list is non-empty)",
      ],
    });
  });

  // ── GET /tools ─────────────────────────────────────────────────────────────

  /**
   * Live tool catalog — derived directly from the in-process tool registry.
   * Every tool's inputSchema is converted to JSON Schema so agents can
   * construct valid step inputs without reading source code.
   */
  router.get('/tools', (_req: Request, res: Response) => {
    const tools = builtinTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    }));

    res.json({ tools, count: tools.length });
  });

  // ── GET /openapi.json ──────────────────────────────────────────────────────

  /**
   * Full OpenAPI 3.1 specification as JSON.
   * Consumed by OpenAPI tooling, AI agents, and code generators.
   */
  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openapiSpec);
  });

  return router;
}
