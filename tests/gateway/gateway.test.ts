import { AgentGateway } from '../../src/gateway/AgentGateway';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { SiteRegistry } from '../../src/registry/SiteRegistry';

function buildRegistries() {
  const agents = new AgentRegistry();
  const sites = new SiteRegistry();

  // Register and approve a site
  const site = sites.register({
    domain: 'example.com',
    ownerName: 'Acme',
    contactEmail: 'admin@example.com',
    description: 'Test site',
    allowedCapabilities: ['navigate', 'click', 'readContent'],
  });
  sites.approve(site.siteId);

  // Register an agent (not yet approved)
  const agentReg = agents.register({
    name: 'TestBot',
    description: 'A test agent',
    owner: 'Alice',
    contactEmail: 'alice@example.com',
    purpose: 'Testing',
    allowedDomains: ['example.com'],
    deniedDomains: [],
    allowedTools: [],
    constraints: [],
  });

  return { agents, sites, site, agentReg };
}

describe('AgentGateway', () => {
  it('allows an approved agent to access an approved site', () => {
    const { agents, sites, agentReg } = buildRegistries();
    agents.approve(agentReg.agentId);
    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'https://example.com');
    expect(result.allowed).toBe(true);
    expect(result.agent?.agentId).toBe(agentReg.agentId);
  });

  it('blocks an unregistered agentId', () => {
    const { agents, sites } = buildRegistries();
    const gw = new AgentGateway(agents, sites);
    const result = gw.check('unknown-id', 'any-key', 'https://example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not registered/);
  });

  it('blocks a wrong API key', () => {
    const { agents, sites, agentReg } = buildRegistries();
    agents.approve(agentReg.agentId);
    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, 'wrong-key', 'https://example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Invalid API key/);
  });

  it('blocks a pending (not yet approved) agent', () => {
    const { agents, sites, agentReg } = buildRegistries();
    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'https://example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not approved/);
  });

  it('blocks a revoked agent', () => {
    const { agents, sites, agentReg } = buildRegistries();
    agents.approve(agentReg.agentId);
    agents.revoke(agentReg.agentId);
    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'https://example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not approved/);
  });

  it('blocks access to a domain not registered as a site', () => {
    const { agents, sites, agentReg } = buildRegistries();
    agents.approve(agentReg.agentId);
    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'https://unregistered.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not registered as an approved site/);
  });

  it('blocks an agent whose allowedDomains excludes the target', () => {
    const agents = new AgentRegistry();
    const sites = new SiteRegistry();

    const site = sites.register({
      domain: 'other.com',
      ownerName: 'Other',
      contactEmail: 'o@other.com',
      description: 'Other site',
      allowedCapabilities: [],
    });
    sites.approve(site.siteId);

    const agentReg = agents.register({
      name: 'Restricted',
      description: 'Only allowed on example.com',
      owner: 'Bob',
      contactEmail: 'bob@example.com',
      purpose: 'Restricted test',
      allowedDomains: ['example.com'], // NOT other.com
      deniedDomains: [],
      allowedTools: [],
      constraints: [],
    });
    agents.approve(agentReg.agentId);

    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'https://other.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/allowed-domains/);
  });

  it('blocks an agent whose deniedDomains includes the target', () => {
    const agents = new AgentRegistry();
    const sites = new SiteRegistry();

    const site = sites.register({
      domain: 'example.com',
      ownerName: 'Acme',
      contactEmail: 'a@example.com',
      description: 'Site',
      allowedCapabilities: [],
    });
    sites.approve(site.siteId);

    const agentReg = agents.register({
      name: 'Bot',
      description: 'Bot with deniedDomains',
      owner: 'Alice',
      contactEmail: 'a@a.com',
      purpose: 'Test',
      allowedDomains: [],
      deniedDomains: ['example.com'],
      allowedTools: [],
      constraints: [],
    });
    agents.approve(agentReg.agentId);

    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'https://example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/denied-domains/);
  });

  it('blocks use of a tool not in agent allowedTools', () => {
    const { agents, sites, agentReg } = buildRegistries();
    // Override the allowedTools to restrict
    const restricted = agents.register({
      name: 'ReadOnly',
      description: 'Read-only bot',
      owner: 'Alice',
      contactEmail: 'a@example.com',
      purpose: 'Read only',
      allowedDomains: ['example.com'],
      deniedDomains: [],
      allowedTools: ['navigate', 'readContent'],
      constraints: [],
    });
    agents.approve(restricted.agentId);
    void agentReg;

    const gw = new AgentGateway(agents, sites);
    const result = gw.check(restricted.agentId, restricted.apiKey, 'https://example.com', ['click']);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not permitted to use tool/);
  });

  it('blocks use of a tool not in site allowedCapabilities', () => {
    const agents = new AgentRegistry();
    const sites = new SiteRegistry();

    // Site only allows navigate + readContent
    const site = sites.register({
      domain: 'readonly-site.com',
      ownerName: 'RO',
      contactEmail: 'ro@ro.com',
      description: 'Read only site',
      allowedCapabilities: ['navigate', 'readContent'],
    });
    sites.approve(site.siteId);

    const agentReg = agents.register({
      name: 'Bot',
      description: 'Bot',
      owner: 'Alice',
      contactEmail: 'a@a.com',
      purpose: 'Test',
      allowedDomains: [],
      deniedDomains: [],
      allowedTools: [],
      constraints: [],
    });
    agents.approve(agentReg.agentId);

    const gw = new AgentGateway(agents, sites);
    const result = gw.check(
      agentReg.agentId,
      agentReg.apiKey,
      'https://readonly-site.com',
      ['click'], // site disallows click
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/does not permit tool/);
  });

  it('returns an error for an invalid URL', () => {
    const { agents, sites, agentReg } = buildRegistries();
    agents.approve(agentReg.agentId);
    const gw = new AgentGateway(agents, sites);
    const result = gw.check(agentReg.agentId, agentReg.apiKey, 'not-a-url');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Invalid target URL/);
  });
});
