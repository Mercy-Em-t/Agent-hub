import request from 'supertest';
import { createApp } from '../../src/api/server';
import { SessionManager } from '../../src/sessions/SessionManager';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { SiteRegistry } from '../../src/registry/SiteRegistry';
import { NullWhatsAppNotifier } from '../../src/notifications/WhatsAppNotifier';
import { JobStore } from '../../src/jobs/JobStore';
import { builtinTools } from '../../src/tools';

// Minimal mock SessionManager so createApp doesn't need Playwright
const mockSessions = {
  create: jest.fn(),
  newPage: jest.fn(),
  setRunning: jest.fn(),
  setCompleted: jest.fn(),
  setError: jest.fn(),
  close: jest.fn(),
  closeAll: jest.fn(),
  list: jest.fn().mockReturnValue([]),
} as unknown as SessionManager;

const app = createApp(
  mockSessions,
  new AgentRegistry(),
  new SiteRegistry(),
  new JobStore(),
  new NullWhatsAppNotifier(),
);

// ── GET /capabilities ─────────────────────────────────────────────────────────

describe('GET /capabilities', () => {
  it('returns 200 with required top-level fields', async () => {
    const res = await request(app).get('/capabilities');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Agent-hub');
    expect(res.body.agentFirst).toBe(true);
    expect(res.body.version).toBeDefined();
    expect(res.body.interfaces).toBeDefined();
    expect(res.body.auth).toBeDefined();
    expect(res.body.quickstart).toBeDefined();
    expect(res.body.links).toBeDefined();
    expect(res.body.gatewayRules).toBeInstanceOf(Array);
  });

  it('includes REST, CLI, and MCP interfaces', async () => {
    const res = await request(app).get('/capabilities');
    expect(res.body.interfaces.rest).toBeDefined();
    expect(res.body.interfaces.cli).toBeDefined();
    expect(res.body.interfaces.mcp).toBeDefined();
  });

  it('lists all 5 quickstart steps', async () => {
    const res = await request(app).get('/capabilities');
    const { quickstart } = res.body as Record<string, unknown>;
    expect(Object.keys(quickstart as object)).toHaveLength(5);
  });

  it('has links.openapi and links.tools', async () => {
    const res = await request(app).get('/capabilities');
    expect(res.body.links.openapi).toBe('/openapi.json');
    expect(res.body.links.tools).toBe('/tools');
  });

  it('MCP interface lists expected tools', async () => {
    const res = await request(app).get('/capabilities');
    const mcpTools: string[] = res.body.interfaces.mcp.tools;
    expect(mcpTools).toContain('hub_register_agent');
    expect(mcpTools).toContain('hub_run_task');
    expect(mcpTools).toContain('hub_list_tools');
  });
});

// ── GET /tools ────────────────────────────────────────────────────────────────

describe('GET /tools', () => {
  it('returns 200 with tools array and count', async () => {
    const res = await request(app).get('/tools');
    expect(res.status).toBe(200);
    expect(res.body.tools).toBeInstanceOf(Array);
    expect(res.body.count).toBe(builtinTools.length);
    expect(res.body.tools).toHaveLength(builtinTools.length);
  });

  it('every tool has name, description, and inputSchema', async () => {
    const res = await request(app).get('/tools');
    for (const tool of res.body.tools as Array<Record<string, unknown>>) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.inputSchema).toBe('object');
    }
  });

  it('navigate tool has url property in inputSchema', async () => {
    const res = await request(app).get('/tools');
    const navigate = (res.body.tools as Array<Record<string, unknown>>)
      .find((t) => t.name === 'navigate');
    expect(navigate).toBeDefined();
    const schema = navigate!.inputSchema as Record<string, unknown>;
    expect(schema.type).toBe('object');
    const props = schema.properties as Record<string, unknown>;
    expect(props.url).toBeDefined();
  });

  it('click tool has selector as required', async () => {
    const res = await request(app).get('/tools');
    const click = (res.body.tools as Array<Record<string, unknown>>)
      .find((t) => t.name === 'click');
    expect(click).toBeDefined();
    const schema = click!.inputSchema as { required?: string[] };
    expect(schema.required).toContain('selector');
  });

  it('scroll tool has direction enum', async () => {
    const res = await request(app).get('/tools');
    const scroll = (res.body.tools as Array<Record<string, unknown>>)
      .find((t) => t.name === 'scroll');
    const schema = scroll!.inputSchema as Record<string, unknown>;
    const props = schema.properties as Record<string, { enum?: unknown[] }>;
    expect(props.direction.enum).toEqual(['up', 'down', 'left', 'right']);
  });

  it('all built-in tool names are present', async () => {
    const res = await request(app).get('/tools');
    const names = (res.body.tools as Array<{ name: string }>).map((t) => t.name);
    const expected = builtinTools.map((t) => t.name);
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });
});

// ── GET /openapi.json ─────────────────────────────────────────────────────────

describe('GET /openapi.json', () => {
  it('returns 200 with openapi field set to 3.1.0', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
  });

  it('contains info with title and version', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.body.info.title).toBe('Agent-hub API');
    expect(typeof res.body.info.version).toBe('string');
  });

  it('has paths for all major endpoints', async () => {
    const res = await request(app).get('/openapi.json');
    const paths = Object.keys(res.body.paths as object);
    expect(paths).toContain('/capabilities');
    expect(paths).toContain('/tools');
    expect(paths).toContain('/health');
    expect(paths).toContain('/registry/agents');
    expect(paths).toContain('/agents/run');
    expect(paths).toContain('/agents/run/async');
    expect(paths).toContain('/whatsapp/webhook');
  });

  it('has components/schemas for AgentRegistration, Job, Error', async () => {
    const res = await request(app).get('/openapi.json');
    const schemas = res.body.components.schemas as object;
    expect(schemas).toHaveProperty('AgentRegistration');
    expect(schemas).toHaveProperty('Job');
    expect(schemas).toHaveProperty('Error');
  });

  it('POST /registry/agents has a requestBody with required fields', async () => {
    const res = await request(app).get('/openapi.json');
    const post = (res.body.paths['/registry/agents'] as Record<string, unknown>).post as Record<string, unknown>;
    expect(post.requestBody).toBeDefined();
    const rb = post.requestBody as { content: Record<string, { schema: { required?: string[] } }> };
    const required = rb.content['application/json'].schema.required;
    expect(required).toContain('name');
    expect(required).toContain('contactEmail');
    expect(required).toContain('purpose');
  });
});
