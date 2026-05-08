import * as https from 'https';

/**
 * Common interface for sending WhatsApp messages to an agent owner.
 * Implementations include TwilioWhatsAppNotifier (production) and
 * NullWhatsAppNotifier (testing / unconfigured environments).
 */
export interface IWhatsAppNotifier {
  /**
   * Send a WhatsApp message.
   * @param to   E.164 phone number of the recipient (e.g. "+1234567890").
   * @param body Text content of the message.
   */
  send(to: string, body: string): Promise<void>;
}

/**
 * WhatsApp notifier backed by the Twilio Messaging API.
 *
 * Required environment variables (or constructor arguments):
 *   TWILIO_ACCOUNT_SID   – Twilio Account SID
 *   TWILIO_AUTH_TOKEN    – Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM – The Twilio WhatsApp-enabled number in E.164 format
 *                          (e.g. "+14155238886" for the sandbox)
 *
 * Messages are sent from "whatsapp:<from>" to "whatsapp:<to>" using
 * Twilio's REST API — no extra npm packages required.
 */
export class TwilioWhatsAppNotifier implements IWhatsAppNotifier {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async send(to: string, body: string): Promise<void> {
    const postData = new URLSearchParams({
      From: `whatsapp:${this.fromNumber}`,
      To: `whatsapp:${to}`,
      Body: body,
    }).toString();

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    await new Promise<void>((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          Authorization: `Basic ${auth}`,
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== undefined && res.statusCode >= 400) {
          let errBody = '';
          res.on('data', (chunk: Buffer) => {
            errBody += chunk.toString();
          });
          res.on('end', () => {
            reject(new Error(`Twilio API error ${res.statusCode}: ${errBody}`));
          });
        } else {
          res.resume();
          resolve();
        }
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Construct a TwilioWhatsAppNotifier from environment variables.
   * Returns null if any required variable is missing so callers can fall
   * back to NullWhatsAppNotifier gracefully.
   */
  static fromEnv(): TwilioWhatsAppNotifier | null {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!sid || !token || !from) return null;
    return new TwilioWhatsAppNotifier(sid, token, from);
  }
}

/**
 * No-op notifier used when WhatsApp credentials are not configured or in
 * test environments that do not need real notifications.
 */
export class NullWhatsAppNotifier implements IWhatsAppNotifier {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_to: string, _body: string): Promise<void> {
    // intentionally does nothing
  }
}
