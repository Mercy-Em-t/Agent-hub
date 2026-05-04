import express, { Application, Request, Response } from 'express';
import { SessionManager } from '../sessions/SessionManager';
import { AgentRegistry } from '../registry/AgentRegistry';
import { SiteRegistry } from '../registry/SiteRegistry';
import { AgentGateway } from '../gateway/AgentGateway';
import { JobStore } from '../jobs/JobStore';
import { AuditLog } from '../audit/AuditLog';
import { IWhatsAppNotifier, TwilioWhatsAppNotifier, NullWhatsAppNotifier } from '../notifications/WhatsAppNotifier';
import { agentRouter } from './routes/agents';
import { registryRouter } from './routes/registry';
import { whatsappRouter } from './routes/whatsapp';
import { capabilitiesRouter } from './routes/capabilities';
import { dashboardRouter } from './routes/dashboard';
import { operatorAuthMiddleware } from './middleware/operatorAuth';
import { createRateLimiter } from './middleware/rateLimiter';

const startTime = Date.now();

export function createApp(
  sessions: SessionManager,
  agentRegistry: AgentRegistry,
  siteRegistry: SiteRegistry,
  jobStore?: JobStore,
  notifier?: IWhatsAppNotifier,
  auditLog?: AuditLog,
): Application {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  // Required to parse Twilio's application/x-www-form-urlencoded webhook payloads
  app.use(express.urlencoded({ extended: false }));

  const gateway = new AgentGateway(agentRegistry, siteRegistry);
  const store = jobStore ?? new JobStore();
  const whatsapp = notifier ?? TwilioWhatsAppNotifier.fromEnv() ?? new NullWhatsAppNotifier();
  const log = auditLog ?? new AuditLog();
  const rateLimiter = createRateLimiter();

  // ── Enriched health-check ─────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const activeSessions = sessions.list().filter((s) => s.status === 'running').length;
    const allJobs = store.list();
    const mem = process.memoryUsage();

    res.json({
      status: 'ok',
      version: '0.1.0',
      uptime: uptimeSec,
      sessions: {
        active: activeSessions,
        total:  sessions.list().length,
      },
      jobs: {
        queued:    allJobs.filter((j) => j.status === 'queued').length,
        running:   allJobs.filter((j) => j.status === 'running').length,
        completed: allJobs.filter((j) => j.status === 'completed').length,
        failed:    allJobs.filter((j) => j.status === 'failed').length,
      },
      memory: {
        heapUsedMb:  Math.round(mem.heapUsed  / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb:       Math.round(mem.rss       / 1024 / 1024),
      },
    });
  });

  // Discovery endpoints — agent-first, no auth needed
  app.use('/', capabilitiesRouter());

  // Operator dashboard — no auth (operators supply the operator key per-action via UI)
  app.use('/dashboard', dashboardRouter());

  // Registry routes (agent + site registration, with WhatsApp notifications + operator auth)
  app.use('/registry', registryRouter(agentRegistry, siteRegistry, whatsapp, operatorAuthMiddleware));

  // Agent execution routes (gateway-protected, rate-limited, audit-logged)
  app.use('/agents', agentRouter(sessions, gateway, store, log, rateLimiter));

  // WhatsApp webhook (Twilio inbound messages → owner commands)
  app.use('/whatsapp', whatsappRouter(agentRegistry));

  return app;
}
