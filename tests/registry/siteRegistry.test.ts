import { SiteRegistry, domainMatches } from '../../src/registry/SiteRegistry';

const baseInput = {
  domain: 'example.com',
  ownerName: 'Acme Corp',
  contactEmail: 'admin@example.com',
  description: 'Main example site',
  allowedCapabilities: ['navigate', 'readContent'],
};

describe('SiteRegistry', () => {
  let registry: SiteRegistry;

  beforeEach(() => {
    registry = new SiteRegistry();
  });

  it('registers a site with pending status and generates siteId + apiKey', () => {
    const reg = registry.register(baseInput);
    expect(reg.siteId).toBeTruthy();
    expect(reg.apiKey).toBeTruthy();
    expect(reg.status).toBe('pending');
    expect(reg.registeredAt).toBeInstanceOf(Date);
  });

  it('get() returns the registration', () => {
    const reg = registry.register(baseInput);
    expect(registry.get(reg.siteId)).toEqual(reg);
  });

  it('rejects duplicate domain registration (non-revoked)', () => {
    registry.register(baseInput);
    expect(() => registry.register(baseInput)).toThrow('already registered');
  });

  it('allows re-registration of a revoked domain', () => {
    const first = registry.register(baseInput);
    registry.revoke(first.siteId);
    const second = registry.register(baseInput);
    expect(second.siteId).not.toBe(first.siteId);
  });

  it('approve() transitions status to approved', () => {
    const reg = registry.register(baseInput);
    const approved = registry.approve(reg.siteId);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it('revoke() transitions status to revoked', () => {
    const reg = registry.register(baseInput);
    registry.approve(reg.siteId);
    const revoked = registry.revoke(reg.siteId);
    expect(revoked.status).toBe('revoked');
  });

  it('approve() throws for a revoked site', () => {
    const reg = registry.register(baseInput);
    registry.revoke(reg.siteId);
    expect(() => registry.approve(reg.siteId)).toThrow('revoked');
  });

  it('findApprovedByHostname() finds an approved site by exact hostname', () => {
    const reg = registry.register(baseInput);
    registry.approve(reg.siteId);
    expect(registry.findApprovedByHostname('example.com')).toBeDefined();
  });

  it('findApprovedByHostname() finds site for subdomain', () => {
    const reg = registry.register(baseInput);
    registry.approve(reg.siteId);
    expect(registry.findApprovedByHostname('app.example.com')).toBeDefined();
  });

  it('findApprovedByHostname() returns undefined for a pending site', () => {
    registry.register(baseInput);
    expect(registry.findApprovedByHostname('example.com')).toBeUndefined();
  });

  it('listApproved() returns only approved sites', () => {
    const a = registry.register(baseInput);
    registry.register({ ...baseInput, domain: 'other.com', contactEmail: 'o@other.com' });
    registry.approve(a.siteId);
    expect(registry.listApproved()).toHaveLength(1);
  });
});

describe('domainMatches()', () => {
  it('exact match', () => expect(domainMatches('example.com', 'example.com')).toBe(true));
  it('subdomain covered by base', () => expect(domainMatches('app.example.com', 'example.com')).toBe(true));
  it('deep subdomain covered by base', () => expect(domainMatches('a.b.example.com', 'example.com')).toBe(true));
  it('wildcard covers subdomain', () => expect(domainMatches('app.example.com', '*.example.com')).toBe(true));
  it('wildcard does NOT cover apex', () => expect(domainMatches('example.com', '*.example.com')).toBe(false));
  it('no match for unrelated domain', () => expect(domainMatches('other.com', 'example.com')).toBe(false));
  it('"*" matches anything', () => expect(domainMatches('any.thing.com', '*')).toBe(true));
});
