/**
 * Agent-hub – main entry point.
 *
 * Starts the REST API server, which exposes endpoints that allow
 * AI agents (or human operators) to:
 *
 *  POST /agents/run       – run a sequence of browser-automation steps
 *  GET  /agents/sessions  – list active sessions
 *  GET  /health           – service health-check
 *
 * Usage:
 *   npm run dev           (ts-node, development)
 *   npm start             (compiled, production)
 */

import { BrowserManager } from './browser/BrowserManager';
import { SessionManager } from './sessions/SessionManager';
import { createApp } from './api/server';
import { defaultConfig } from './config';

// Re-export public API so agent-hub can be used as a library too.
export * from './agents';
export * from './browser';
export * from './tools';
export * from './sessions';
export { createApp } from './api/server';

async function main() {
  const browserManager = new BrowserManager();
  await browserManager.launch();

  const sessionManager = new SessionManager(browserManager);
  const app = createApp(sessionManager);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultConfig.apiPort;

  const server = app.listen(port, () => {
    console.log(`Agent-hub API listening on http://localhost:${port}`);
    console.log('  POST /agents/run       – run a task');
    console.log('  GET  /agents/sessions  – list sessions');
    console.log('  GET  /health           – health check');
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
