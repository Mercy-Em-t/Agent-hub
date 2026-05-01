import { BrowserContext } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { BrowserManager } from '../browser/BrowserManager';
import { PageController } from '../browser/PageController';
import { AgentHubConfig, defaultConfig } from '../config';

export type SessionStatus = 'idle' | 'running' | 'completed' | 'error';

export interface Session {
  id: string;
  createdAt: Date;
  status: SessionStatus;
  agentId?: string;
  error?: string;
}

/**
 * SessionManager is responsible for creating, tracking, and cleaning up
 * browser sessions.  Each session corresponds to an isolated browser context
 * (think: separate browser profile) so multiple agents can run concurrently
 * without interfering with each other.
 */
export class SessionManager {
  private readonly manager: BrowserManager;
  private readonly config: AgentHubConfig;
  private readonly sessions: Map<string, Session> = new Map();
  private readonly contexts: Map<string, BrowserContext> = new Map();

  constructor(manager: BrowserManager, config: Partial<AgentHubConfig> = {}) {
    this.manager = manager;
    this.config = { ...defaultConfig, ...config };
  }

  /** Create a new session and return its ID. */
  async create(agentId?: string): Promise<Session> {
    if (this.sessions.size >= this.config.maxConcurrentSessions) {
      throw new Error(
        `Maximum concurrent sessions (${this.config.maxConcurrentSessions}) reached.`,
      );
    }

    const id = uuidv4();
    const ctx = await this.manager.newContext();
    const session: Session = {
      id,
      createdAt: new Date(),
      status: 'idle',
      agentId,
    };

    this.contexts.set(id, ctx);
    this.sessions.set(id, session);
    return session;
  }

  /**
   * Open a new page inside the session's browser context and return a
   * PageController wrapping it.
   */
  async newPage(sessionId: string): Promise<PageController> {
    const ctx = this.contexts.get(sessionId);
    if (!ctx) {
      throw new Error(`Session "${sessionId}" not found.`);
    }
    const page = await ctx.newPage();
    return new PageController(page);
  }

  /** Mark a session as running. */
  setRunning(sessionId: string): void {
    this.updateStatus(sessionId, 'running');
  }

  /** Mark a session as completed. */
  setCompleted(sessionId: string): void {
    this.updateStatus(sessionId, 'completed');
  }

  /** Mark a session as errored and store the error message. */
  setError(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'error';
      session.error = error;
    }
  }

  /** Close and remove a session. */
  async close(sessionId: string): Promise<void> {
    const ctx = this.contexts.get(sessionId);
    if (ctx) {
      await ctx.close();
      this.contexts.delete(sessionId);
    }
    this.sessions.delete(sessionId);
  }

  /** Close all sessions. */
  async closeAll(): Promise<void> {
    for (const id of [...this.sessions.keys()]) {
      await this.close(id);
    }
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  private updateStatus(sessionId: string, status: SessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
    }
  }
}
