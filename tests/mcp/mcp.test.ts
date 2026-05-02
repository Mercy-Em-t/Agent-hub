/**
 * MCP server unit tests.
 *
 * Tests the JSON-RPC message handler and tool dispatcher directly —
 * no stdio or HTTP calls to a real hub server.
 */

import * as http from 'http';
import {
  handleRequest,
  callTool,
  MCP_TOOLS,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
} from '../../src/mcp/server';

// ── handleRequest — protocol layer ────────────────────────────────────────────

describe('handleRequest', () => {
  const dummyUrl = 'http://localhost:9999'; // nothing running here; overridden in tool tests

  it('initialize returns protocolVersion and capabilities', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'initialize', params: {}, id: 1 },
      dummyUrl,
    );
    expect(resp).not.toBeNull();
    const r = resp!;
    if ('error' in r) throw new Error('Expected success');
    const result = r.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe('2024-11-05');
    expect((result.capabilities as Record<string, unknown>).tools).toBeDefined();
    expect((result.serverInfo as Record<string, string>).name).toBe('agent-hub');
  });

  it('ping returns empty result', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'ping', id: 2 },
      dummyUrl,
    );
    expect(resp).not.toBeNull();
    const r = resp!;
    if ('error' in r) throw new Error('Expected success');
    expect(r.result).toEqual({});
  });

  it('tools/list returns all MCP tools', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'tools/list', id: 3 },
      dummyUrl,
    );
    expect(resp).not.toBeNull();
    const r = resp!;
    if ('error' in r) throw new Error('Expected success');
    const tools = (r.result as { tools: unknown[] }).tools;
    expect(tools).toHaveLength(MCP_TOOLS.length);
  });

  it('tools/call with missing name returns INVALID_PARAMS error', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'tools/call', params: {}, id: 4 },
      dummyUrl,
    );
    expect(resp).not.toBeNull();
    const r = resp!;
    if ('result' in r) throw new Error('Expected error');
    expect(r.error.code).toBe(INVALID_PARAMS);
  });

  it('unknown method returns METHOD_NOT_FOUND error', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'nonexistent', id: 5 },
      dummyUrl,
    );
    expect(resp).not.toBeNull();
    const r = resp!;
    if ('result' in r) throw new Error('Expected error');
    expect(r.error.code).toBe(METHOD_NOT_FOUND);
  });

  it('notification (no id) returns null', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      dummyUrl,
    );
    expect(resp).toBeNull();
  });

  it('preserves the request id in the response', async () => {
    const resp = await handleRequest(
      { jsonrpc: '2.0', method: 'ping', id: 'test-id-42' },
      dummyUrl,
    );
    expect(resp!.id).toBe('test-id-42');
  });
});

// ── MCP_TOOLS — tool definitions ──────────────────────────────────────────────

describe('MCP_TOOLS', () => {
  it('every tool has name, description, and inputSchema', () => {
    for (const tool of MCP_TOOLS) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('hub_register_agent has required fields', () => {
    const tool = MCP_TOOLS.find((t) => t.name === 'hub_register_agent')!;
    expect(tool.inputSchema.required).toContain('name');
    expect(tool.inputSchema.required).toContain('contactEmail');
    expect(tool.inputSchema.required).toContain('purpose');
  });

  it('hub_run_task has agentId, apiKey, startUrl as required', () => {
    const tool = MCP_TOOLS.find((t) => t.name === 'hub_run_task')!;
    expect(tool.inputSchema.required).toContain('agentId');
    expect(tool.inputSchema.required).toContain('apiKey');
    expect(tool.inputSchema.required).toContain('startUrl');
  });

  it('tool names match expected set', () => {
    const names = MCP_TOOLS.map((t) => t.name);
    const expected = [
      'hub_health', 'hub_capabilities', 'hub_list_tools',
      'hub_register_agent', 'hub_approve_agent', 'hub_revoke_agent',
      'hub_list_agents', 'hub_get_agent',
      'hub_register_site', 'hub_approve_site', 'hub_list_sites',
      'hub_run_task', 'hub_submit_task', 'hub_poll_job', 'hub_list_jobs',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });
});

// ── callTool — dispatcher with a real mock HTTP server ────────────────────────

function startMockHub(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

describe('callTool dispatcher', () => {
  let server: http.Server;
  let baseUrl: string;
  let lastRequest: { method: string; url: string };

  beforeAll(async () => {
    ({ server } = await startMockHub((req, res) => {
      lastRequest = { method: req.method ?? '', url: req.url ?? '' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    }));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(() => server.close());

  it('hub_health calls GET /health', async () => {
    await callTool('hub_health', {}, baseUrl);
    expect(lastRequest.method).toBe('GET');
    expect(lastRequest.url).toBe('/health');
  });

  it('hub_capabilities calls GET /capabilities', async () => {
    await callTool('hub_capabilities', {}, baseUrl);
    expect(lastRequest.url).toBe('/capabilities');
  });

  it('hub_list_tools calls GET /tools', async () => {
    await callTool('hub_list_tools', {}, baseUrl);
    expect(lastRequest.url).toBe('/tools');
  });

  it('hub_list_agents calls GET /registry/agents', async () => {
    await callTool('hub_list_agents', {}, baseUrl);
    expect(lastRequest.url).toBe('/registry/agents');
  });

  it('hub_get_agent calls GET /registry/agents/:id', async () => {
    await callTool('hub_get_agent', { agentId: 'test-id' }, baseUrl);
    expect(lastRequest.url).toBe('/registry/agents/test-id');
  });

  it('hub_approve_agent calls PATCH /registry/agents/:id/approve', async () => {
    await callTool('hub_approve_agent', { agentId: 'abc' }, baseUrl);
    expect(lastRequest.method).toBe('PATCH');
    expect(lastRequest.url).toBe('/registry/agents/abc/approve');
  });

  it('hub_revoke_agent calls PATCH /registry/agents/:id/revoke', async () => {
    await callTool('hub_revoke_agent', { agentId: 'abc' }, baseUrl);
    expect(lastRequest.url).toBe('/registry/agents/abc/revoke');
  });

  it('hub_list_sites calls GET /registry/sites', async () => {
    await callTool('hub_list_sites', {}, baseUrl);
    expect(lastRequest.url).toBe('/registry/sites');
  });

  it('hub_approve_site calls PATCH /registry/sites/:id/approve', async () => {
    await callTool('hub_approve_site', { siteId: 'site1' }, baseUrl);
    expect(lastRequest.url).toBe('/registry/sites/site1/approve');
  });

  it('hub_list_jobs calls GET /agents/jobs', async () => {
    await callTool('hub_list_jobs', {}, baseUrl);
    expect(lastRequest.url).toBe('/agents/jobs');
  });

  it('hub_poll_job calls GET /agents/jobs/:id', async () => {
    await callTool('hub_poll_job', { jobId: 'job-1' }, baseUrl);
    expect(lastRequest.url).toBe('/agents/jobs/job-1');
  });

  it('unknown tool throws METHOD_NOT_FOUND error', async () => {
    await expect(callTool('unknown_tool', {}, baseUrl)).rejects.toThrow();
  });
});
