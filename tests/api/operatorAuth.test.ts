/**
 * Tests for operator authentication middleware applied to admin endpoints:
 *   PATCH /registry/agents/:id/approve
 *   PATCH /registry/agents/:id/revoke
 *   PATCH /registry/sites/:id/approve
 *   PATCH /registry/sites/:id/revoke
 */
import request from 'supertest';
import { createApp } from '../../src/api/server';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { SiteRegistry } from '../../src/registry/SiteRegistry';
import { SessionManager } from '../../src/sessions/SessionManager';
import { BrowserManager } from '../../src/browser/BrowserManager';
import { JobStore } from '../../src/jobs/JobStore';
import { NullWhatsAppNotifier } from '../../src/notifications/WhatsAppNotifier';
import { operatorAuthMiddleware } from '../../src/api/middleware/operatorAuth';

const TEST_KEY = 'test-operator-secret';

function buildApp() {
  const browserManager = {
    launch: jest.fn(),
    newContext: jest.fn(),
    close: jest.fn(),
    isRunning: false,
  } as unknown as BrowserManager;

  const agentRegistry = new AgentRegistry();
  const siteRegistry = new SiteRegistry();
  const sessions = new SessionManager(browserManager);
  const jobStore = new JobStore();

  return {
    app: createApp(sessions, agentRegistry, siteRegistry, jobStore, new NullWhatsAppNotifier()),
    agentRegistry,
    siteRegistry,
  };
}

/** Register an agent and return its agentId. */
function registerAgent(agentRegistry: AgentRegistry): string {
  const reg = agentRegistry.register({
    name: 'AuthBot',
    description: 'Auth test agent',
    owner: 'Tester',
    contactEmail: 'test@example.com',
    purpose: 'Testing operator auth',
    allowedDomains: [],
    deniedDomains: [],
    allowedTools: [],
    constraints: [],
  });
  return reg.agentId;
}

/** Register a site and return its siteId. */
function registerSite(siteRegistry: SiteRegistry): string {
  const reg = siteRegistry.register({
    domain: 'authtest.com',
    ownerName: 'Auth Tester',
    contactEmail: 'test@authtest.com',
    description: 'Auth test site',
    allowedCapabilities: [],
  });
  return reg.siteId;
}

// ── When OPERATOR_API_KEY is NOT set (no-op mode) ────────────────────────────

describe('Operator auth — OPERATOR_API_KEY not set (passthrough)', () => {
  beforeAll(() => {
    delete process.env.OPERATOR_API_KEY;
  });

  it('allows approve agent without any key', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app).patch(`/registry/agents/${agentId}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('allows revoke agent without any key', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app).patch(`/registry/agents/${agentId}/revoke`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revoked');
  });

  it('allows approve site without any key', async () => {
    const { app, siteRegistry } = buildApp();
    const siteId = registerSite(siteRegistry);
    const res = await request(app).patch(`/registry/sites/${siteId}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('allows revoke site without any key', async () => {
    const { app, siteRegistry } = buildApp();
    const siteId = registerSite(siteRegistry);
    const res = await request(app).patch(`/registry/sites/${siteId}/revoke`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revoked');
  });
});

// ── When OPERATOR_API_KEY IS set ─────────────────────────────────────────────

describe('Operator auth — OPERATOR_API_KEY set', () => {
  beforeAll(() => {
    process.env.OPERATOR_API_KEY = TEST_KEY;
  });

  afterAll(() => {
    delete process.env.OPERATOR_API_KEY;
  });

  // ── Agent endpoints ──────────────────────────────────────────────────────

  it('rejects approve agent when no key is supplied → 401', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app).patch(`/registry/agents/${agentId}/approve`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Operator authentication required/);
  });

  it('rejects approve agent when wrong key is supplied → 401', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app)
      .patch(`/registry/agents/${agentId}/approve`)
      .set('X-Operator-Key', 'wrong-key');
    expect(res.status).toBe(401);
  });

  it('allows approve agent with correct X-Operator-Key header', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app)
      .patch(`/registry/agents/${agentId}/approve`)
      .set('X-Operator-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('allows approve agent with correct Authorization: Bearer header', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app)
      .patch(`/registry/agents/${agentId}/approve`)
      .set('Authorization', `Bearer ${TEST_KEY}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('rejects revoke agent when no key is supplied → 401', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app).patch(`/registry/agents/${agentId}/revoke`);
    expect(res.status).toBe(401);
  });

  it('allows revoke agent with correct key', async () => {
    const { app, agentRegistry } = buildApp();
    const agentId = registerAgent(agentRegistry);
    const res = await request(app)
      .patch(`/registry/agents/${agentId}/revoke`)
      .set('X-Operator-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revoked');
  });

  // ── Site endpoints ───────────────────────────────────────────────────────

  it('rejects approve site when no key is supplied → 401', async () => {
    const { app, siteRegistry } = buildApp();
    const siteId = registerSite(siteRegistry);
    const res = await request(app).patch(`/registry/sites/${siteId}/approve`);
    expect(res.status).toBe(401);
  });

  it('allows approve site with correct key', async () => {
    const { app, siteRegistry } = buildApp();
    const siteId = registerSite(siteRegistry);
    const res = await request(app)
      .patch(`/registry/sites/${siteId}/approve`)
      .set('X-Operator-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('rejects revoke site when no key is supplied → 401', async () => {
    const { app, siteRegistry } = buildApp();
    const siteId = registerSite(siteRegistry);
    const res = await request(app).patch(`/registry/sites/${siteId}/revoke`);
    expect(res.status).toBe(401);
  });

  it('allows revoke site with correct key', async () => {
    const { app, siteRegistry } = buildApp();
    const siteId = registerSite(siteRegistry);
    const res = await request(app)
      .patch(`/registry/sites/${siteId}/revoke`)
      .set('X-Operator-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('revoked');
  });

  // ── Non-admin endpoints are not affected ─────────────────────────────────

  it('GET /registry/agents is not gated by operator auth', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/registry/agents');
    expect(res.status).toBe(200);
  });

  it('POST /registry/agents is not gated by operator auth', async () => {
    const { app } = buildApp();
    const res = await request(app).post('/registry/agents').send({
      name: 'PublicBot',
      description: 'D',
      owner: 'O',
      contactEmail: 'o@o.com',
      purpose: 'P',
    });
    expect(res.status).toBe(201);
  });

  // ── operatorAuthMiddleware unit test ─────────────────────────────────────

  it('middleware: passes through when OPERATOR_API_KEY is unset', () => {
    delete process.env.OPERATOR_API_KEY;
    const next = jest.fn();
    const req = { headers: {} } as unknown as Parameters<typeof operatorAuthMiddleware>[0];
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Parameters<typeof operatorAuthMiddleware>[1];
    operatorAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    // Restore for other tests in this describe block
    process.env.OPERATOR_API_KEY = TEST_KEY;
  });
});
