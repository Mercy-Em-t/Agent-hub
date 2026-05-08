import { Router, Request, Response } from 'express';
import { AgentRegistry } from '../../registry/AgentRegistry';

// ── TwiML helpers ─────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Wrap a plain-text reply in a Twilio TwiML <Message> envelope. */
function twimlReply(message: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<Response><Message>${escapeXml(message)}</Message></Response>`
  );
}

/**
 * Format an array of strings as an indented numbered list.
 * e.g. ["a", "b"] → "  1. a\n  2. b"
 */
function numberedList(items: string[]): string {
  return items.map((item, i) => `  ${i + 1}. ${item}`).join('\n');
}

// ── Router factory ────────────────────────────────────────────────────────────

export function whatsappRouter(agentRegistry: AgentRegistry): Router {
  const router = Router();

  /**
   * POST /whatsapp/webhook
   *
   * Twilio calls this endpoint whenever an inbound WhatsApp message arrives
   * on the configured number.  The body is application/x-www-form-urlencoded
   * and includes at minimum:
   *   From – "whatsapp:+<number>" of the sender
   *   Body – text the user typed
   *
   * The handler parses the text as a command and replies with TwiML XML.
   *
   * Supported commands (case-insensitive):
   *   help                   – list available commands
   *   list                   – list agents registered to your phone number
   *   status  <name|id>      – get an agent's current status
   *   approve <name|id>      – approve a pending agent (owner only)
   *   revoke  <name|id>      – revoke an agent (owner only)
   *   info    <name|id>      – show full onboarding details for an agent
   */
  router.post('/webhook', (req: Request, res: Response) => {
    // Twilio prefixes the phone number with "whatsapp:" — strip it
    const senderRaw: string = (req.body as Record<string, string>).From ?? '';
    const sender = senderRaw.replace(/^whatsapp:/i, '');

    const rawText: string = ((req.body as Record<string, string>).Body ?? '').trim();
    const parts = rawText.split(/\s+/);
    const command = (parts[0] ?? '').toLowerCase();
    const args = parts.slice(1).join(' ');

    res.setHeader('Content-Type', 'text/xml');

    switch (command) {
      // ── help ──────────────────────────────────────────────────────────────
      case 'help':
        res.send(
          twimlReply(
            'Agent-hub commands:\n' +
              '  list               – list your registered agents\n' +
              '  status  <name|id>  – get an agent\'s status\n' +
              '  approve <name|id>  – approve a pending agent\n' +
              '  revoke  <name|id>  – revoke an agent\n' +
              '  info    <name|id>  – show full agent details',
          ),
        );
        break;

      // ── list ──────────────────────────────────────────────────────────────
      case 'list': {
        const owned = agentRegistry.findByOwnerPhone(sender);
        if (owned.length === 0) {
          res.send(twimlReply('You have no registered agents.'));
          break;
        }
        const lines = owned.map(
          (a) => `• ${a.name} [${a.status}]  id: ${a.agentId.slice(0, 8)}`,
        );
        res.send(twimlReply(`Your agents:\n${lines.join('\n')}`));
        break;
      }

      // ── status ────────────────────────────────────────────────────────────
      case 'status': {
        if (!args) {
          res.send(twimlReply('Usage: status <agent name or id>'));
          break;
        }
        const agent = agentRegistry.findByNameOrId(args);
        if (!agent) {
          res.send(twimlReply(`No agent found matching "${args}".`));
          break;
        }
        const lines = [
          `Name:   ${agent.name}`,
          `Status: ${agent.status.toUpperCase()}`,
          `Owner:  ${agent.owner}`,
          `ID:     ${agent.agentId.slice(0, 8)}…`,
        ];
        res.send(twimlReply(lines.join('\n')));
        break;
      }

      // ── approve ───────────────────────────────────────────────────────────
      case 'approve': {
        if (!args) {
          res.send(twimlReply('Usage: approve <agent name or id>'));
          break;
        }
        const agent = agentRegistry.findByNameOrId(args);
        if (!agent) {
          res.send(twimlReply(`No agent found matching "${args}".`));
          break;
        }
        if (agent.ownerPhone !== sender) {
          res.send(twimlReply('You do not own this agent.'));
          break;
        }
        try {
          agentRegistry.approve(agent.agentId);
          res.send(
            twimlReply(`✅ Agent "${agent.name}" has been approved and can now operate.`),
          );
        } catch (err) {
          res.send(twimlReply(`Error: ${(err as Error).message}`));
        }
        break;
      }

      // ── revoke ────────────────────────────────────────────────────────────
      case 'revoke': {
        if (!args) {
          res.send(twimlReply('Usage: revoke <agent name or id>'));
          break;
        }
        const agent = agentRegistry.findByNameOrId(args);
        if (!agent) {
          res.send(twimlReply(`No agent found matching "${args}".`));
          break;
        }
        if (agent.ownerPhone !== sender) {
          res.send(twimlReply('You do not own this agent.'));
          break;
        }
        try {
          agentRegistry.revoke(agent.agentId);
          res.send(twimlReply(`🚫 Agent "${agent.name}" has been revoked.`));
        } catch (err) {
          res.send(twimlReply(`Error: ${(err as Error).message}`));
        }
        break;
      }

      // ── info ──────────────────────────────────────────────────────────────
      case 'info': {
        if (!args) {
          res.send(twimlReply('Usage: info <agent name or id>'));
          break;
        }
        const agent = agentRegistry.findByNameOrId(args);
        if (!agent) {
          res.send(twimlReply(`No agent found matching "${args}".`));
          break;
        }
        const infoLines: string[] = [
          `Name:    ${agent.name}`,
          `Status:  ${agent.status.toUpperCase()}`,
          `Owner:   ${agent.owner}`,
          `Purpose: ${agent.purpose}`,
        ];
        if (agent.website) {
          infoLines.push(`Website: ${agent.website}`);
        }
        if (agent.goals && agent.goals.length > 0) {
          infoLines.push(`Goals:\n${numberedList(agent.goals)}`);
        }
        if (agent.workingProcedure && agent.workingProcedure.length > 0) {
          infoLines.push(`Procedure:\n${numberedList(agent.workingProcedure)}`);
        }
        if (agent.responsibilityBounds) {
          const { responsible, notResponsible } = agent.responsibilityBounds;
          if (responsible.length > 0) {
            infoLines.push(`Responsible for: ${responsible.join('; ')}`);
          }
          if (notResponsible.length > 0) {
            infoLines.push(`NOT responsible for: ${notResponsible.join('; ')}`);
          }
        }
        if (agent.constraints && agent.constraints.length > 0) {
          infoLines.push(`Constraints: ${agent.constraints.join('; ')}`);
        }
        res.send(twimlReply(infoLines.join('\n')));
        break;
      }

      // ── unknown ───────────────────────────────────────────────────────────
      default:
        res.send(
          twimlReply(
            rawText.length === 0
              ? 'Welcome to Agent-hub. Send "help" for available commands.'
              : `Unknown command "${command}". Send "help" for available commands.`,
          ),
        );
    }
  });

  return router;
}
