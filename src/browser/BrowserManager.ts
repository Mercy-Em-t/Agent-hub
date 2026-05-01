import { Browser, BrowserContext, chromium, firefox, webkit } from 'playwright';
import { AgentHubConfig, defaultConfig } from '../config';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

/**
 * Manages the lifecycle of browser instances for agent sessions.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private readonly config: AgentHubConfig;
  private readonly browserType: BrowserType;

  constructor(config: Partial<AgentHubConfig> = {}, browserType: BrowserType = 'chromium') {
    this.config = { ...defaultConfig, ...config };
    this.browserType = browserType;
  }

  /** Launch the underlying browser process (idempotent). */
  async launch(): Promise<void> {
    if (this.browser) return;

    const launcher =
      this.browserType === 'firefox'
        ? firefox
        : this.browserType === 'webkit'
        ? webkit
        : chromium;

    this.browser = await launcher.launch({
      headless: this.config.headless,
    });
  }

  /** Create a new isolated browser context (equivalent to a fresh browser profile). */
  async newContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.launch();
    }

    const ctx = await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36 AgentHub/0.1',
    });

    ctx.setDefaultNavigationTimeout(this.config.navigationTimeoutMs);
    ctx.setDefaultTimeout(this.config.actionTimeoutMs);

    return ctx;
  }

  /** Close a browser context and all its pages. */
  async closeContext(ctx: BrowserContext): Promise<void> {
    await ctx.close();
  }

  /** Shut down the browser process. */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  get isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}
