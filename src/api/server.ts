import express, { Application, Request, Response } from 'express';
import { SessionManager } from '../sessions/SessionManager';
import { AgentRegistry } from '../registry/AgentRegistry';
import { SiteRegistry } from '../registry/SiteRegistry';
import { AgentGateway } from '../gateway/AgentGateway';
import { JobStore } from '../jobs/JobStore';
import { agentRouter } from './routes/agents';
import { registryRouter } from './routes/registry';

export function createApp(
  sessions: SessionManager,
  agentRegistry: AgentRegistry,
  siteRegistry: SiteRegistry,
  jobStore?: JobStore,
): Application {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  const gateway = new AgentGateway(agentRegistry, siteRegistry);
  const store = jobStore ?? new JobStore();

  // Health-check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // Registry routes (agent + site registration)
  app.use('/registry', registryRouter(agentRegistry, siteRegistry));

  // Agent execution routes (gateway-protected)
  app.use('/agents', agentRouter(sessions, gateway, store));

  return app;
}
