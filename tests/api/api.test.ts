import request from 'supertest';
import { createApp } from '../../src/api/server';
import { SessionManager } from '../../src/sessions/SessionManager';
import { BrowserManager } from '../../src/browser/BrowserManager';
import { BrowserContext } from 'playwright';

function buildApp() {
  const fakeCtx: Partial<BrowserContext> = {
    close: jest.fn().mockResolvedValue(undefined),
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(null),
      title: jest.fn().mockResolvedValue('Test Page'),
      url: jest.fn().mockReturnValue('https://example.com'),
      locator: jest.fn().mockReturnValue({
        first: jest.fn().mockReturnValue({
          click: jest.fn().mockResolvedValue(undefined),
          fill: jest.fn().mockResolvedValue(undefined),
          textContent: jest.fn().mockResolvedValue('text'),
        }),
      }),
      selectOption: jest.fn().mockResolvedValue(undefined),
      keyboard: { press: jest.fn().mockResolvedValue(undefined) },
      waitForSelector: jest.fn().mockResolvedValue(null),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
      evaluate: jest.fn().mockResolvedValue('Hello world'),
      setDefaultNavigationTimeout: jest.fn(),
      setDefaultTimeout: jest.fn(),
    }),
    setDefaultNavigationTimeout: jest.fn(),
    setDefaultTimeout: jest.fn(),
  };

  const browserManager = {
    launch: jest.fn().mockResolvedValue(undefined),
    newContext: jest.fn().mockResolvedValue(fakeCtx),
    closeContext: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    isRunning: true,
  } as unknown as BrowserManager;

  const sessions = new SessionManager(browserManager);
  return createApp(sessions);
}

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /agents/sessions', () => {
  it('returns an empty sessions array initially', async () => {
    const app = buildApp();
    const res = await request(app).get('/agents/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([]);
  });
});

describe('POST /agents/run', () => {
  it('returns 400 for invalid request body', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/agents/run')
      .send({ startUrl: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('runs a task with zero steps successfully', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/agents/run')
      .send({ startUrl: 'https://example.com', steps: [] });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.results).toHaveLength(1); // just the navigate
  });
});
