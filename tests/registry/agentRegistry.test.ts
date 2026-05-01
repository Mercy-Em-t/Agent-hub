import { AgentRegistry } from '../../src/registry/AgentRegistry';

const baseInput = {
  name: 'TestBot',
  description: 'A test agent',
  owner: 'Alice',
  contactEmail: 'alice@example.com',
  purpose: 'Automate testing tasks',
  allowedDomains: ['example.com'],
  deniedDomains: [],
  allowedTools: [],
  constraints: ['Read-only access only'],
};

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('registers an agent with pending status and generates agentId + apiKey', () => {
    const reg = registry.register(baseInput);
    expect(reg.agentId).toBeTruthy();
    expect(reg.apiKey).toBeTruthy();
    expect(reg.status).toBe('pending');
    expect(reg.registeredAt).toBeInstanceOf(Date);
    expect(reg.approvedAt).toBeUndefined();
  });

  it('get() returns the registration by agentId', () => {
    const reg = registry.register(baseInput);
    expect(registry.get(reg.agentId)).toEqual(reg);
  });

  it('get() returns undefined for an unknown agentId', () => {
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('list() returns all registered agents', () => {
    registry.register(baseInput);
    registry.register({ ...baseInput, name: 'BotTwo', contactEmail: 'b@example.com' });
    expect(registry.list()).toHaveLength(2);
  });

  it('approve() transitions status to approved', () => {
    const reg = registry.register(baseInput);
    const approved = registry.approve(reg.agentId);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it('revoke() transitions status to revoked', () => {
    const reg = registry.register(baseInput);
    registry.approve(reg.agentId);
    const revoked = registry.revoke(reg.agentId);
    expect(revoked.status).toBe('revoked');
    expect(revoked.revokedAt).toBeInstanceOf(Date);
  });

  it('approve() throws for a revoked agent', () => {
    const reg = registry.register(baseInput);
    registry.revoke(reg.agentId);
    expect(() => registry.approve(reg.agentId)).toThrow('revoked');
  });

  it('getOrThrow() throws for an unknown agentId', () => {
    expect(() => registry.getOrThrow('unknown')).toThrow('not registered');
  });

  it('listApproved() returns only approved agents', () => {
    const a = registry.register(baseInput);
    registry.register({ ...baseInput, name: 'B', contactEmail: 'b@x.com' });
    registry.approve(a.agentId);
    expect(registry.listApproved()).toHaveLength(1);
    expect(registry.listApproved()[0].agentId).toBe(a.agentId);
  });
});
