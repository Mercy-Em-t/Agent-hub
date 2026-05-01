import request from 'supertest';
import { createApp } from '../../src/api/server';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { SiteRegistry } from '../../src/registry/SiteRegistry';
import { SessionManager } from '../../src/sessions/SessionManager';
import { BrowserManager } from '../../src/browser/BrowserManager';
import { JobStore } from '../../src/jobs/JobStore';
import { NullWhatsAppNotifier, IWhatsAppNotifier } from '../../src/notifications/WhatsAppNotifier';

function buildApp(notifier?: IWhatsAppNotifier) {
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
  const whatsapp = notifier ?? new NullWhatsAppNotifier();

  return {
    app: createApp(sessions, agentRegistry, siteRegistry, jobStore, whatsapp),
    agentRegistry,
  };
}

/** Register an agent with a phone number and return it. */
function registerAgent(
  agentRegistry: AgentRegistry,
  overrides: Partial<Parameters<AgentRegistry['register']>[0]> = {},
) {
  return agentRegistry.register({
    name: 'TestBot',
    description: 'Test agent',
    owner: 'Alice',
    contactEmail: 'alice@example.com',
    purpose: 'Integration testing',
    allowedDomains: [],
    deniedDomains: [],
    allowedTools: [],
    constraints: [],
    ownerPhone: '+15550001234',
    goals: ['Complete testing tasks'],
    workingProcedure: ['Navigate to page', 'Read content'],
    responsibilityBounds: {
      responsible: ['Reading public pages'],
      notResponsible: ['Making purchases'],
    },
    website: 'https://testbot.example.com',
    ...overrides,
  });
}

// ── POST /whatsapp/webhook — help ────────────────────────────────────────────

describe('WhatsApp webhook – help', () => {
  it('returns a TwiML help message', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'help' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/xml/);
    expect(res.text).toContain('<Response>');
    expect(res.text).toContain('list');
    expect(res.text).toContain('approve');
  });
});

// ── POST /whatsapp/webhook — empty body ──────────────────────────────────────

describe('WhatsApp webhook – empty message', () => {
  it('returns a welcome TwiML message', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: '' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Welcome');
  });
});

// ── POST /whatsapp/webhook — unknown command ─────────────────────────────────

describe('WhatsApp webhook – unknown command', () => {
  it('replies with an unknown-command message', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'fly' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Unknown command');
  });
});

// ── POST /whatsapp/webhook — list ────────────────────────────────────────────

describe('WhatsApp webhook – list', () => {
  it('reports no agents when none are registered to this number', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'list' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('no registered agents');
  });

  it('lists agents owned by the sender', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'list' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('TestBot');
    expect(res.text).toContain('pending');
  });

  it('does not list agents owned by a different number', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry, { ownerPhone: '+19990009999' });

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'list' });

    expect(res.text).toContain('no registered agents');
  });
});

// ── POST /whatsapp/webhook — status ──────────────────────────────────────────

describe('WhatsApp webhook – status', () => {
  it('returns status for an agent found by name', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'status TestBot' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('TestBot');
    expect(res.text).toContain('PENDING');
  });

  it('returns status for an agent found by partial ID', async () => {
    const { app, agentRegistry } = buildApp();
    const agent = registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: `status ${agent.agentId.slice(0, 8)}` });

    expect(res.text).toContain('TestBot');
  });

  it('returns not-found for an unknown agent', async () => {
    const { app } = buildApp();

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'status NoSuchBot' });

    expect(res.text).toContain('No agent found');
  });

  it('replies with usage when no query is given', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'status' });

    expect(res.text).toContain('Usage:');
  });
});

// ── POST /whatsapp/webhook — approve ─────────────────────────────────────────

describe('WhatsApp webhook – approve', () => {
  it('approves an owned agent', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'approve TestBot' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('approved');
    expect(agentRegistry.findByNameOrId('TestBot')!.status).toBe('approved');
  });

  it('rejects approval from a non-owner', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+19990009999', Body: 'approve TestBot' });

    expect(res.text).toContain('do not own');
    expect(agentRegistry.findByNameOrId('TestBot')!.status).toBe('pending');
  });

  it('reports an error when trying to approve a revoked agent', async () => {
    const { app, agentRegistry } = buildApp();
    const agent = registerAgent(agentRegistry);
    agentRegistry.revoke(agent.agentId);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'approve TestBot' });

    expect(res.text).toContain('Error:');
  });
});

// ── POST /whatsapp/webhook — revoke ──────────────────────────────────────────

describe('WhatsApp webhook – revoke', () => {
  it('revokes an owned agent', async () => {
    const { app, agentRegistry } = buildApp();
    const agent = registerAgent(agentRegistry);
    agentRegistry.approve(agent.agentId);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'revoke TestBot' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('revoked');
    expect(agentRegistry.findByNameOrId('TestBot')!.status).toBe('revoked');
  });

  it('rejects revocation from a non-owner', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+19990009999', Body: 'revoke TestBot' });

    expect(res.text).toContain('do not own');
  });
});

// ── POST /whatsapp/webhook — info ─────────────────────────────────────────────

describe('WhatsApp webhook – info', () => {
  it('returns full onboarding details for an agent', async () => {
    const { app, agentRegistry } = buildApp();
    registerAgent(agentRegistry);

    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'info TestBot' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('TestBot');
    expect(res.text).toContain('Purpose:');
    expect(res.text).toContain('Goals:');
    expect(res.text).toContain('Procedure:');
    expect(res.text).toContain('Responsible for:');
    expect(res.text).toContain('Website:');
    expect(res.text).toContain('testbot.example.com');
  });

  it('returns not-found for an unknown agent', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/whatsapp/webhook')
      .type('form')
      .send({ From: 'whatsapp:+15550001234', Body: 'info GhostBot' });

    expect(res.text).toContain('No agent found');
  });
});

// ── Notification side-effects via mock notifier ───────────────────────────────

describe('WhatsApp notifications on registry events', () => {
  it('notifies the owner when an agent is registered', async () => {
    const mockNotifier: IWhatsAppNotifier = { send: jest.fn().mockResolvedValue(undefined) };
    const { app } = buildApp(mockNotifier);

    await request(app)
      .post('/registry/agents')
      .send({
        name: 'NotifyBot',
        description: 'Notification test',
        owner: 'Bob',
        contactEmail: 'bob@example.com',
        purpose: 'Test notifications',
        ownerPhone: '+15550001234',
      });

    // Allow fire-and-forget to resolve
    await new Promise((r) => setTimeout(r, 10));

    expect(mockNotifier.send).toHaveBeenCalledWith(
      '+15550001234',
      expect.stringContaining('NotifyBot'),
    );
  });

  it('notifies the owner when an agent is approved', async () => {
    const mockNotifier: IWhatsAppNotifier = { send: jest.fn().mockResolvedValue(undefined) };
    const { app, agentRegistry } = buildApp(mockNotifier);
    const agent = registerAgent(agentRegistry);

    await request(app).patch(`/registry/agents/${agent.agentId}/approve`);

    await new Promise((r) => setTimeout(r, 10));

    expect(mockNotifier.send).toHaveBeenCalledWith(
      '+15550001234',
      expect.stringContaining('APPROVED'),
    );
  });

  it('notifies the owner when an agent is revoked', async () => {
    const mockNotifier: IWhatsAppNotifier = { send: jest.fn().mockResolvedValue(undefined) };
    const { app, agentRegistry } = buildApp(mockNotifier);
    const agent = registerAgent(agentRegistry);
    agentRegistry.approve(agent.agentId);

    await request(app).patch(`/registry/agents/${agent.agentId}/revoke`);

    await new Promise((r) => setTimeout(r, 10));

    expect(mockNotifier.send).toHaveBeenCalledWith(
      '+15550001234',
      expect.stringContaining('REVOKED'),
    );
  });

  it('does not call notifier when ownerPhone is not set', async () => {
    const mockNotifier: IWhatsAppNotifier = { send: jest.fn().mockResolvedValue(undefined) };
    const { app } = buildApp(mockNotifier);

    await request(app)
      .post('/registry/agents')
      .send({
        name: 'SilentBot',
        description: 'No phone',
        owner: 'Eve',
        contactEmail: 'eve@example.com',
        purpose: 'Quiet testing',
      });

    await new Promise((r) => setTimeout(r, 10));

    expect(mockNotifier.send).not.toHaveBeenCalled();
  });
});
