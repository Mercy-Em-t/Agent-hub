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

// Re-export public API so agent-hub can be used as a library too.
export * from './agents';
export * from './browser';
export * from './tools';
export * from './sessions';
export * from './registry';
export * from './gateway';
export * from './jobs';
export { createApp } from './api/server';

async function main() {
  const browserManager = new BrowserManager();
  await browserManager.launch();

  const sessionManager = new SessionManager(browserManager);
  const agentRegistry = new AgentRegistry();
  const siteRegistry = new SiteRegistry();
  const app = createApp(sessionManager, agentRegistry, siteRegistry);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultConfig.apiPort;

  const server = app.listen(port, () => {
    console.log(`Agent-hub API listening on http://localhost:${port}`);
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
    console.log('    GET    /agents/jobs                   – list all submitted jobs');
    console.log('    GET    /agents/sessions               – list sessions');
    console.log('');
    console.log('    GET    /health                        – health check');
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
