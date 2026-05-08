import { EventEmitter } from 'events';
import * as httpsModule from 'https';
import {
  NullWhatsAppNotifier,
  TwilioWhatsAppNotifier,
} from '../../src/notifications/WhatsAppNotifier';

// Mock the entire 'https' module so we can control request behaviour
jest.mock('https');
const https = httpsModule as unknown as { request: jest.Mock };

// ── NullWhatsAppNotifier ─────────────────────────────────────────────────────

describe('NullWhatsAppNotifier', () => {
  it('resolves without error and sends nothing', async () => {
    const notifier = new NullWhatsAppNotifier();
    await expect(notifier.send('+1234567890', 'Hello')).resolves.toBeUndefined();
  });
});

// ── TwilioWhatsAppNotifier.fromEnv ────────────────────────────────────────────

describe('TwilioWhatsAppNotifier.fromEnv()', () => {
  const origSid = process.env.TWILIO_ACCOUNT_SID;
  const origToken = process.env.TWILIO_AUTH_TOKEN;
  const origFrom = process.env.TWILIO_WHATSAPP_FROM;

  afterEach(() => {
    if (origSid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
    else process.env.TWILIO_ACCOUNT_SID = origSid;
    if (origToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = origToken;
    if (origFrom === undefined) delete process.env.TWILIO_WHATSAPP_FROM;
    else process.env.TWILIO_WHATSAPP_FROM = origFrom;
  });

  it('returns null when no env vars are set', () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
    expect(TwilioWhatsAppNotifier.fromEnv()).toBeNull();
  });

  it('returns null when only some env vars are set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
    expect(TwilioWhatsAppNotifier.fromEnv()).toBeNull();
  });

  it('returns a TwilioWhatsAppNotifier when all env vars are present', () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_WHATSAPP_FROM = '+14155238886';
    const notifier = TwilioWhatsAppNotifier.fromEnv();
    expect(notifier).toBeInstanceOf(TwilioWhatsAppNotifier);
  });
});

// ── TwilioWhatsAppNotifier.send ───────────────────────────────────────────────

describe('TwilioWhatsAppNotifier.send()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** Build a fake https.request that calls the callback with a given statusCode. */
  function setupRequest(statusCode: number) {
    const res = Object.assign(new EventEmitter(), {
      statusCode,
      resume: jest.fn(),
    });

    const req = Object.assign(new EventEmitter(), {
      write: jest.fn(),
      end: jest.fn(),
    });

    https.request.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_options: any, callback: (r: typeof res) => void) => {
        callback(res);
        return req;
      },
    );

    return { req, res };
  }

  it('resolves on a 2xx response', async () => {
    const { res } = setupRequest(201);
    const notifier = new TwilioWhatsAppNotifier('ACsid', 'token', '+14155238886');

    const sendPromise = notifier.send('+1234567890', 'Hello');
    // Trigger data flow
    res.emit('end');

    await expect(sendPromise).resolves.toBeUndefined();
    expect(https.request).toHaveBeenCalledTimes(1);
  });

  it('rejects on a 4xx response with the status code', async () => {
    const { res } = setupRequest(400);
    const notifier = new TwilioWhatsAppNotifier('ACsid', 'token', '+14155238886');

    const sendPromise = notifier.send('+1234567890', 'Hello');
    res.emit('data', Buffer.from('{"message":"Bad Request"}'));
    res.emit('end');

    await expect(sendPromise).rejects.toThrow('400');
  });

  it('rejects when the request emits a network error', async () => {
    const req = Object.assign(new EventEmitter(), {
      write: jest.fn(),
      end: jest.fn(),
    });

    https.request.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_opts: any) => req,
    );

    const notifier = new TwilioWhatsAppNotifier('ACsid', 'token', '+14155238886');
    const sendPromise = notifier.send('+1234567890', 'Hello');

    // Emit the error after the promise is in flight
    req.emit('error', new Error('ECONNREFUSED'));

    await expect(sendPromise).rejects.toThrow('ECONNREFUSED');
  });
});
