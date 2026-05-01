import { NavigationTool } from '../../src/tools/NavigationTool';
import { ClickTool } from '../../src/tools/ClickTool';
import { FillFormTool } from '../../src/tools/FillFormTool';
import { ReadContentTool } from '../../src/tools/ReadContentTool';
import { ScreenshotTool } from '../../src/tools/ScreenshotTool';
import { WaitForSelectorTool } from '../../src/tools/WaitForSelectorTool';
import { SelectOptionTool } from '../../src/tools/SelectOptionTool';
import { HoverTool } from '../../src/tools/HoverTool';
import { ScrollTool } from '../../src/tools/ScrollTool';
import { KeyPressTool } from '../../src/tools/KeyPressTool';
import { PageController } from '../../src/browser/PageController';

/** Build a minimal mock PageController so tests don't need a real browser. */
function mockPage(overrides: Record<string, unknown> = {}): PageController {
  return {
    navigate: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    select: jest.fn().mockResolvedValue(undefined),
    pressKey: jest.fn().mockResolvedValue(undefined),
    hover: jest.fn().mockResolvedValue(undefined),
    scroll: jest.fn().mockResolvedValue(undefined),
    snapshot: jest.fn().mockResolvedValue({
      url: 'https://example.com',
      title: 'Example',
      bodyText: 'Hello world',
    }),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
    readText: jest.fn().mockResolvedValue('Sample text'),
    evaluate: jest.fn().mockResolvedValue(null),
    currentUrl: 'https://example.com',
    ...overrides,
  } as unknown as PageController;
}

// ──────────────────────────────────────────────────────────────── NavigationTool
describe('NavigationTool', () => {
  it('returns a page snapshot on successful navigation', async () => {
    const page = mockPage();
    const result = await NavigationTool.execute({ url: 'https://example.com' }, page);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ url: 'https://example.com', title: 'Example' });
    expect(page.navigate).toHaveBeenCalledWith('https://example.com', {});
  });

  it('returns an error when navigation throws', async () => {
    const page = mockPage({
      navigate: jest.fn().mockRejectedValue(new Error('net::ERR_NAME_NOT_RESOLVED')),
    });
    const result = await NavigationTool.execute({ url: 'https://bad.invalid' }, page);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ERR_NAME_NOT_RESOLVED/);
  });

  it('rejects invalid URLs via zod schema', () => {
    const parsed = NavigationTool.inputSchema.safeParse({ url: 'not-a-url' });
    expect(parsed.success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────── ClickTool
describe('ClickTool', () => {
  it('clicks an element and returns a snapshot', async () => {
    const page = mockPage();
    const result = await ClickTool.execute({ selector: 'button#submit' }, page);

    expect(result.success).toBe(true);
    expect(page.click).toHaveBeenCalledWith({ selector: 'button#submit', delayMs: undefined });
  });

  it('returns an error when click throws', async () => {
    const page = mockPage({
      click: jest.fn().mockRejectedValue(new Error('Element not found')),
    });
    const result = await ClickTool.execute({ selector: '.missing' }, page);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Element not found/);
  });
});

// ──────────────────────────────────────────────────────────────── FillFormTool
describe('FillFormTool', () => {
  it('fills all fields and optionally submits', async () => {
    const page = mockPage();
    const result = await FillFormTool.execute(
      {
        fields: [
          { selector: '#username', value: 'alice' },
          { selector: '#password', value: 'secret' },
        ],
        submitSelector: 'button[type=submit]',
      },
      page,
    );

    expect(result.success).toBe(true);
    expect(page.fill).toHaveBeenCalledTimes(2);
    expect(page.click).toHaveBeenCalledWith({ selector: 'button[type=submit]', delayMs: undefined });
  });

  it('rejects when no fields are provided', () => {
    const parsed = FillFormTool.inputSchema.safeParse({ fields: [] });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────── ReadContentTool
describe('ReadContentTool', () => {
  it('reads whole page body text when no selector given', async () => {
    const page = mockPage();
    const result = await ReadContentTool.execute({}, page);

    expect(result.success).toBe(true);
    expect(result.data?.content).toBe('Hello world');
  });

  it('reads a specific element when selector is given', async () => {
    const page = mockPage();
    const result = await ReadContentTool.execute({ selector: 'h1' }, page);

    expect(result.success).toBe(true);
    expect(result.data?.content).toBe('Sample text');
    expect(page.readText).toHaveBeenCalledWith('h1');
  });
});

// ─────────────────────────────────────────────────────────── ScreenshotTool
describe('ScreenshotTool', () => {
  it('returns a base64-encoded PNG', async () => {
    const page = mockPage();
    const result = await ScreenshotTool.execute({}, page);

    expect(result.success).toBe(true);
    expect(typeof result.data?.imageBase64).toBe('string');
    expect(result.data?.url).toBe('https://example.com');
  });
});

// ──────────────────────────────────────────────────── WaitForSelectorTool
describe('WaitForSelectorTool', () => {
  it('resolves successfully when selector appears', async () => {
    const page = mockPage();
    const result = await WaitForSelectorTool.execute({ selector: '.loaded' }, page);

    expect(result.success).toBe(true);
    expect(result.data?.selector).toBe('.loaded');
    expect(page.waitForSelector).toHaveBeenCalledWith('.loaded', undefined);
  });

  it('returns an error when selector never appears', async () => {
    const page = mockPage({
      waitForSelector: jest.fn().mockRejectedValue(new Error('Timeout')),
    });
    const result = await WaitForSelectorTool.execute({ selector: '.ghost', timeoutMs: 100 }, page);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Timeout/);
  });
});

// ─────────────────────────────────────────────────────── SelectOptionTool
describe('SelectOptionTool', () => {
  it('selects an option and returns snapshot', async () => {
    const page = mockPage();
    const result = await SelectOptionTool.execute(
      { selector: '#country', values: ['US'] },
      page,
    );

    expect(result.success).toBe(true);
    expect(page.select).toHaveBeenCalledWith({ selector: '#country', values: ['US'] });
  });
});

// ──────────────────────────────────────────────────────────────────── HoverTool
describe('HoverTool', () => {
  it('hovers over an element and returns a snapshot', async () => {
    const page = mockPage();
    const result = await HoverTool.execute({ selector: 'nav .dropdown' }, page);

    expect(result.success).toBe(true);
    expect(page.hover).toHaveBeenCalledWith({ selector: 'nav .dropdown' });
    expect(result.data).toMatchObject({ url: 'https://example.com' });
  });

  it('returns an error when the element is not found', async () => {
    const page = mockPage({
      hover: jest.fn().mockRejectedValue(new Error('Element not found')),
    });
    const result = await HoverTool.execute({ selector: '.missing' }, page);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Element not found/);
  });

  it('rejects empty selectors', () => {
    const parsed = HoverTool.inputSchema.safeParse({ selector: '' });
    expect(parsed.success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────── ScrollTool
describe('ScrollTool', () => {
  it('scrolls the window downward and returns a snapshot', async () => {
    const page = mockPage();
    const result = await ScrollTool.execute({ direction: 'down', distance: 300 }, page);

    expect(result.success).toBe(true);
    expect(page.scroll).toHaveBeenCalledWith({
      direction: 'down',
      distance: 300,
      selector: undefined,
    });
    expect(result.data).toMatchObject({ url: 'https://example.com' });
  });

  it('scrolls a specific element when selector is provided', async () => {
    const page = mockPage();
    const result = await ScrollTool.execute(
      { direction: 'up', selector: '.sidebar' },
      page,
    );

    expect(result.success).toBe(true);
    expect(page.scroll).toHaveBeenCalledWith({
      direction: 'up',
      distance: undefined,
      selector: '.sidebar',
    });
  });

  it('returns an error when scrolling fails', async () => {
    const page = mockPage({
      scroll: jest.fn().mockRejectedValue(new Error('Scroll failed')),
    });
    const result = await ScrollTool.execute({ direction: 'down' }, page);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Scroll failed/);
  });

  it('rejects invalid direction values', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = ScrollTool.inputSchema.safeParse({ direction: 'sideways' } as any);
    expect(parsed.success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────── KeyPressTool
describe('KeyPressTool', () => {
  it('presses a key once by default', async () => {
    const page = mockPage();
    const result = await KeyPressTool.execute({ key: 'Enter' }, page);

    expect(result.success).toBe(true);
    expect(page.pressKey).toHaveBeenCalledTimes(1);
    expect(page.pressKey).toHaveBeenCalledWith('Enter');
    expect(result.data).toEqual({ key: 'Enter', count: 1 });
  });

  it('presses a key the specified number of times', async () => {
    const page = mockPage();
    const result = await KeyPressTool.execute({ key: 'Tab', count: 3 }, page);

    expect(result.success).toBe(true);
    expect(page.pressKey).toHaveBeenCalledTimes(3);
    expect(result.data).toEqual({ key: 'Tab', count: 3 });
  });

  it('returns an error when pressKey throws', async () => {
    const page = mockPage({
      pressKey: jest.fn().mockRejectedValue(new Error('Key failed')),
    });
    const result = await KeyPressTool.execute({ key: 'Escape' }, page);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Key failed/);
  });

  it('rejects empty key values', () => {
    const parsed = KeyPressTool.inputSchema.safeParse({ key: '' });
    expect(parsed.success).toBe(false);
  });

  it('rejects count greater than 20', () => {
    const parsed = KeyPressTool.inputSchema.safeParse({ key: 'a', count: 21 });
    expect(parsed.success).toBe(false);
  });
});
