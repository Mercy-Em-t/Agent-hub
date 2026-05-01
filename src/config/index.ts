/**
 * Agent-hub configuration
 */
export interface AgentHubConfig {
  /** Maximum number of concurrent browser sessions */
  maxConcurrentSessions: number;
  /** Default navigation timeout in milliseconds */
  navigationTimeoutMs: number;
  /** Default action timeout in milliseconds */
  actionTimeoutMs: number;
  /** Whether to run the browser in headless mode */
  headless: boolean;
  /** REST API port */
  apiPort: number;
}

export const defaultConfig: AgentHubConfig = {
  maxConcurrentSessions: 10,
  navigationTimeoutMs: 30_000,
  actionTimeoutMs: 10_000,
  headless: true,
  apiPort: 3000,
};
