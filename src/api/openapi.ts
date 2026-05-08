/**
 * Agent-hub OpenAPI 3.1 specification.
 *
 * Served at GET /openapi.json — the primary machine-readable description of
 * every endpoint, schema, and auth requirement.  AI agents and tooling can
 * fetch this document and immediately understand how to interact with the hub
 * without any human assistance.
 *
 * All schemas are authoritative: they are derived from the same Zod definitions
 * used at runtime for request validation.
 */

export const OPENAPI_VERSION = '0.1.0';

// ── Reusable component schemas ────────────────────────────────────────────────

const AgentRegistrationSchema = {
  type: 'object',
  required: ['agentId', 'name', 'description', 'owner', 'contactEmail', 'purpose',
    'allowedDomains', 'deniedDomains', 'allowedTools', 'constraints',
    'status', 'registeredAt', 'apiKey'],
  properties: {
    agentId: { type: 'string', format: 'uuid', description: 'System-assigned unique identifier' },
    name: { type: 'string', description: 'Human-readable agent name' },
    description: { type: 'string', description: 'What this agent does' },
    owner: { type: 'string', description: 'Person or organisation that owns this agent' },
    contactEmail: { type: 'string', format: 'email', description: 'Accountability contact' },
    purpose: { type: 'string', description: 'Explicit statement of why this agent exists' },
    goals: { type: 'array', items: { type: 'string' }, description: 'Outcomes to achieve' },
    workingProcedure: { type: 'array', items: { type: 'string' }, description: 'Ordered SOP steps' },
    responsibilityBounds: {
      type: 'object',
      properties: {
        responsible: { type: 'array', items: { type: 'string' } },
        notResponsible: { type: 'array', items: { type: 'string' } },
      },
    },
    website: { type: 'string', format: 'uri', description: 'Primary home URL' },
    allowedDomains: { type: 'array', items: { type: 'string' }, description: 'Permitted domains' },
    deniedDomains: { type: 'array', items: { type: 'string' }, description: 'Blocked domains' },
    allowedTools: { type: 'array', items: { type: 'string' }, description: 'Permitted tool names; empty = all' },
    constraints: { type: 'array', items: { type: 'string' }, description: 'Behavioural rules' },
    ownerPhone: { type: 'string', description: 'E.164 WhatsApp number for lifecycle notifications' },
    status: { type: 'string', enum: ['pending', 'approved', 'revoked'] },
    registeredAt: { type: 'string', format: 'date-time' },
    approvedAt: { type: 'string', format: 'date-time' },
    revokedAt: { type: 'string', format: 'date-time' },
    apiKey: { type: 'string', description: 'Opaque secret — supply in every /agents/run request' },
  },
};

const AgentRegisterInputSchema = {
  type: 'object',
  required: ['name', 'description', 'owner', 'contactEmail', 'purpose'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    owner: { type: 'string', minLength: 1 },
    contactEmail: { type: 'string', format: 'email' },
    purpose: { type: 'string', minLength: 1 },
    goals: { type: 'array', items: { type: 'string' }, default: [] },
    workingProcedure: { type: 'array', items: { type: 'string' }, default: [] },
    responsibilityBounds: {
      type: 'object',
      properties: {
        responsible: { type: 'array', items: { type: 'string' }, default: [] },
        notResponsible: { type: 'array', items: { type: 'string' }, default: [] },
      },
    },
    website: { type: 'string', format: 'uri' },
    allowedDomains: { type: 'array', items: { type: 'string' }, default: [] },
    deniedDomains: { type: 'array', items: { type: 'string' }, default: [] },
    allowedTools: { type: 'array', items: { type: 'string' }, default: [],
      description: 'Tool names this agent may call. Empty = all built-in tools.' },
    constraints: { type: 'array', items: { type: 'string' }, default: [] },
    ownerPhone: { type: 'string', pattern: '^\\+[1-9]\\d{7,14}$',
      description: 'E.164 phone number (e.g. "+1234567890")' },
  },
};

const SiteRegistrationSchema = {
  type: 'object',
  required: ['siteId', 'domain', 'ownerName', 'contactEmail', 'description', 'status', 'registeredAt'],
  properties: {
    siteId: { type: 'string', format: 'uuid' },
    domain: { type: 'string', description: 'Domain or wildcard (e.g. example.com or *.example.com)' },
    ownerName: { type: 'string' },
    contactEmail: { type: 'string', format: 'email' },
    description: { type: 'string' },
    allowedCapabilities: { type: 'array', items: { type: 'string' },
      description: 'Tool names permitted on this site; empty = all, "*" = all' },
    status: { type: 'string', enum: ['pending', 'approved', 'revoked'] },
    registeredAt: { type: 'string', format: 'date-time' },
    approvedAt: { type: 'string', format: 'date-time' },
    revokedAt: { type: 'string', format: 'date-time' },
  },
};

const SiteRegisterInputSchema = {
  type: 'object',
  required: ['domain', 'ownerName', 'contactEmail', 'description'],
  properties: {
    domain: { type: 'string', pattern: '^(\\*\\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\\.[a-zA-Z]{2,})+$' },
    ownerName: { type: 'string', minLength: 1 },
    contactEmail: { type: 'string', format: 'email' },
    description: { type: 'string', minLength: 1 },
    allowedCapabilities: { type: 'array', items: { type: 'string' }, default: [] },
  },
};

const RunTaskSchema = {
  type: 'object',
  required: ['agentId', 'apiKey', 'startUrl'],
  properties: {
    agentId: { type: 'string', format: 'uuid',
      description: 'Registered agent ID — must be approved in the AgentRegistry' },
    apiKey: { type: 'string', minLength: 1,
      description: 'API key issued when the agent was registered' },
    startUrl: { type: 'string', format: 'uri', description: 'Starting URL for the task' },
    steps: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        required: ['tool', 'input'],
        properties: {
          tool: { type: 'string', minLength: 1,
            description: 'Tool name (see GET /tools for available tools)' },
          input: { type: 'object', additionalProperties: true,
            description: 'Tool-specific input matching the tool\'s inputSchema' },
        },
      },
    },
    metadata: { type: 'object', additionalProperties: true },
  },
};

const JobSchema = {
  type: 'object',
  required: ['jobId', 'agentId', 'status', 'createdAt'],
  properties: {
    jobId: { type: 'string', format: 'uuid' },
    agentId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed'] },
    results: { type: 'array', items: { type: 'object', additionalProperties: true } },
    error: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    startedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time' },
  },
};

const ErrorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { oneOf: [{ type: 'string' }, { type: 'object' }] },
    reason: { type: 'string' },
  },
};

const ToolDefinitionSchema = {
  type: 'object',
  required: ['name', 'description', 'inputSchema'],
  properties: {
    name: { type: 'string', description: 'Tool identifier used in task steps' },
    description: { type: 'string', description: 'Human/machine-readable purpose of the tool' },
    inputSchema: { type: 'object', description: 'JSON Schema describing the tool\'s input' },
  },
};

// ── Reusable response objects ──────────────────────────────────────────────────

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const jsonContent = (schema: object, description = 'Success') => ({
  description,
  content: { 'application/json': { schema } },
});

// ── Full OpenAPI document ─────────────────────────────────────────────────────

export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Agent-hub API',
    version: OPENAPI_VERSION,
    description:
      'Platform for onboarding and governing AI agents that operate on the web.\n\n' +
      '**Agent-first design** — every endpoint is machine-readable, every schema is ' +
      'JSON-Schema-validated, and discovery is fully programmatic:\n\n' +
      '1. `GET /capabilities` — single-document bootstrap: what this hub is, what it can do.\n' +
      '2. `GET /openapi.json` — this spec (also available as YAML).\n' +
      '3. `GET /tools` — live registry of all browser automation tools with JSON Schemas.\n\n' +
      '**Quick-start for an AI agent:**\n' +
      '```\n' +
      'GET /capabilities                              → read agentFirst manifest\n' +
      'POST /registry/agents  { ...declaration }     → get agentId + apiKey\n' +
      'PATCH /registry/agents/{id}/approve            → operator approves\n' +
      'POST /registry/sites   { domain: "..." }      → register target site\n' +
      'PATCH /registry/sites/{id}/approve             → operator approves site\n' +
      'POST /agents/run       { agentId, apiKey, startUrl, steps }\n' +
      '```',
    contact: { url: 'https://github.com/Mercy-Em-t/Agent-hub' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development server' },
  ],
  tags: [
    { name: 'Discovery', description: 'Machine-readable capability and schema discovery' },
    { name: 'Registry', description: 'Agent and site registration + lifecycle management' },
    { name: 'Execution', description: 'Gateway-protected task execution and job tracking' },
    { name: 'Notifications', description: 'WhatsApp owner command interface (Twilio)' },
    { name: 'Health', description: 'Service health check' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        operationId: 'getHealth',
        responses: {
          200: jsonContent(
            { type: 'object', required: ['status', 'version'],
              properties: { status: { type: 'string', enum: ['ok'] },
                version: { type: 'string' } } },
            'Service is healthy',
          ),
        },
      },
    },

    '/capabilities': {
      get: {
        tags: ['Discovery'],
        summary: 'Agent bootstrap manifest',
        description:
          'Returns a single JSON document describing this hub: what it is, what it can do, ' +
          'available interfaces (REST / CLI / MCP), auth requirements, and quick-start steps. ' +
          'An AI agent should call this endpoint first to self-orient without any human guidance.',
        operationId: 'getCapabilities',
        responses: {
          200: jsonContent(
            {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                description: { type: 'string' },
                agentFirst: { type: 'boolean' },
                interfaces: { type: 'object' },
                auth: { type: 'object' },
                quickstart: { type: 'object' },
                links: { type: 'object' },
              },
            },
            'Agent bootstrap manifest',
          ),
        },
      },
    },

    '/tools': {
      get: {
        tags: ['Discovery'],
        summary: 'List all available browser automation tools',
        description:
          'Returns the complete, live registry of built-in tools with their names, ' +
          'descriptions, and JSON Schema–described inputs.  Use this to discover which ' +
          'tools to reference in task `steps` without reading source code.',
        operationId: 'listTools',
        responses: {
          200: jsonContent(
            {
              type: 'object',
              required: ['tools'],
              properties: {
                tools: { type: 'array', items: { $ref: '#/components/schemas/ToolDefinition' } },
                count: { type: 'integer' },
              },
            },
            'Tool catalog',
          ),
        },
      },
    },

    '/openapi.json': {
      get: {
        tags: ['Discovery'],
        summary: 'OpenAPI 3.1 specification (JSON)',
        description: 'Returns this specification document.',
        operationId: 'getOpenApiJson',
        responses: {
          200: { description: 'OpenAPI 3.1 document', content: { 'application/json': {} } },
        },
      },
    },

    // ── Registry: agents ──────────────────────────────────────────────────────

    '/registry/agents': {
      post: {
        tags: ['Registry'],
        summary: 'Register a new AI agent',
        description:
          'Declare an agent before it may operate.  Returns the full registration ' +
          'including `agentId` and `apiKey` — store the `apiKey` as it is only shown once.\n\n' +
          'Status starts as `pending`.  An operator must call ' +
          '`PATCH /registry/agents/{agentId}/approve` before the agent can run tasks.',
        operationId: 'registerAgent',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: AgentRegisterInputSchema } },
        },
        responses: {
          201: jsonContent({ $ref: '#/components/schemas/AgentRegistration' }, 'Agent registered'),
          400: errorResponse('Validation error'),
          409: errorResponse('Conflict'),
        },
      },
      get: {
        tags: ['Registry'],
        summary: 'List all registered agents',
        operationId: 'listAgents',
        responses: {
          200: jsonContent(
            { type: 'object', required: ['agents'],
              properties: { agents: { type: 'array',
                items: { $ref: '#/components/schemas/AgentRegistration' } } } },
            'Agent list',
          ),
        },
      },
    },

    '/registry/agents/{agentId}': {
      get: {
        tags: ['Registry'],
        summary: 'Get a specific agent registration',
        operationId: 'getAgent',
        parameters: [{
          name: 'agentId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/AgentRegistration' }, 'Agent details'),
          404: errorResponse('Agent not found'),
        },
      },
    },

    '/registry/agents/{agentId}/approve': {
      patch: {
        tags: ['Registry'],
        summary: 'Approve an agent',
        description: 'Grant the agent permission to execute tasks through the gateway.',
        operationId: 'approveAgent',
        parameters: [{
          name: 'agentId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/AgentRegistration' }, 'Agent approved'),
          400: errorResponse('Approval error (e.g. already revoked)'),
        },
      },
    },

    '/registry/agents/{agentId}/revoke': {
      patch: {
        tags: ['Registry'],
        summary: 'Revoke an agent',
        description: 'Immediately block all future operations for this agent.',
        operationId: 'revokeAgent',
        parameters: [{
          name: 'agentId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/AgentRegistration' }, 'Agent revoked'),
          400: errorResponse('Revocation error'),
        },
      },
    },

    // ── Registry: sites ───────────────────────────────────────────────────────

    '/registry/sites': {
      post: {
        tags: ['Registry'],
        summary: 'Register a website',
        description:
          'Declare a website as a consenting participant.  ' +
          'Status starts as `pending`; an operator must approve it before agents may visit.',
        operationId: 'registerSite',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: SiteRegisterInputSchema } },
        },
        responses: {
          201: jsonContent({ $ref: '#/components/schemas/SiteRegistration' }, 'Site registered'),
          400: errorResponse('Validation error'),
          409: errorResponse('Conflict'),
        },
      },
      get: {
        tags: ['Registry'],
        summary: 'List all registered sites',
        operationId: 'listSites',
        responses: {
          200: jsonContent(
            { type: 'object', required: ['sites'],
              properties: { sites: { type: 'array',
                items: { $ref: '#/components/schemas/SiteRegistration' } } } },
            'Site list',
          ),
        },
      },
    },

    '/registry/sites/{siteId}': {
      get: {
        tags: ['Registry'],
        summary: 'Get a specific site registration',
        operationId: 'getSite',
        parameters: [{
          name: 'siteId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/SiteRegistration' }, 'Site details'),
          404: errorResponse('Site not found'),
        },
      },
    },

    '/registry/sites/{siteId}/approve': {
      patch: {
        tags: ['Registry'],
        summary: 'Approve a site',
        operationId: 'approveSite',
        parameters: [{
          name: 'siteId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/SiteRegistration' }, 'Site approved'),
          400: errorResponse('Approval error'),
        },
      },
    },

    '/registry/sites/{siteId}/revoke': {
      patch: {
        tags: ['Registry'],
        summary: 'Revoke a site',
        operationId: 'revokeSite',
        parameters: [{
          name: 'siteId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/SiteRegistration' }, 'Site revoked'),
          400: errorResponse('Revocation error'),
        },
      },
    },

    // ── Execution ─────────────────────────────────────────────────────────────

    '/agents/run': {
      post: {
        tags: ['Execution'],
        summary: 'Run a task synchronously',
        description:
          'Execute a sequence of browser-automation steps and wait for the result.\n\n' +
          '**Gateway checks** (all must pass or a 403 is returned):\n' +
          '1. Agent must be registered with matching `apiKey`\n' +
          '2. Agent must be `approved`\n' +
          '3. `startUrl` domain must be a registered+approved site\n' +
          '4. Domain must not be in agent\'s `deniedDomains`\n' +
          '5. Domain must be in agent\'s `allowedDomains` (if restricted)\n' +
          '6. All tools must be in agent\'s `allowedTools` (if restricted)\n' +
          '7. All tools must be in the site\'s `allowedCapabilities` (if restricted)',
        operationId: 'runTask',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: RunTaskSchema } },
        },
        responses: {
          200: jsonContent(
            {
              type: 'object',
              properties: {
                agentId: { type: 'string', format: 'uuid' },
                sessionId: { type: 'string', format: 'uuid' },
                status: { type: 'string', enum: ['completed'] },
                results: { type: 'array', items: { type: 'object' } },
              },
            },
            'Task completed',
          ),
          400: errorResponse('Validation error'),
          403: errorResponse('Gateway denied'),
          500: errorResponse('Runtime error'),
        },
      },
    },

    '/agents/run/async': {
      post: {
        tags: ['Execution'],
        summary: 'Submit a task asynchronously',
        description:
          'Enqueue a task and return a `jobId` immediately.  ' +
          'Poll `GET /agents/jobs/{jobId}` for status and results.  ' +
          'Applies the same gateway checks as `POST /agents/run`.',
        operationId: 'submitTask',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: RunTaskSchema } },
        },
        responses: {
          202: jsonContent(
            { type: 'object', required: ['jobId', 'status'],
              properties: { jobId: { type: 'string', format: 'uuid' },
                status: { type: 'string', enum: ['queued'] } } },
            'Task accepted, jobId returned',
          ),
          400: errorResponse('Validation error'),
          403: errorResponse('Gateway denied'),
        },
      },
    },

    '/agents/jobs/{jobId}': {
      get: {
        tags: ['Execution'],
        summary: 'Poll async job status',
        operationId: 'getJob',
        parameters: [{
          name: 'jobId', in: 'path', required: true,
          schema: { type: 'string', format: 'uuid' },
        }],
        responses: {
          200: jsonContent({ $ref: '#/components/schemas/Job' }, 'Job details'),
          404: errorResponse('Job not found'),
        },
      },
    },

    '/agents/jobs': {
      get: {
        tags: ['Execution'],
        summary: 'List all submitted jobs',
        operationId: 'listJobs',
        responses: {
          200: jsonContent(
            { type: 'object', required: ['jobs'],
              properties: { jobs: { type: 'array',
                items: { $ref: '#/components/schemas/Job' } } } },
            'Job list',
          ),
        },
      },
    },

    '/agents/sessions': {
      get: {
        tags: ['Execution'],
        summary: 'List active browser sessions',
        operationId: 'listSessions',
        responses: {
          200: jsonContent(
            { type: 'object', required: ['sessions'],
              properties: { sessions: { type: 'array', items: { type: 'object' } } } },
            'Active sessions',
          ),
        },
      },
    },

    // ── WhatsApp ──────────────────────────────────────────────────────────────

    '/whatsapp/webhook': {
      post: {
        tags: ['Notifications'],
        summary: 'Twilio WhatsApp inbound webhook',
        description:
          'Receives inbound WhatsApp messages from Twilio and dispatches owner commands.\n\n' +
          'Supported commands: `help`, `list`, `status <name>`, `approve <name>`, ' +
          '`revoke <name>`, `info <name>`.\n\n' +
          'Point the Twilio "Message comes in" webhook at this URL.',
        operationId: 'whatsappWebhook',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  From: { type: 'string', description: 'Sender WhatsApp number in E.164' },
                  Body: { type: 'string', description: 'Message text' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'TwiML response',
            content: { 'text/xml': { schema: { type: 'string' } } },
          },
        },
      },
    },
  },

  components: {
    schemas: {
      AgentRegistration: AgentRegistrationSchema,
      SiteRegistration: SiteRegistrationSchema,
      Job: JobSchema,
      Error: ErrorSchema,
      ToolDefinition: ToolDefinitionSchema,
    },
  },
};
