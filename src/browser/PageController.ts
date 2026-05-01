import { Page } from 'playwright';

export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
}

export interface ClickOptions {
  /** CSS selector or text selector */
  selector: string;
  /** Delay in ms between mousedown and mouseup (simulates human timing) */
  delayMs?: number;
}

export interface FillOptions {
  selector: string;
  value: string;
}

export interface SelectOptions {
  selector: string;
  /** Option value(s) to select */
  values: string[];
}

export interface HoverOptions {
  selector: string;
}

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface ScrollOptions {
  /** If omitted, the page root is scrolled. */
  selector?: string;
  direction: ScrollDirection;
  /** Number of pixels to scroll. Defaults to 500. */
  distance?: number;
}

export interface PageSnapshot {
  url: string;
  title: string;
  /** Simplified visible text extracted from the page body */
  bodyText: string;
}

/**
 * High-level controller that wraps a Playwright Page and exposes
 * the actions an AI agent needs to interact with web content.
 */
export class PageController {
  constructor(private readonly page: Page) {}

  /** Navigate to a URL and wait for the page to be ready. */
  async navigate(url: string, options: NavigateOptions = {}): Promise<void> {
    await this.page.goto(url, {
      waitUntil: options.waitUntil ?? 'domcontentloaded',
    });
  }

  /** Click a visible element identified by a CSS/text selector. */
  async click(options: ClickOptions): Promise<void> {
    const locator = this.page.locator(options.selector).first();
    await locator.click({ delay: options.delayMs ?? 50 });
  }

  /** Fill a text input or textarea. */
  async fill(options: FillOptions): Promise<void> {
    const locator = this.page.locator(options.selector).first();
    await locator.fill(options.value);
  }

  /** Hover the mouse over an element identified by a CSS selector. */
  async hover(options: HoverOptions): Promise<void> {
    const locator = this.page.locator(options.selector).first();
    await locator.hover();
  }

  /**
   * Scroll the page or a specific element in the given direction.
   *
   * @param options.selector  CSS selector of the element to scroll (omit to scroll the window).
   * @param options.direction One of "up" | "down" | "left" | "right".
   * @param options.distance  Pixels to scroll (defaults to 500).
   */
  async scroll(options: ScrollOptions): Promise<void> {
    const distance = options.distance ?? 500;
    const deltaX = options.direction === 'right' ? distance : options.direction === 'left' ? -distance : 0;
    const deltaY = options.direction === 'down' ? distance : options.direction === 'up' ? -distance : 0;

    if (options.selector) {
      await this.page.locator(options.selector).first().hover();
      await this.page.mouse.wheel(deltaX, deltaY);
    } else {
      await this.page.evaluate(
        ({ dx, dy }: { dx: number; dy: number }) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).window?.scrollBy(dx, dy) ?? (globalThis as any).scrollBy?.(dx, dy),
        { dx: deltaX, dy: deltaY },
      );
    }
  }

  /** Select one or more options in a <select> element. */
  async select(options: SelectOptions): Promise<void> {
    await this.page.selectOption(options.selector, options.values);
  }

  /** Press a keyboard key (e.g. "Enter", "Tab", "Escape"). */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Extract a snapshot of the current page for the agent to reason about.
   * Returns URL, title, and the visible body text (stripped of HTML).
   */
  async snapshot(): Promise<PageSnapshot> {
    const url = this.page.url();
    const title = await this.page.title();
    const bodyText: string = await this.page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (globalThis as any).document?.body?.innerText ?? '',
    );
    return { url, title, bodyText };
  }

  /**
   * Wait for a selector to appear in the DOM.
   */
  async waitForSelector(selector: string, timeoutMs?: number): Promise<void> {
    await this.page.waitForSelector(selector, {
      state: 'visible',
      ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {}),
    });
  }

  /**
   * Capture a full-page screenshot and return it as a PNG Buffer.
   */
  async screenshot(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: true });
  }

  /**
   * Read the text content of a matched element.
   */
  async readText(selector: string): Promise<string> {
    const locator = this.page.locator(selector).first();
    return (await locator.textContent()) ?? '';
  }

  /**
   * Evaluate arbitrary JavaScript in the page context.
   * Agents can use this as an escape-hatch for complex interactions.
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    return this.page.evaluate(fn);
  }

  get currentUrl(): string {
    return this.page.url();
  }
}
