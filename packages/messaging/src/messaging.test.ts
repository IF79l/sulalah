import { describe, expect, it } from 'vitest';
import {
  channelsFor,
  sendLoginCode,
  signStandardWebhook,
  verifyStandardWebhook,
  type MessagingConfig,
} from './index';

const both: MessagingConfig = {
  whatsapp: { token: 't', phoneNumberId: '1', template: 'sulalah_code' },
  sms: { appSid: 'a', senderId: 'Sulalah' },
  production: true,
};
const now = new Date('2026-10-24T12:00:00Z');

describe('choosing a channel', () => {
  it('tries WhatsApp first, then SMS', () => {
    expect(channelsFor(both, [], now)).toEqual(['whatsapp', 'sms']);
  });

  it('sends a resend by SMS', () => {
    const recent = [
      { channel: 'whatsapp' as const, ok: true, at: new Date(now.getTime() - 60_000) },
    ];
    expect(channelsFor(both, recent, now)).toEqual(['sms']);
  });

  it('goes back to WhatsApp after ten minutes', () => {
    const recent = [
      { channel: 'whatsapp' as const, ok: true, at: new Date(now.getTime() - 11 * 60_000) },
    ];
    expect(channelsFor(both, recent, now)[0]).toBe('whatsapp');
  });

  it('logs the code only outside production', () => {
    expect(channelsFor({ production: false }, [], now)).toEqual(['mock']);
    expect(channelsFor({ production: true }, [], now)).toEqual([]);
  });
});

describe('sending', () => {
  it('falls back to SMS when WhatsApp fails', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      return url.includes('facebook')
        ? new Response('{}', { status: 500 })
        : new Response('{"success":"true"}', { status: 200 });
    }) as unknown as typeof fetch;
    const out = await sendLoginCode(
      { phone: '+966551234567', code: '123456', channels: ['whatsapp', 'sms'] },
      both,
      fetcher,
    );
    expect(out.map((a) => [a.channel, a.ok])).toEqual([
      ['whatsapp', false],
      ['sms', true],
    ]);
    expect(calls[1]).toContain('unifonic');
  });

  it('never prints the whole number in the log', async () => {
    const lines: string[] = [];
    await sendLoginCode(
      { phone: '+966551234567', code: '123456', channels: ['mock'] },
      { production: false },
      fetch,
      (l) => lines.push(l),
    );
    expect(lines[0]).toContain('123456');
    expect(lines[0]).not.toContain('551234567');
  });
});

describe('standard webhooks', () => {
  const secret = `v1,whsec_${Buffer.from('a'.repeat(32)).toString('base64')}`;
  const body = '{"user":{"phone":"966551234567"},"sms":{"otp":"123456"}}';
  const ts = Math.floor(now.getTime() / 1000);
  const headers = (sig: string, t = ts) =>
    new Headers({
      'webhook-id': 'msg_1',
      'webhook-timestamp': String(t),
      'webhook-signature': sig,
    });

  it('accepts what Supabase signed', () => {
    const sig = signStandardWebhook(secret, 'msg_1', ts, body);
    expect(verifyStandardWebhook(secret, headers(sig), body, now.getTime())).toBe(true);
  });

  it('refuses a changed body, a wrong secret and an old request', () => {
    const sig = signStandardWebhook(secret, 'msg_1', ts, body);
    expect(
      verifyStandardWebhook(secret, headers(sig), body.replace('123456', '000000'), now.getTime()),
    ).toBe(false);
    expect(
      verifyStandardWebhook(
        `v1,whsec_${Buffer.from('b'.repeat(32)).toString('base64')}`,
        headers(sig),
        body,
        now.getTime(),
      ),
    ).toBe(false);
    const old = signStandardWebhook(secret, 'msg_1', ts - 600, body);
    expect(verifyStandardWebhook(secret, headers(old, ts - 600), body, now.getTime())).toBe(false);
  });
});
