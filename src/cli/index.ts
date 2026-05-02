#!/usr/bin/env node
/**
 * Agent-hub CLI
 *
 * Machine-first command-line interface for the Agent-hub REST API.
 * All output is JSON by default — pipe-friendly and directly consumable
 * by AI agents, scripts, and CI pipelines.
 *
 * Usage:
 *   agent-hub <command> [sub-command] [flags]
 *
 * Commands:
 *   health
 *   capabilities
 *   tools
 *   agents list
 *   agents get <agentId>
 *   agents register --name <n> --owner <o> --email <e> --purpose <p> [--description <d>]
 *                   [--goals <g1,g2>] [--allowed-domains <d1,d2>] [--denied-domains <d1,d2>]
 *                   [--allowed-tools <t1,t2>] [--constraints <c1,c2>]
 *                   [--owner-phone <+E164>] [--website <url>]
 *   agents approve <agentId>
 *   agents revoke  <agentId>
 *   sites list
 *   sites get <siteId>
 *   sites register --domain <d> --owner <o> --email <e> --description <desc>
 *                  [--allowed-capabilities <c1,c2>]
 *   sites approve <siteId>
 *   sites revoke  <siteId>
 *   run   --agent-id <id> --api-key <k> --url <u> --steps <json>
 *   submit --agent-id <id> --api-key <k> --url <u> --steps <json>
 *   jobs list
 *   jobs get <jobId>
 *   help
 *
 * Global flags:
 *   --hub-url <url>   Hub base URL (default: $AGENT_HUB_URL or http://localhost:3000)
 *   --pretty          Pretty-print JSON output
 *
 * Exit codes: 0 = success, 1 = error
 */

import * as http from 'http';
import * as https from 'https';

// ── Argument parsing ──────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string;
  subCommand: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // strip node + script
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  const [command = 'help', subCommand = '', ...rest] = positional;
  return { command, subCommand, positional: rest, flags };
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface HttpResponse {
  statusCode: number;
  body: string;
}

export function httpRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Output helper ─────────────────────────────────────────────────────────────

export function formatOutput(data: unknown, pretty: boolean): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

function output(data: unknown, pretty: boolean): void {
  process.stdout.write(formatOutput(data, pretty) + '\n');
}

function fail(message: string, data?: unknown): never {
  const err: Record<string, unknown> = { error: message };
  if (data !== undefined) err.details = data;
  process.stderr.write(JSON.stringify(err) + '\n');
  process.exit(1);
}

// ── CSV helper ────────────────────────────────────────────────────────────────

function csv(value: string | boolean | undefined): string[] {
  if (!value || value === true) return [];
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

// ── Main command dispatcher ───────────────────────────────────────────────────

export async function run(argv: string[]): Promise<void> {
  const { command, subCommand, positional, flags } = parseArgs(argv);

  const hubUrl = String(flags['hub-url'] ?? process.env.AGENT_HUB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const pretty = Boolean(flags['pretty']);

  async function get(path: string): Promise<unknown> {
    const res = await httpRequest('GET', `${hubUrl}${path}`);
    const parsed = JSON.parse(res.body) as unknown;
    if (res.statusCode >= 400) fail(`HTTP ${res.statusCode}`, parsed);
    return parsed;
  }

  async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await httpRequest('POST', `${hubUrl}${path}`, body);
    const parsed = JSON.parse(res.body) as unknown;
    if (res.statusCode >= 400) fail(`HTTP ${res.statusCode}`, parsed);
    return parsed;
  }

  async function patch(path: string): Promise<unknown> {
    const res = await httpRequest('PATCH', `${hubUrl}${path}`);
    const parsed = JSON.parse(res.body) as unknown;
    if (res.statusCode >= 400) fail(`HTTP ${res.statusCode}`, parsed);
    return parsed;
  }

  switch (command) {
    // ── health ──────────────────────────────────────────────────────────────
    case 'health':
      output(await get('/health'), pretty);
      break;

    // ── capabilities ────────────────────────────────────────────────────────
    case 'capabilities':
      output(await get('/capabilities'), pretty);
      break;

    // ── tools ────────────────────────────────────────────────────────────────
    case 'tools':
      output(await get('/tools'), pretty);
      break;

    // ── agents ───────────────────────────────────────────────────────────────
    case 'agents': {
      switch (subCommand) {
        case 'list':
          output(await get('/registry/agents'), pretty);
          break;

        case 'get': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('agents get requires <agentId>');
          output(await get(`/registry/agents/${id}`), pretty);
          break;
        }

        case 'register': {
          const body: Record<string, unknown> = {
            name: flags['name'],
            description: flags['description'] ?? flags['name'],
            owner: flags['owner'],
            contactEmail: flags['email'],
            purpose: flags['purpose'],
          };
          if (!body.name) fail('agents register requires --name');
          if (!body.owner) fail('agents register requires --owner');
          if (!body.contactEmail) fail('agents register requires --email');
          if (!body.purpose) fail('agents register requires --purpose');

          const goals = csv(flags['goals']);
          if (goals.length) body.goals = goals;
          const proc = csv(flags['working-procedure']);
          if (proc.length) body.workingProcedure = proc;
          const allowed = csv(flags['allowed-domains']);
          if (allowed.length) body.allowedDomains = allowed;
          const denied = csv(flags['denied-domains']);
          if (denied.length) body.deniedDomains = denied;
          const tools = csv(flags['allowed-tools']);
          if (tools.length) body.allowedTools = tools;
          const constraints = csv(flags['constraints']);
          if (constraints.length) body.constraints = constraints;
          if (flags['owner-phone']) body.ownerPhone = flags['owner-phone'];
          if (flags['website']) body.website = flags['website'];

          output(await post('/registry/agents', body), pretty);
          break;
        }

        case 'approve': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('agents approve requires <agentId>');
          output(await patch(`/registry/agents/${id}/approve`), pretty);
          break;
        }

        case 'revoke': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('agents revoke requires <agentId>');
          output(await patch(`/registry/agents/${id}/revoke`), pretty);
          break;
        }

        default:
          fail(`Unknown agents sub-command: "${subCommand}". Try: list, get, register, approve, revoke`);
      }
      break;
    }

    // ── sites ────────────────────────────────────────────────────────────────
    case 'sites': {
      switch (subCommand) {
        case 'list':
          output(await get('/registry/sites'), pretty);
          break;

        case 'get': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('sites get requires <siteId>');
          output(await get(`/registry/sites/${id}`), pretty);
          break;
        }

        case 'register': {
          const body: Record<string, unknown> = {
            domain: flags['domain'],
            ownerName: flags['owner'],
            contactEmail: flags['email'],
            description: flags['description'],
          };
          if (!body.domain) fail('sites register requires --domain');
          if (!body.ownerName) fail('sites register requires --owner');
          if (!body.contactEmail) fail('sites register requires --email');
          if (!body.description) fail('sites register requires --description');

          const caps = csv(flags['allowed-capabilities']);
          if (caps.length) body.allowedCapabilities = caps;

          output(await post('/registry/sites', body), pretty);
          break;
        }

        case 'approve': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('sites approve requires <siteId>');
          output(await patch(`/registry/sites/${id}/approve`), pretty);
          break;
        }

        case 'revoke': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('sites revoke requires <siteId>');
          output(await patch(`/registry/sites/${id}/revoke`), pretty);
          break;
        }

        default:
          fail(`Unknown sites sub-command: "${subCommand}". Try: list, get, register, approve, revoke`);
      }
      break;
    }

    // ── run ──────────────────────────────────────────────────────────────────
    case 'run': {
      const agentId = String(flags['agent-id'] ?? '');
      const apiKey = String(flags['api-key'] ?? '');
      const startUrl = String(flags['url'] ?? '');
      if (!agentId) fail('run requires --agent-id');
      if (!apiKey) fail('run requires --api-key');
      if (!startUrl) fail('run requires --url');

      let steps: Array<{ tool: string; input: Record<string, unknown> }> = [];
      if (flags['steps']) {
        try {
          steps = JSON.parse(String(flags['steps'])) as typeof steps;
        } catch {
          fail('--steps must be a valid JSON array of {tool, input} objects');
        }
      }

      output(await post('/agents/run', { agentId, apiKey, startUrl, steps }), pretty);
      break;
    }

    // ── submit ───────────────────────────────────────────────────────────────
    case 'submit': {
      const agentId = String(flags['agent-id'] ?? '');
      const apiKey = String(flags['api-key'] ?? '');
      const startUrl = String(flags['url'] ?? '');
      if (!agentId) fail('submit requires --agent-id');
      if (!apiKey) fail('submit requires --api-key');
      if (!startUrl) fail('submit requires --url');

      let steps: Array<{ tool: string; input: Record<string, unknown> }> = [];
      if (flags['steps']) {
        try {
          steps = JSON.parse(String(flags['steps'])) as typeof steps;
        } catch {
          fail('--steps must be a valid JSON array of {tool, input} objects');
        }
      }

      output(await post('/agents/run/async', { agentId, apiKey, startUrl, steps }), pretty);
      break;
    }

    // ── jobs ─────────────────────────────────────────────────────────────────
    case 'jobs': {
      switch (subCommand) {
        case 'list':
          output(await get('/agents/jobs'), pretty);
          break;
        case 'get': {
          const id = positional[0] ?? String(flags['id'] ?? '');
          if (!id) fail('jobs get requires <jobId>');
          output(await get(`/agents/jobs/${id}`), pretty);
          break;
        }
        default:
          fail(`Unknown jobs sub-command: "${subCommand}". Try: list, get`);
      }
      break;
    }

    // ── help ─────────────────────────────────────────────────────────────────
    case 'help':
    default:
      output({
        usage: 'agent-hub <command> [sub-command] [flags]',
        globalFlags: {
          '--hub-url <url>': 'Hub base URL (default: $AGENT_HUB_URL or http://localhost:3000)',
          '--pretty': 'Pretty-print JSON output',
        },
        commands: {
          health: 'Check server health',
          capabilities: 'Show hub bootstrap manifest (agent self-orientation)',
          tools: 'List all available browser automation tools with schemas',
          'agents list': 'List all registered agents',
          'agents get <id>': 'Get agent details',
          'agents register': 'Register a new agent (--name --owner --email --purpose required)',
          'agents approve <id>': 'Approve a pending agent',
          'agents revoke <id>': 'Revoke an agent',
          'sites list': 'List all registered sites',
          'sites get <id>': 'Get site details',
          'sites register': 'Register a site (--domain --owner --email --description required)',
          'sites approve <id>': 'Approve a site',
          'sites revoke <id>': 'Revoke a site',
          run: 'Run a task synchronously (--agent-id --api-key --url required)',
          submit: 'Submit a task asynchronously (returns jobId)',
          'jobs list': 'List all submitted jobs',
          'jobs get <jobId>': 'Poll a job status',
        },
      }, true);
      break;
  }
}

// Only run when executed directly (not when imported by tests)
if (require.main === module) {
  run(process.argv).catch((err: unknown) => {
    process.stderr.write(JSON.stringify({ error: (err as Error).message ?? String(err) }) + '\n');
    process.exit(1);
  });
}
