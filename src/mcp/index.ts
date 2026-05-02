/**
 * Agent-hub MCP Server entry point.
 *
 * Run with:
 *   npm run mcp
 *   npx ts-node src/mcp/index.ts
 *
 * Configure with:
 *   AGENT_HUB_URL=http://localhost:3000  (default)
 */
import { startServer } from './server';

startServer();
