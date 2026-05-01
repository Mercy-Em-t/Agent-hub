import { SessionManager } from '../../src/sessions/SessionManager';
import { BrowserManager } from '../../src/browser/BrowserManager';
import type { BrowserContext } from 'playwright';

function mockBrowserManager(): BrowserManager {
  const fakeCtx: Partial<BrowserContext> = {
    close: jest.fn().mockResolvedValue(undefined),
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(null),
      title: jest.fn().mockResolvedValue('Test'),
      url: jest.fn().mockReturnValue('https://example.com'),
      setDefaultNavigationTimeout: jest.fn(),
      setDefaultTimeout: jest.fn(),
    }),
    setDefaultNavigationTimeout: jest.fn(),
    setDefaultTimeout: jest.fn(),
  };

  const mgr = {
    launch: jest.fn().mockResolvedValue(undefined),
    newContext: jest.fn().mockResolvedValue(fakeCtx),
    closeContext: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    isRunning: true,
  } as unknown as BrowserManager;

  return mgr;
}

describe('SessionManager', () => {
  let manager: BrowserManager;
  let sessions: SessionManager;

  beforeEach(() => {
    manager = mockBrowserManager();
    sessions = new SessionManager(manager);
  });

  it('creates a session and returns it', async () => {
    const session = await sessions.create('agent-1');
    expect(session.id).toBeTruthy();
    expect(session.status).toBe('idle');
    expect(session.agentId).toBe('agent-1');
  });

  it('lists created sessions', async () => {
    await sessions.create('agent-1');
    await sessions.create('agent-2');
    expect(sessions.list()).toHaveLength(2);
  });

  it('gets a session by id', async () => {
    const created = await sessions.create();
    const found = sessions.get(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('sets session status to running', async () => {
    const session = await sessions.create();
    sessions.setRunning(session.id);
    expect(sessions.get(session.id)?.status).toBe('running');
  });

  it('sets session status to completed', async () => {
    const session = await sessions.create();
    sessions.setCompleted(session.id);
    expect(sessions.get(session.id)?.status).toBe('completed');
  });

  it('sets session status to error with message', async () => {
    const session = await sessions.create();
    sessions.setError(session.id, 'Something went wrong');
    const found = sessions.get(session.id);
    expect(found?.status).toBe('error');
    expect(found?.error).toBe('Something went wrong');
  });

  it('closes a session and removes it', async () => {
    const session = await sessions.create();
    await sessions.close(session.id);
    expect(sessions.get(session.id)).toBeUndefined();
    expect(sessions.list()).toHaveLength(0);
  });

  it('closes all sessions', async () => {
    await sessions.create('a');
    await sessions.create('b');
    await sessions.closeAll();
    expect(sessions.list()).toHaveLength(0);
  });

  it('rejects creation when max concurrent sessions is reached', async () => {
    const sm = new SessionManager(manager, { maxConcurrentSessions: 2 });
    await sm.create('a');
    await sm.create('b');
    await expect(sm.create('c')).rejects.toThrow('Maximum concurrent sessions');
  });
});
