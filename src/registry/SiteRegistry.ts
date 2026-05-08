import { v4 as uuidv4 } from 'uuid';
import { Store, MemoryStore } from '../storage/Store';

export type SiteStatus = 'pending' | 'approved' | 'revoked';

/**
 * The declaration a website submits to participate in the Agent-hub ecosystem.
 * By registering, a site signals which agent-driven actions it consents to.
 *
 * No agent will be dispatched to a domain that is not registered and approved here.
 */
export interface SiteRegistration {
  /** System-assigned unique identifier */
  siteId: string;
  /**
   * The registered domain (e.g. "example.com").
   * Agents visiting "app.example.com" are matched against "example.com"
   * as well as "*.example.com".
   */
  domain: string;
  /** Name of the site owner / organization */
  ownerName: string;
  /** Contact e-mail for accountability and communication */
  contactEmail: string;
  /** Brief description of what the site does */
  description: string;
  /**
   * Tool names that agents are permitted to invoke on this site.
   * An empty array means "no agent-driven actions are allowed" —
   * effectively read-only (agents may still read content and take screenshots).
   * Use ["*"] to permit all tools.
   */
  allowedCapabilities: string[];
  status: SiteStatus;
  registeredAt: Date;
  approvedAt?: Date;
  revokedAt?: Date;
  /** Opaque secret issued at registration, for use by the site operator. */
  apiKey: string;
}

export type SiteRegistrationInput = Omit<
  SiteRegistration,
  'siteId' | 'status' | 'registeredAt' | 'approvedAt' | 'revokedAt' | 'apiKey'
>;

/**
 * SiteRegistry maintains the list of websites that have consented to
 * being operated on by Agent-hub agents.
 *
 * Lifecycle:
 *   register() → status: "pending"
 *   approve()  → status: "approved"  (agents may now visit)
 *   revoke()   → status: "revoked"   (agents are immediately blocked)
 */
export class SiteRegistry {
  private readonly sites: Store<SiteRegistration>;

  constructor(store?: Store<SiteRegistration>) {
    this.sites = store ?? new MemoryStore<SiteRegistration>();
  }

  /**
   * Register a new site.  Returns the full registration including the
   * generated siteId and apiKey.  Status starts as "pending" — agents
   * cannot visit the site until an operator calls approve().
   */
  register(input: SiteRegistrationInput): SiteRegistration {
    const existing = this.findByDomain(input.domain);
    if (existing && existing.status !== 'revoked') {
      throw new Error(
        `Domain "${input.domain}" is already registered (siteId: ${existing.siteId}).`,
      );
    }

    const registration: SiteRegistration = {
      ...input,
      siteId: uuidv4(),
      status: 'pending',
      registeredAt: new Date(),
      apiKey: uuidv4(),
    };
    this.sites.set(registration.siteId, registration);
    return registration;
  }

  /** Approve a pending site. */
  approve(siteId: string): SiteRegistration {
    const site = this.getOrThrow(siteId);
    if (site.status === 'revoked') {
      throw new Error(`Site "${siteId}" has been revoked and cannot be re-approved.`);
    }
    site.status = 'approved';
    site.approvedAt = new Date();
    this.sites.set(siteId, site);
    return site;
  }

  /** Revoke a site, immediately blocking agent access. */
  revoke(siteId: string): SiteRegistration {
    const site = this.getOrThrow(siteId);
    site.status = 'revoked';
    site.revokedAt = new Date();
    this.sites.set(siteId, site);
    return site;
  }

  /** Look up a site by its ID. */
  get(siteId: string): SiteRegistration | undefined {
    return this.sites.get(siteId);
  }

  /** Look up a site by its ID, throwing if not found. */
  getOrThrow(siteId: string): SiteRegistration {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site "${siteId}" is not registered.`);
    return site;
  }

  /** Find an approved registration whose domain matches the given hostname. */
  findApprovedByHostname(hostname: string): SiteRegistration | undefined {
    return this.list().find(
      (s) => s.status === 'approved' && domainMatches(hostname, s.domain),
    );
  }

  /** Find any registration for the given domain, regardless of status. */
  findByDomain(domain: string): SiteRegistration | undefined {
    const normalised = domain.toLowerCase();
    return this.list().find((s) => s.domain.toLowerCase() === normalised);
  }

  /** List all site registrations. */
  list(): SiteRegistration[] {
    return this.sites.values();
  }

  /** List only approved sites. */
  listApproved(): SiteRegistration[] {
    return this.list().filter((s) => s.status === 'approved');
  }
}

/**
 * Returns true when `hostname` is covered by `registeredDomain`.
 *
 * Rules:
 *  - Exact match:   "example.com"   covers "example.com"
 *  - Subdomain:     "example.com"   covers "sub.example.com"
 *  - Wildcard pfx:  "*.example.com" covers "sub.example.com"
 *                   but NOT "example.com" itself
 */
export function domainMatches(hostname: string, registeredDomain: string): boolean {
  const h = hostname.toLowerCase();
  const r = registeredDomain.toLowerCase();

  if (r === '*') return true;
  if (r === h) return true;

  if (r.startsWith('*.')) {
    const base = r.slice(2);
    return h.endsWith(`.${base}`);
  }

  // registeredDomain without wildcard also covers any subdomain
  return h === r || h.endsWith(`.${r}`);
}
