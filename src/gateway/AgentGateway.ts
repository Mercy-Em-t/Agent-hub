import { AgentRegistry, AgentRegistration } from '../registry/AgentRegistry';
import { SiteRegistry, domainMatches } from '../registry/SiteRegistry';

export interface GatewayCheckResult {
  allowed: boolean;
  agent?: AgentRegistration;
  reason?: string;
}

/**
 * AgentGateway is the entry-point enforcement layer.
 *
 * Before any agent is allowed to open a browser session and start executing
 * tasks, it must pass through the gateway, which verifies:
 *
 *  1. The agent is registered and its apiKey matches.
 *  2. The agent has been approved by a hub operator.
 *  3. The target URL's domain is registered and approved (site consent).
 *  4. The agent's allowedDomains include the target (if not empty).
 *  5. The agent's deniedDomains do not include the target.
 *  6. Every tool the agent intends to use is in its allowedTools (if restricted)
 *     AND in the site's allowedCapabilities.
 */
export class AgentGateway {
  constructor(
    private readonly agents: AgentRegistry,
    private readonly sites: SiteRegistry,
  ) {}

  /**
   * Perform a full gateway check for an agent attempting to run against a URL.
   *
   * @param agentId  The agent's registered ID.
   * @param apiKey   The secret issued at agent registration.
   * @param targetUrl  The URL the agent intends to start from.
   * @param intendedTools  Tools the agent plans to use (optional; validated if provided).
   */
  check(
    agentId: string,
    apiKey: string,
    targetUrl: string,
    intendedTools: string[] = [],
  ): GatewayCheckResult {
    // 1. Agent must be registered
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { allowed: false, reason: `Agent "${agentId}" is not registered.` };
    }

    // 2. API key must match
    if (agent.apiKey !== apiKey) {
      return { allowed: false, reason: 'Invalid API key.' };
    }

    // 3. Agent must be approved
    if (agent.status !== 'approved') {
      return {
        allowed: false,
        reason: `Agent "${agentId}" is not approved (status: ${agent.status}).`,
      };
    }

    // 4. Parse the target URL and extract the hostname
    let hostname: string;
    try {
      hostname = new URL(targetUrl).hostname;
    } catch {
      return { allowed: false, reason: `Invalid target URL: "${targetUrl}".` };
    }

    // 5. Target site must be registered and approved
    const site = this.sites.findApprovedByHostname(hostname);
    if (!site) {
      return {
        allowed: false,
        reason:
          `Domain "${hostname}" is not registered as an approved site. ` +
          'The site must sign up via POST /registry/sites and be approved before agents can visit.',
      };
    }

    // 6. Check agent's denied domains
    if (agent.deniedDomains.some((d) => domainMatches(hostname, d))) {
      return {
        allowed: false,
        reason: `Domain "${hostname}" is in this agent's denied-domains list.`,
      };
    }

    // 7. Check agent's allowed domains (empty = any approved site)
    if (
      agent.allowedDomains.length > 0 &&
      !agent.allowedDomains.some((d) => domainMatches(hostname, d))
    ) {
      return {
        allowed: false,
        reason:
          `Domain "${hostname}" is not in this agent's allowed-domains list.`,
      };
    }

    // 8. Validate intended tools against agent's allowedTools
    if (agent.allowedTools.length > 0 && intendedTools.length > 0) {
      const forbidden = intendedTools.filter((t) => !agent.allowedTools.includes(t));
      if (forbidden.length > 0) {
        return {
          allowed: false,
          reason: `Agent is not permitted to use tool(s): ${forbidden.join(', ')}.`,
        };
      }
    }

    // 9. Validate intended tools against site's allowedCapabilities
    if (intendedTools.length > 0) {
      const siteAllowsAll =
        site.allowedCapabilities.length === 0 || site.allowedCapabilities.includes('*');

      if (!siteAllowsAll) {
        const forbidden = intendedTools.filter(
          (t) => !site.allowedCapabilities.includes(t),
        );
        if (forbidden.length > 0) {
          return {
            allowed: false,
            reason:
              `Site "${hostname}" does not permit tool(s): ${forbidden.join(', ')}.`,
          };
        }
      }
    }

    return { allowed: true, agent };
  }
}
