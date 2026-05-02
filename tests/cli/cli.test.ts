/**
 * CLI unit tests.
 *
 * We test the CLI's `parseArgs` logic and the `formatOutput` helper directly,
 * then test full command routing against a mock HTTP server so no real Agent-hub
 * instance is needed.
 */

import * as http from 'http';
import { parseArgs, formatOutput, run } from '../../src/cli/index';

// ── parseArgs ──────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('extracts command and sub-command from positional args', () => {
    const r = parseArgs(['node', 'cli.js', 'agents', 'list']);
    expect(r.command).toBe('agents');
    expect(r.subCommand).toBe('list');
  });

  it('parses --flag value pairs', () => {
    const r = parseArgs(['node', 'cli.js', 'agents', 'register',
      '--name', 'MyBot', '--owner', 'Acme']);
    expect(r.flags['name']).toBe('MyBot');
    expect(r.flags['owner']).toBe('Acme');
  });

  it('parses boolean flags (--pretty)', () => {
    const r = parseArgs(['node', 'cli.js', 'health', '--pretty']);
    expect(r.flags['pretty']).toBe(true);
  });

  it('collects remaining positional args after sub-command', () => {
    const r = parseArgs(['node', 'cli.js', 'agents', 'get', 'some-uuid']);
    expect(r.positional[0]).toBe('some-uuid');
  });

  it('defaults to "help" when no command given', () => {
    const r = parseArgs(['node', 'cli.js']);
    expect(r.command).toBe('help');
  });
});

// ── formatOutput ──────────────────────────────────────────────────────────────

describe('formatOutput', () => {
  it('compact JSON when pretty=false', () => {
    expect(formatOutput({ a: 1 }, false)).toBe('{"a":1}');
  });

  it('indented JSON when pretty=true', () => {
    const out = formatOutput({ a: 1 }, true);
    expect(out).toContain('\n');
    expect(JSON.parse(out)).toEqual({ a: 1 });
  });
});

// ── full command routing against a mock HTTP server ───────────────────────────

function startMockServer(
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

/** Capture stdout and stderr during a run() call */
async function capture(
  argv: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  const originalExit = process.exit.bind(process);

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  process.stdout.write = (s: string) => { stdout += s; return true; };
  process.stderr.write = (s: string) => { stderr += s; return true; };
  (process.exit as unknown as jest.Mock) = jest.fn((code: number) => {
    exitCode = code;
    throw new Error(`process.exit(${code})`);
  });

  try {
    await run(argv);
  } catch {
    // swallow process.exit mock errors
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    process.exit = originalExit;
  }

  return { stdout, stderr, exitCode };
}

describe('CLI command routing', () => {
  let server: http.Server;
  let port: number;
  let lastRequest: { method: string; url: string; body: string };

  beforeAll(async () => {
    ({ server, port } = await startMockServer((req, res) => {
      let body = '';
      req.on('data', (c: Buffer) => { body += c.toString(); });
      req.on('end', () => {
        lastRequest = { method: req.method ?? '', url: req.url ?? '', body };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, url: req.url, method: req.method }));
      });
    }));
  });

  afterAll(() => server.close());

  const hubUrl = () => `http://127.0.0.1:${port}`;

  it('health — calls GET /health', async () => {
    const { stdout } = await capture(['node', 'cli.js', 'health', '--hub-url', hubUrl()]);
    expect(JSON.parse(stdout)).toMatchObject({ ok: true });
    expect(lastRequest.method).toBe('GET');
    expect(lastRequest.url).toBe('/health');
  });

  it('capabilities — calls GET /capabilities', async () => {
    await capture(['node', 'cli.js', 'capabilities', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/capabilities');
  });

  it('tools — calls GET /tools', async () => {
    await capture(['node', 'cli.js', 'tools', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/tools');
  });

  it('agents list — calls GET /registry/agents', async () => {
    await capture(['node', 'cli.js', 'agents', 'list', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/registry/agents');
  });

  it('agents get <id> — calls GET /registry/agents/:id', async () => {
    await capture(['node', 'cli.js', 'agents', 'get', 'abc123', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/registry/agents/abc123');
  });

  it('agents register — calls POST /registry/agents with body', async () => {
    await capture([
      'node', 'cli.js', 'agents', 'register',
      '--name', 'TestBot',
      '--owner', 'Tester',
      '--email', 'test@test.com',
      '--purpose', 'Testing',
      '--hub-url', hubUrl(),
    ]);
    expect(lastRequest.method).toBe('POST');
    expect(lastRequest.url).toBe('/registry/agents');
    const body = JSON.parse(lastRequest.body) as Record<string, string>;
    expect(body.name).toBe('TestBot');
    expect(body.contactEmail).toBe('test@test.com');
  });

  it('agents approve <id> — calls PATCH /registry/agents/:id/approve', async () => {
    await capture(['node', 'cli.js', 'agents', 'approve', 'abc123', '--hub-url', hubUrl()]);
    expect(lastRequest.method).toBe('PATCH');
    expect(lastRequest.url).toBe('/registry/agents/abc123/approve');
  });

  it('agents revoke <id> — calls PATCH /registry/agents/:id/revoke', async () => {
    await capture(['node', 'cli.js', 'agents', 'revoke', 'abc123', '--hub-url', hubUrl()]);
    expect(lastRequest.method).toBe('PATCH');
    expect(lastRequest.url).toBe('/registry/agents/abc123/revoke');
  });

  it('sites list — calls GET /registry/sites', async () => {
    await capture(['node', 'cli.js', 'sites', 'list', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/registry/sites');
  });

  it('sites register — calls POST /registry/sites', async () => {
    await capture([
      'node', 'cli.js', 'sites', 'register',
      '--domain', 'example.com',
      '--owner', 'Owner',
      '--email', 'owner@example.com',
      '--description', 'Test site',
      '--hub-url', hubUrl(),
    ]);
    expect(lastRequest.method).toBe('POST');
    expect(lastRequest.url).toBe('/registry/sites');
  });

  it('jobs list — calls GET /agents/jobs', async () => {
    await capture(['node', 'cli.js', 'jobs', 'list', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/agents/jobs');
  });

  it('jobs get <id> — calls GET /agents/jobs/:id', async () => {
    await capture(['node', 'cli.js', 'jobs', 'get', 'job-123', '--hub-url', hubUrl()]);
    expect(lastRequest.url).toBe('/agents/jobs/job-123');
  });

  it('help — outputs usage object (no HTTP call)', async () => {
    const { stdout } = await capture(['node', 'cli.js', 'help']);
    const out = JSON.parse(stdout) as { usage: string; commands: object };
    expect(out.usage).toContain('agent-hub');
    expect(out.commands).toBeDefined();
  });

  it('--pretty flag formats output with indentation', async () => {
    const { stdout } = await capture(['node', 'cli.js', 'health', '--hub-url', hubUrl(), '--pretty']);
    expect(stdout).toContain('\n');
  });
});
