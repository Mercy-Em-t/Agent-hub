import express, { Application, Request, Response } from 'express';
import { SessionManager } from '../sessions/SessionManager';
import { AgentRegistry } from '../registry/AgentRegistry';
import { SiteRegistry } from '../registry/SiteRegistry';
import { AgentGateway } from '../gateway/AgentGateway';
import { JobStore } from '../jobs/JobStore';
import { IWhatsAppNotifier, TwilioWhatsAppNotifier, NullWhatsAppNotifier } from '../notifications/WhatsAppNotifier';
import { agentRouter } from './routes/agents';
import { registryRouter } from './routes/registry';
import { whatsappRouter } from './routes/whatsapp';

export function createApp(
  sessions: SessionManager,
  agentRegistry: AgentRegistry,
  siteRegistry: SiteRegistry,
  jobStore?: JobStore,
  notifier?: IWhatsAppNotifier,
): Application {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  // Required to parse Twilio's application/x-www-form-urlencoded webhook payloads
  app.use(express.urlencoded({ extended: false }));

  const gateway = new AgentGateway(agentRegistry, siteRegistry);
  const store = jobStore ?? new JobStore();
  const whatsapp = notifier ?? TwilioWhatsAppNotifier.fromEnv() ?? new NullWhatsAppNotifier();

  // Health-check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // Registry routes (agent + site registration, with WhatsApp notifications)
  app.use('/registry', registryRouter(agentRegistry, siteRegistry, whatsapp));

  // Agent execution routes (gateway-protected)
  app.use('/agents', agentRouter(sessions, gateway, store));

  // WhatsApp webhook (Twilio inbound messages → owner commands)
  app.use('/whatsapp', whatsappRouter(agentRegistry));

  return app;
}
