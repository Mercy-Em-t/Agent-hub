import express, { Application, Request, Response } from 'express';
import { SessionManager } from '../sessions/SessionManager';
import { agentRouter } from './routes/agents';

export function createApp(sessions: SessionManager): Application {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  // Health-check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // Agent routes
  app.use('/agents', agentRouter(sessions));

  return app;
}
