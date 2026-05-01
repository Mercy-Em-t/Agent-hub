import { v4 as uuidv4 } from 'uuid';

export type AgentStatus = 'pending' | 'approved' | 'revoked';

/**
 * Explicit bounds of what an agent is and is not responsible for.
 * Helps operators and site owners understand the exact scope of the agent.
 */
export interface ResponsibilityBounds {
  /** Tasks and outcomes the agent IS accountable for */
  responsible: string[];
  /** Tasks and outcomes the agent is explicitly NOT accountable for */
  notResponsible: string[];
}

/**
 * The declaration an AI agent must submit before it is permitted to operate.
 * Every field answers a governance question:
 *   - name / owner / contactEmail      → who is this agent and who is accountable?
 *   - purpose / description            → why is it here and what does it do?
 *   - goals                            → what outcomes is it trying to achieve?
 *   - workingProcedure                 → how does it carry out its work step-by-step?
 *   - responsibilityBounds             → what is it explicitly responsible / not responsible for?
 *   - website                          → what is its primary home URL?
 *   - allowedDomains / deniedDomains   → where may it go?
 *   - allowedTools                     → what actions may it perform?
 *   - constraints                      → explicit ethical / operational rules
 *   - ownerPhone                       → WhatsApp number for owner notifications
 */
export interface AgentRegistration {
  /** System-assigned unique identifier */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Brief description of what this agent does */
  description: string;
  /** Name of the person or organisation that owns this agent */
  owner: string;
  /** Contact e-mail for the owner — used for accountability */
  contactEmail: string;
  /**
   * Explicit statement of purpose: why this agent exists and what
   * business goal it serves.  Agents must not act outside this scope.
   */
  purpose: string;
  /**
   * High-level goals the agent is trying to achieve.
   * Answers "what outcomes should this agent produce?"
   */
  goals?: string[];
  /**
   * Ordered list of steps describing how the agent carries out its work.
   * Serves as a human-readable standard operating procedure (SOP).
   */
  workingProcedure?: string[];
  /**
   * Explicit bounds of what this agent is and is not responsible for.
   * Prevents scope creep and sets clear expectations for operators and site owners.
   */
  responsibilityBounds?: ResponsibilityBounds;
  /**
   * Primary home website URL for this agent (e.g. "https://mybot.example.com").
   * Used for documentation and the WhatsApp info command.
   */
  website?: string;
  /**
   * Domains the agent is permitted to visit.
   * Supports exact match ("example.com") and wildcard subdomain
   * ("*.example.com").  An empty array means "any approved site".
   */
  allowedDomains: string[];
  /**
   * Domains the agent must never visit, regardless of allowedDomains.
   * Takes precedence over allowedDomains.
   */
  deniedDomains: string[];
  /**
   * Tool names the agent may invoke.
   * An empty array means "all built-in tools".
   */
  allowedTools: string[];
  /**
   * Human-readable behavioural constraints, e.g.
   * "never submit payment forms", "read-only access only".
   */
  constraints: string[];
  status: AgentStatus;
  registeredAt: Date;
  approvedAt?: Date;
  revokedAt?: Date;
  /** Opaque secret issued at registration; must be supplied on every run request. */
  apiKey: string;
  /**
   * Owner's WhatsApp phone number in E.164 format (e.g. "+1234567890").
   * When set, the owner receives lifecycle notifications (registered, approved,
   * revoked) and can issue commands to manage their agents via WhatsApp.
   */
  ownerPhone?: string;
}

export type AgentRegistrationInput = Omit<
  AgentRegistration,
  'agentId' | 'status' | 'registeredAt' | 'approvedAt' | 'revokedAt' | 'apiKey'
>;

/**
 * AgentRegistry is the central store that governs which AI agents
 * are permitted to operate in the hub.
 *
 * Lifecycle:
 *   register() → status: "pending"
 *   approve()  → status: "approved"  (agent can now run tasks)
 *   revoke()   → status: "revoked"   (agent is immediately blocked)
 */
export class AgentRegistry {
  private readonly agents: Map<string, AgentRegistration> = new Map();

  /**
   * Register a new agent.  Returns the full registration including the
   * generated agentId and apiKey.  Status starts as "pending" — the agent
   * cannot operate until an operator calls approve().
   */
  register(input: AgentRegistrationInput): AgentRegistration {
    const registration: AgentRegistration = {
      ...input,
      agentId: uuidv4(),
      status: 'pending',
      registeredAt: new Date(),
      apiKey: uuidv4(),
    };
    this.agents.set(registration.agentId, registration);
    return registration;
  }

  /** Approve a pending agent, granting it permission to operate. */
  approve(agentId: string): AgentRegistration {
    const agent = this.getOrThrow(agentId);
    if (agent.status === 'revoked') {
      throw new Error(`Agent "${agentId}" has been revoked and cannot be re-approved.`);
    }
    agent.status = 'approved';
    agent.approvedAt = new Date();
    return agent;
  }

  /** Revoke an agent, immediately blocking all future operations. */
  revoke(agentId: string): AgentRegistration {
    const agent = this.getOrThrow(agentId);
    agent.status = 'revoked';
    agent.revokedAt = new Date();
    return agent;
  }

  /** Look up an agent by its ID. Returns undefined if not found. */
  get(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId);
  }

  /** Look up an agent, throwing if not found. */
  getOrThrow(agentId: string): AgentRegistration {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent "${agentId}" is not registered.`);
    return agent;
  }

  /**
   * Find an agent by its exact name (case-insensitive) or by the leading
   * characters of its UUID (minimum 4 characters).  Returns the first match.
   */
  findByNameOrId(query: string): AgentRegistration | undefined {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return undefined;
    return [...this.agents.values()].find(
      (a) =>
        a.name.toLowerCase() === q ||
        a.agentId.toLowerCase().startsWith(q),
    );
  }

  /**
   * Find all agents whose ownerPhone matches the given E.164 number.
   */
  findByOwnerPhone(phone: string): AgentRegistration[] {
    return [...this.agents.values()].filter((a) => a.ownerPhone === phone);
  }

  /** List all registered agents (all statuses). */
  list(): AgentRegistration[] {
    return [...this.agents.values()];
  }

  /** List only approved agents. */
  listApproved(): AgentRegistration[] {
    return this.list().filter((a) => a.status === 'approved');
  }
}
