/**
 * Agent-hub MCP Server
 *
 * Implements the Model Context Protocol (MCP) 2024-11-05 over stdio JSON-RPC 2.0.
 * This lets any MCP-compatible AI client (Claude, Cursor, etc.) use Agent-hub
 * as a set of native tools — no REST knowledge needed.
 *
 * Transport: stdio
 * Protocol: JSON-RPC 2.0 (newline-delimited)
 * MCP version: 2024-11-05
 *
 * Configuration:
 *   AGENT_HUB_URL   — hub base URL (default: http://localhost:3000)
 *
 * Available tools (map 1-to-1 onto the REST API):
 *   hub_health         GET  /health
 *   hub_capabilities   GET  /capabilities
 *   hub_list_tools     GET  /tools
 *   hub_register_agent POST /registry/agents
 *   hub_approve_agent  PATCH /registry/agents/{agentId}/approve
 *   hub_revoke_agent   PATCH /registry/agents/{agentId}/revoke
 *   hub_list_agents    GET  /registry/agents
 *   hub_get_agent      GET  /registry/agents/{agentId}
 *   hub_register_site  POST /registry/sites
 *   hub_approve_site   PATCH /registry/sites/{siteId}/approve
 *   hub_list_sites     GET  /registry/sites
 *   hub_run_task       POST /agents/run
 *   hub_submit_task    POST /agents/run/async
 *   hub_poll_job       GET  /agents/jobs/{jobId}
 *   hub_list_jobs      GET  /agents/jobs
 */

import * as http from 'http';
import * as https from 'https';

// ── JSON-RPC 2.0 types ────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number | null;
}

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

const PARSE_ERROR = -32700;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// ── MCP tool descriptor ───────────────────────────────────────────────────────

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function hubRequest(
  method: string,
  path: string,
  baseUrl: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;

    const opts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── MCP tool definitions ──────────────────────────────────────────────────────

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'hub_health',
    description: 'Check whether the Agent-hub server is running and healthy.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'hub_capabilities',
    description:
      'Retrieve the Agent-hub bootstrap manifest: what the hub is, all available interfaces ' +
      '(REST/CLI/MCP), auth requirements, and a 5-step quickstart. ' +
      'Call this first to self-orient without any human guidance.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'hub_list_tools',
    description:
      'List all built-in browser automation tools with their names, descriptions, ' +
      'and JSON Schema input definitions. Use this to discover valid tool names for task steps.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'hub_register_agent',
    description:
      'Register a new AI agent with the hub.  Returns agentId and apiKey — store the apiKey, ' +
      'it is shown only once.  Status starts as `pending`; call hub_approve_agent to activate.',
    inputSchema: {
      type: 'object',
      required: ['name', 'description', 'owner', 'contactEmail', 'purpose'],
      properties: {
        name: { type: 'string', description: 'Human-readable agent name' },
        description: { type: 'string', description: 'What this agent does' },
        owner: { type: 'string', description: 'Person or organisation that owns this agent' },
        contactEmail: { type: 'string', format: 'email', description: 'Accountability contact' },
        purpose: { type: 'string', description: 'Why this agent exists' },
        goals: { type: 'array', items: { type: 'string' }, description: 'Outcomes to produce' },
        workingProcedure: { type: 'array', items: { type: 'string' }, description: 'Ordered SOP steps' },
        responsibilityBounds: {
          type: 'object',
          properties: {
            responsible: { type: 'array', items: { type: 'string' } },
            notResponsible: { type: 'array', items: { type: 'string' } },
          },
        },
        website: { type: 'string', format: 'uri', description: 'Agent home URL' },
        allowedDomains: { type: 'array', items: { type: 'string' } },
        deniedDomains: { type: 'array', items: { type: 'string' } },
        allowedTools: { type: 'array', items: { type: 'string' },
          description: 'Tool names this agent may call; empty = all' },
        constraints: { type: 'array', items: { type: 'string' } },
        ownerPhone: { type: 'string', description: 'E.164 WhatsApp number for notifications' },
      },
    },
  },
  {
    name: 'hub_approve_agent',
    description: 'Approve a pending agent, granting it permission to execute tasks.',
    inputSchema: {
      type: 'object',
      required: ['agentId'],
      properties: {
        agentId: { type: 'string', format: 'uuid', description: 'Agent UUID' },
      },
    },
  },
  {
    name: 'hub_revoke_agent',
    description: 'Revoke an agent, immediately blocking all future operations.',
    inputSchema: {
      type: 'object',
      required: ['agentId'],
      properties: {
        agentId: { type: 'string', format: 'uuid' },
      },
    },
  },
  {
    name: 'hub_list_agents',
    description: 'List all registered agents (all statuses).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'hub_get_agent',
    description: 'Get full details of a specific agent registration.',
    inputSchema: {
      type: 'object',
      required: ['agentId'],
      properties: {
        agentId: { type: 'string', format: 'uuid' },
      },
    },
  },
  {
    name: 'hub_register_site',
    description:
      'Register a website as a consenting participant.  ' +
      'Status starts as `pending`; call hub_approve_site to open it to agents.',
    inputSchema: {
      type: 'object',
      required: ['domain', 'ownerName', 'contactEmail', 'description'],
      properties: {
        domain: { type: 'string', description: 'Domain or *.wildcard (e.g. example.com)' },
        ownerName: { type: 'string' },
        contactEmail: { type: 'string', format: 'email' },
        description: { type: 'string' },
        allowedCapabilities: { type: 'array', items: { type: 'string' },
          description: 'Tool names permitted on this site; empty = all' },
      },
    },
  },
  {
    name: 'hub_approve_site',
    description: 'Approve a site, allowing approved agents to visit it.',
    inputSchema: {
      type: 'object',
      required: ['siteId'],
      properties: {
        siteId: { type: 'string', format: 'uuid' },
      },
    },
  },
  {
    name: 'hub_list_sites',
    description: 'List all registered sites.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'hub_run_task',
    description:
      'Run a browser-automation task synchronously and wait for results. ' +
      'Use hub_list_tools to discover available tool names for steps. ' +
      'The agent must be approved and the target site must be registered and approved.',
    inputSchema: {
      type: 'object',
      required: ['agentId', 'apiKey', 'startUrl'],
      properties: {
        agentId: { type: 'string', format: 'uuid' },
        apiKey: { type: 'string', description: 'Secret issued at agent registration' },
        startUrl: { type: 'string', format: 'uri', description: 'Starting URL' },
        steps: {
          type: 'array',
          default: [],
          description: 'Tool steps to execute. See hub_list_tools for tool names and schemas.',
          items: {
            type: 'object',
            required: ['tool', 'input'],
            properties: {
              tool: { type: 'string', description: 'Tool name (e.g. "navigate", "click")' },
              input: { type: 'object', additionalProperties: true },
            },
          },
        },
        metadata: { type: 'object', additionalProperties: true },
      },
    },
  },
  {
    name: 'hub_submit_task',
    description:
      'Submit a browser-automation task asynchronously. Returns a jobId immediately. ' +
      'Poll hub_poll_job to check status and retrieve results.',
    inputSchema: {
      type: 'object',
      required: ['agentId', 'apiKey', 'startUrl'],
      properties: {
        agentId: { type: 'string', format: 'uuid' },
        apiKey: { type: 'string' },
        startUrl: { type: 'string', format: 'uri' },
        steps: {
          type: 'array',
          default: [],
          items: {
            type: 'object',
            required: ['tool', 'input'],
            properties: {
              tool: { type: 'string' },
              input: { type: 'object', additionalProperties: true },
            },
          },
        },
        metadata: { type: 'object', additionalProperties: true },
      },
    },
  },
  {
    name: 'hub_poll_job',
    description: 'Poll the status and results of an async task submitted with hub_submit_task.',
    inputSchema: {
      type: 'object',
      required: ['jobId'],
      properties: {
        jobId: { type: 'string', format: 'uuid', description: 'Job ID returned by hub_submit_task' },
      },
    },
  },
  {
    name: 'hub_list_jobs',
    description: 'List all submitted async jobs with their current status.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ── Tool dispatcher ───────────────────────────────────────────────────────────

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  baseUrl: string,
): Promise<unknown> {
  switch (name) {
    case 'hub_health':
      return hubRequest('GET', '/health', baseUrl);

    case 'hub_capabilities':
      return hubRequest('GET', '/capabilities', baseUrl);

    case 'hub_list_tools':
      return hubRequest('GET', '/tools', baseUrl);

    case 'hub_register_agent':
      return hubRequest('POST', '/registry/agents', baseUrl, args);

    case 'hub_approve_agent':
      return hubRequest('PATCH', `/registry/agents/${args.agentId}/approve`, baseUrl);

    case 'hub_revoke_agent':
      return hubRequest('PATCH', `/registry/agents/${args.agentId}/revoke`, baseUrl);

    case 'hub_list_agents':
      return hubRequest('GET', '/registry/agents', baseUrl);

    case 'hub_get_agent':
      return hubRequest('GET', `/registry/agents/${args.agentId}`, baseUrl);

    case 'hub_register_site':
      return hubRequest('POST', '/registry/sites', baseUrl, args);

    case 'hub_approve_site':
      return hubRequest('PATCH', `/registry/sites/${args.siteId}/approve`, baseUrl);

    case 'hub_list_sites':
      return hubRequest('GET', '/registry/sites', baseUrl);

    case 'hub_run_task':
      return hubRequest('POST', '/agents/run', baseUrl, args);

    case 'hub_submit_task':
      return hubRequest('POST', '/agents/run/async', baseUrl, args);

    case 'hub_poll_job':
      return hubRequest('GET', `/agents/jobs/${args.jobId}`, baseUrl);

    case 'hub_list_jobs':
      return hubRequest('GET', '/agents/jobs', baseUrl);

    default:
      throw Object.assign(new Error(`Tool "${name}" not found`), { code: METHOD_NOT_FOUND });
  }
}

// ── Request handler ───────────────────────────────────────────────────────────

export async function handleRequest(
  req: JsonRpcRequest,
  baseUrl: string,
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  // Notifications (no id) — no response expected
  if (req.id === undefined && (
    req.method === 'notifications/initialized' ||
    req.method.startsWith('notifications/')
  )) {
    return null;
  }

  try {
    switch (req.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'agent-hub', version: '0.1.0' },
            instructions:
              'Agent-hub MCP server. Start with hub_capabilities to understand the hub. ' +
              'Use hub_list_tools to discover browser automation tools. ' +
              'Register an agent with hub_register_agent, approve it, register a target site, ' +
              'then call hub_run_task to execute browser automation steps.',
          },
        };
      }

      case 'ping': {
        return { jsonrpc: '2.0', id, result: {} };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: MCP_TOOLS },
        };
      }

      case 'tools/call': {
        const params = req.params as { name?: string; arguments?: Record<string, unknown> };
        if (!params?.name) {
          return { jsonrpc: '2.0', id,
            error: { code: INVALID_PARAMS, message: 'params.name is required' } };
        }

        const result = await callTool(
          params.name,
          params.arguments ?? {},
          baseUrl,
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false,
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: METHOD_NOT_FOUND, message: `Method "${req.method}" not found` },
        };
    }
  } catch (err) {
    const e = err as Error & { code?: number };
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: e.code ?? INTERNAL_ERROR,
        message: e.message,
      },
    };
  }
}

// ── stdio server loop ─────────────────────────────────────────────────────────

export function startServer(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
  baseUrl: string = process.env.AGENT_HUB_URL ?? 'http://localhost:3000',
): void {
  let buffer = '';

  input.setEncoding('utf8');

  input.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let req: JsonRpcRequest;
      try {
        req = JSON.parse(trimmed) as JsonRpcRequest;
      } catch {
        const errResp: JsonRpcError = {
          jsonrpc: '2.0',
          id: null,
          error: { code: PARSE_ERROR, message: 'Parse error' },
        };
        output.write(JSON.stringify(errResp) + '\n');
        continue;
      }

      handleRequest(req, baseUrl).then((response) => {
        if (response !== null) {
          output.write(JSON.stringify(response) + '\n');
        }
      }).catch((err: unknown) => {
        const errResp: JsonRpcError = {
          jsonrpc: '2.0',
          id: req.id ?? null,
          error: { code: INTERNAL_ERROR, message: (err as Error).message },
        };
        output.write(JSON.stringify(errResp) + '\n');
      });
    }
  });

  input.on('end', () => process.exit(0));
}

// ── JSON-RPC error codes exported for tests ───────────────────────────────────
export { PARSE_ERROR, METHOD_NOT_FOUND, INVALID_PARAMS, INTERNAL_ERROR };
