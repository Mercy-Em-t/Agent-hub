/**
 * Agent-hub – main entry point.
 *
 * Starts the REST API server, which exposes:
 *
 *  POST /registry/agents              – register a new AI agent (declaration)
 *  GET  /registry/agents              – list all agent registrations
 *  GET  /registry/agents/:id          – get a specific agent registration
 *  PATCH /registry/agents/:id/approve – approve an agent
 *  PATCH /registry/agents/:id/revoke  – revoke an agent
 *
 *  POST /registry/sites               – register a website for agent access
 *  GET  /registry/sites               – list all site registrations
 *  GET  /registry/sites/:id           – get a specific site registration
 *  PATCH /registry/sites/:id/approve  – approve a site
 *  PATCH /registry/sites/:id/revoke   – revoke a site
 *
 *  POST /agents/run                   – run a task synchronously (requires agentId + apiKey)
 *  POST /agents/run/async             – submit a task for async execution; returns jobId
 *  GET  /agents/jobs/:jobId           – poll async job status and results
 *  GET  /agents/jobs                  – list all submitted jobs
 *  GET  /agents/sessions              – list active sessions
 *  GET  /health                       – service health-check
 *
 * Usage:
 *   npm run dev           (ts-node, development)
 *   npm start             (compiled, production)
 */

import { BrowserManager } from './browser/BrowserManager';
import { SessionManager } from './sessions/SessionManager';
import { AgentRegistry } from './registry/AgentRegistry';
import { SiteRegistry } from './registry/SiteRegistry';
import { createApp } from './api/server';
import { defaultConfig } from './config';
import { JsonFileStore, dateReviver } from './storage/JsonFileStore';
import { SqliteStore, openDatabase } from './storage/SqliteStore';
import { AuditLog } from './audit/AuditLog';
import type { AgentRegistration } from './registry/AgentRegistry';
import type { SiteRegistration } from './registry/SiteRegistry';
import type { JobRecord } from './jobs/JobStore';
import type { AuditEntry } from './audit/AuditLog';
import { join } from 'path';

// Re-export public API so agent-hub can be used as a library too.
export * from './agents';
export * from './browser';
export * from './tools';
export * from './sessions';
export * from './registry';
export * from './gateway';
export * from './jobs';
export * from './notifications';
export * from './audit';
export { createApp } from './api/server';

async function main() {
  const browserManager = new BrowserManager();
  await browserManager.launch();

  const sessionManager = new SessionManager(browserManager);

  // ── Persistent storage ────────────────────────────────────────────────────
  // Priority:
  //   SQLITE_FILE set → use SQLite for all stores (recommended for production)
  //   DATA_DIR set    → use JSON file stores per directory (simple single-node)
  //   Neither         → in-memory (default; data lost on restart)
  const sqliteFile = process.env.SQLITE_FILE;
  const dataDir = process.env.DATA_DIR;

  if (sqliteFile) {
    console.log(`[storage] SQLite persistence enabled → ${sqliteFile}`);
  } else if (dataDir) {
    console.log(`[storage] JSON-file persistence enabled → ${dataDir}`);
  }

  let agentRegistry: AgentRegistry;
  let siteRegistry: SiteRegistry;
  let jobStore: InstanceType<typeof import('./jobs/JobStore').JobStore>;
  let auditLog: AuditLog;

  if (sqliteFile) {
    const db = openDatabase(sqliteFile);
    agentRegistry = new AgentRegistry(new SqliteStore<AgentRegistration>(db, 'agents'));
    siteRegistry  = new SiteRegistry(new SqliteStore<SiteRegistration>(db, 'sites'));
    const { JobStore } = await import('./jobs/JobStore');
    jobStore  = new JobStore(new SqliteStore<JobRecord>(db, 'jobs'));
    auditLog  = new AuditLog(new SqliteStore<AuditEntry>(db, 'audit'));
  } else if (dataDir) {
    agentRegistry = new AgentRegistry(
      new JsonFileStore<AgentRegistration>(join(dataDir, 'agents.json'), dateReviver),
    );
    siteRegistry = new SiteRegistry(
      new JsonFileStore<SiteRegistration>(join(dataDir, 'sites.json'), dateReviver),
    );
    const { JobStore } = await import('./jobs/JobStore');
    // JobStore uses string timestamps (not Date objects), no reviver needed.
    jobStore  = new JobStore(new JsonFileStore<JobRecord>(join(dataDir, 'jobs.json')));
    auditLog  = new AuditLog(new JsonFileStore<AuditEntry>(join(dataDir, 'audit.json')));
  } else {
    const { JobStore } = await import('./jobs/JobStore');
    agentRegistry = new AgentRegistry();
    siteRegistry  = new SiteRegistry();
    jobStore  = new JobStore();
    auditLog  = new AuditLog();
  }
  // ─────────────────────────────────────────────────────────────────────────

  const app = createApp(sessionManager, agentRegistry, siteRegistry, jobStore, undefined, auditLog);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultConfig.apiPort;

  const server = app.listen(port, () => {
    console.log(`Agent-hub API listening on http://localhost:${port}`);
    console.log('');
    console.log('  Discovery (agent-first — no auth needed):');
    console.log('    GET    /capabilities              – bootstrap manifest for AI agents');
    console.log('    GET    /openapi.json              – OpenAPI 3.1 specification');
    console.log('    GET    /tools                     – live tool catalog with JSON Schemas');
    console.log('');
    console.log('  Registry (declare before operating):');
    console.log('    POST   /registry/agents              – register an agent');
    console.log('    PATCH  /registry/agents/:id/approve  – approve an agent');
    console.log('    POST   /registry/sites               – register a site');
    console.log('    PATCH  /registry/sites/:id/approve   – approve a site');
    console.log('');
    console.log('  Operations (gateway-protected):');
    console.log('    POST   /agents/run                   – run a task (synchronous)');
    console.log('    POST   /agents/run/async             – submit a task (async, returns jobId)');
    console.log('    GET    /agents/jobs/:jobId            – poll async job status');
    console.log('    GET    /agents/audit               – audit log for all task runs');
    console.log('    GET    /agents/jobs                   – list all submitted jobs');
    console.log('    GET    /agents/sessions               – list sessions');
    console.log('');
    console.log('  Operator Dashboard:');
    console.log('    GET    /dashboard                     – web UI for approvals and monitoring');
    console.log('');
    console.log('  WhatsApp (Twilio webhook):');
    console.log('    POST   /whatsapp/webhook              – inbound owner commands');
    console.log('');
    console.log('    GET    /health                        – health check');
    console.log('');
    console.log('  CLI:  npx ts-node src/cli/index.ts help');
    console.log('  MCP:  npm run mcp');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down…');
    server.close(async () => {
      await sessionManager.closeAll();
      await browserManager.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
}

// Only run the server when this module is the entry point (not when imported as a lib)
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
