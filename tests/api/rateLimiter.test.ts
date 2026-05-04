import { createRateLimiter } from '../../src/api/middleware/rateLimiter';
import { Request, Response } from 'express';

function mockReq(agentId?: string): Partial<Request> {
  return { body: agentId ? { agentId } : {} };
}

function mockRes(): { statusCode: number; body: unknown; headers: Record<string, string>; status: (c: number) => ReturnType<typeof mockRes>; json: (b: unknown) => ReturnType<typeof mockRes>; setHeader: (k: string, v: string) => void } {
  const res = {
    statusCode: 200,
    body: null as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { res.statusCode = code; return res; },
    json(b: unknown) { res.body = b; return res; },
    setHeader(k: string, v: string) { res.headers[k] = v; },
  };
  return res;
}

describe('createRateLimiter', () => {
  it('passes through when no agentId', () => {
    const limiter = createRateLimiter({ maxPerMinute: 2, maxConcurrent: 1 });
    const req = mockReq();
    const res = mockRes();
    let called = false;
    limiter.middleware(req as Request, res as unknown as Response, () => { called = true; });
    expect(called).toBe(true);
  });

  it('blocks after maxPerMinute is exceeded', () => {
    const limiter = createRateLimiter({ maxPerMinute: 2, maxConcurrent: 10 });
    const agentId = 'agent-1';
    const next = jest.fn();
    const res = () => mockRes();

    // First two pass
    limiter.middleware(mockReq(agentId) as Request, res() as unknown as Response, next);
    limiter.release(agentId);
    limiter.middleware(mockReq(agentId) as Request, res() as unknown as Response, next);
    limiter.release(agentId);

    expect(next).toHaveBeenCalledTimes(2);

    // Third is blocked
    const blockedRes = mockRes();
    limiter.middleware(mockReq(agentId) as Request, blockedRes as unknown as Response, next);
    expect(blockedRes.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(2); // still 2
  });

  it('blocks when maxConcurrent is exceeded', () => {
    const limiter = createRateLimiter({ maxPerMinute: 100, maxConcurrent: 1 });
    const agentId = 'agent-2';
    const next = jest.fn();

    // First: slot taken
    limiter.middleware(mockReq(agentId) as Request, mockRes() as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Second: concurrent limit hit
    const blockedRes = mockRes();
    limiter.middleware(mockReq(agentId) as Request, blockedRes as unknown as Response, next);
    expect(blockedRes.statusCode).toBe(429);

    // After release, another can go through
    limiter.release(agentId);
    const res2 = mockRes();
    limiter.middleware(mockReq(agentId) as Request, res2 as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('stats reflect counters', () => {
    const limiter = createRateLimiter({ maxPerMinute: 100, maxConcurrent: 5 });
    const agentId = 'agent-3';
    expect(limiter.stats(agentId)).toEqual({ windowCount: 0, active: 0 });
    limiter.middleware(mockReq(agentId) as Request, mockRes() as unknown as Response, jest.fn());
    expect(limiter.stats(agentId)).toEqual({ windowCount: 1, active: 1 });
    limiter.release(agentId);
    expect(limiter.stats(agentId)).toEqual({ windowCount: 1, active: 0 });
  });
});
