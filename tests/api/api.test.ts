import request from 'supertest';
import { createApp } from '../../src/api/server';
import { SessionManager } from '../../src/sessions/SessionManager';
import { BrowserManager } from '../../src/browser/BrowserManager';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { SiteRegistry } from '../../src/registry/SiteRegistry';
import type { BrowserContext } from 'playwright';

function buildApp() {
  const fakeCtx: Partial<BrowserContext> = {
    close: jest.fn().mockResolvedValue(undefined),
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(null),
      title: jest.fn().mockResolvedValue('Test Page'),
      url: jest.fn().mockReturnValue('https://example.com'),
      locator: jest.fn().mockReturnValue({
        first: jest.fn().mockReturnValue({
          click: jest.fn().mockResolvedValue(undefined),
          fill: jest.fn().mockResolvedValue(undefined),
          textContent: jest.fn().mockResolvedValue('text'),
        }),
      }),
      selectOption: jest.fn().mockResolvedValue(undefined),
      keyboard: { press: jest.fn().mockResolvedValue(undefined) },
      waitForSelector: jest.fn().mockResolvedValue(null),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
      evaluate: jest.fn().mockResolvedValue('Hello world'),
      setDefaultNavigationTimeout: jest.fn(),
      setDefaultTimeout: jest.fn(),
    }),
    setDefaultNavigationTimeout: jest.fn(),
    setDefaultTimeout: jest.fn(),
  };

  const browserManager = {
    launch: jest.fn().mockResolvedValue(undefined),
    newContext: jest.fn().mockResolvedValue(fakeCtx),
    closeContext: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    isRunning: true,
  } as unknown as BrowserManager;

  const sessions = new SessionManager(browserManager);
  const agentRegistry = new AgentRegistry();
  const siteRegistry = new SiteRegistry();

  return { app: createApp(sessions, agentRegistry, siteRegistry), agentRegistry, siteRegistry };
}

/** Helper: register + approve an agent and site, return creds. */
function setupApprovedAgentAndSite(
  agentRegistry: AgentRegistry,
  siteRegistry: SiteRegistry,
  domain = 'example.com',
) {
  const site = siteRegistry.register({
    domain,
    ownerName: 'Acme',
    contactEmail: 'admin@example.com',
    description: 'Test site',
    allowedCapabilities: [],
  });
  siteRegistry.approve(site.siteId);

  const agent = agentRegistry.register({
    name: 'TestBot',
    description: 'Test agent',
    owner: 'Alice',
    contactEmail: 'alice@example.com',
    purpose: 'Integration testing',
    allowedDomains: [],
    deniedDomains: [],
    allowedTools: [],
    constraints: [],
  });
  agentRegistry.approve(agent.agentId);

  return { agentId: agent.agentId, apiKey: agent.apiKey };
}

// ──────────────────────────────────────────────────────────────── /health
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ──────────────────────────────────────────────────────── /agents/sessions
describe('GET /agents/sessions', () => {
  it('returns an empty sessions array initially', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/agents/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────── /agents/run
describe('POST /agents/run', () => {
  it('returns 400 for a missing agentId', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/agents/run')
      .send({ startUrl: 'https://example.com', apiKey: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for an invalid startUrl', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/agents/run')
      .send({ agentId: '00000000-0000-0000-0000-000000000000', apiKey: 'x', startUrl: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 403 when agent is not registered', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/agents/run')
      .send({
        agentId: '00000000-0000-0000-0000-000000000000',
        apiKey: 'wrong',
        startUrl: 'https://example.com',
      });
    expect(res.status).toBe(403);
    expect(res.body.reason).toMatch(/not registered/);
  });

  it('returns 403 when site is not registered', async () => {
    const { app, agentRegistry } = buildApp();
    const agent = agentRegistry.register({
      name: 'B',
      description: 'B',
      owner: 'Bob',
      contactEmail: 'b@b.com',
      purpose: 'test',
      allowedDomains: [],
      deniedDomains: [],
      allowedTools: [],
      constraints: [],
    });
    agentRegistry.approve(agent.agentId);

    const res = await request(app)
      .post('/agents/run')
      .send({
        agentId: agent.agentId,
        apiKey: agent.apiKey,
        startUrl: 'https://unregistered-site.com',
      });
    expect(res.status).toBe(403);
    expect(res.body.reason).toMatch(/not registered as an approved site/);
  });

  it('runs a task with zero steps when agent and site are approved', async () => {
    const { app, agentRegistry, siteRegistry } = buildApp();
    const { agentId, apiKey } = setupApprovedAgentAndSite(agentRegistry, siteRegistry);

    const res = await request(app)
      .post('/agents/run')
      .send({ agentId, apiKey, startUrl: 'https://example.com', steps: [] });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.results).toHaveLength(1); // initial navigate
  });
});

// ─────────────────────────────────────────────── /registry/agents
describe('Registry – agents', () => {
  it('POST /registry/agents creates a pending agent registration', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/registry/agents')
      .send({
        name: 'MyBot',
        description: 'Does things',
        owner: 'Alice',
        contactEmail: 'alice@example.com',
        purpose: 'Automate tasks',
      });
    expect(res.status).toBe(201);
    expect(res.body.agentId).toBeTruthy();
    expect(res.body.apiKey).toBeTruthy();
    expect(res.body.status).toBe('pending');
  });

  it('GET /registry/agents lists all agents', async () => {
    const { app } = buildApp();
    await request(app).post('/registry/agents').send({
      name: 'A', description: 'A', owner: 'O', contactEmail: 'o@o.com', purpose: 'P',
    });
    const res = await request(app).get('/registry/agents');
    expect(res.status).toBe(200);
    expect(res.body.agents).toHaveLength(1);
  });

  it('PATCH /registry/agents/:id/approve approves the agent', async () => {
    const { app } = buildApp();
    const regRes = await request(app).post('/registry/agents').send({
      name: 'A', description: 'A', owner: 'O', contactEmail: 'o@o.com', purpose: 'P',
    });
    const { agentId } = regRes.body;
    const approveRes = await request(app).patch(`/registry/agents/${agentId}/approve`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');
  });

  it('GET /registry/agents/:id returns 404 for unknown agent', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/registry/agents/non-existent');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────── /registry/sites
describe('Registry – sites', () => {
  it('POST /registry/sites creates a pending site registration', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/registry/sites')
      .send({
        domain: 'mysite.com',
        ownerName: 'My Co',
        contactEmail: 'admin@mysite.com',
        description: 'Our main site',
      });
    expect(res.status).toBe(201);
    expect(res.body.siteId).toBeTruthy();
    expect(res.body.status).toBe('pending');
  });

  it('POST /registry/sites returns 409 for duplicate domain', async () => {
    const { app } = buildApp();
    const body = {
      domain: 'dup.com', ownerName: 'X', contactEmail: 'x@dup.com', description: 'X',
    };
    await request(app).post('/registry/sites').send(body);
    const res = await request(app).post('/registry/sites').send(body);
    expect(res.status).toBe(409);
  });

  it('PATCH /registry/sites/:id/approve approves the site', async () => {
    const { app } = buildApp();
    const regRes = await request(app).post('/registry/sites').send({
      domain: 'approved.com', ownerName: 'Y', contactEmail: 'y@y.com', description: 'Y',
    });
    const { siteId } = regRes.body;
    const approveRes = await request(app).patch(`/registry/sites/${siteId}/approve`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');
  });

  it('POST /registry/sites returns 400 for invalid domain', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/registry/sites')
      .send({ domain: 'not a domain!', ownerName: 'X', contactEmail: 'x@x.com', description: 'X' });
    expect(res.status).toBe(400);
  });

  it('GET /registry/sites/:id returns 404 for unknown site', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/registry/sites/non-existent');
    expect(res.status).toBe(404);
  });
});

