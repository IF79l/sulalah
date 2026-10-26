import {
  channelsFor,
  messagingConfig,
  sendLoginCode,
  verifyStandardWebhook,
} from '@sulalah/messaging';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { backendOn } from '@/lib/backend';
import { billingAsServer } from '@/server/billing/clients';

/**
 * Supabase Auth's Send SMS hook: Supabase makes the code, this sends it. WhatsApp first, SMS
 * when WhatsApp fails or when the code is asked for again. Turned on per project under
 * Authentication > Hooks > Send SMS, pointing at https://<domain>/api/auth/sms-hook with the
 * secret it shows saved as SEND_SMS_HOOK_SECRET.
 */
const payload = z.object({
  user: z.object({ phone: z.string().regex(/^\+?[0-9]{8,15}$/) }).passthrough(),
  sms: z.object({ otp: z.string().regex(/^[0-9]{4,10}$/) }).passthrough(),
});

const MAX_SENDS = 5;

/** Supabase shows this message on a failed send. */
const refuse = (status: number, message: string) =>
  Response.json({ error: { http_code: status, message } }, { status });

export async function POST(req: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET ?? '';
  const raw = await req.text();
  if (!secret || !verifyStandardWebhook(secret, req.headers, raw))
    return refuse(401, 'bad signature');
  const parsed = payload.safeParse(JSON.parse(raw || 'null'));
  if (!parsed.success) return refuse(400, 'bad payload');
  const phone = parsed.data.user.phone.replace(/^\+/, '');
  // Saudi mobiles only, as the sign in screen allows: a script calling the auth API with other
  // numbers must not make us pay for codes sent abroad.
  if (!/^9665\d{8}$/.test(phone)) return refuse(400, 'only Saudi mobile numbers');

  const config = messagingConfig(process.env);
  // The phone is kept only as a keyed hash, enough to tell a resend from a first send.
  const phoneHash = createHmac('sha256', secret).update(phone).digest('hex');
  const db = backendOn && process.env.SUPABASE_SECRET_KEY ? billingAsServer() : null;
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const recent = db
    ? ((
        await db
          .from('otp_sends')
          .select('channel, ok, created_at')
          .eq('phone_hash', phoneHash)
          .gte('created_at', since)
      ).data ?? [])
    : [];

  // Beyond Supabase's own limits: at most five codes to one number in ten minutes.
  if (recent.filter((r) => r.ok).length >= MAX_SENDS) return refuse(429, 'too many codes for this number');

  const now = new Date();
  const channels = channelsFor(
    config,
    recent.map((r) => ({ channel: r.channel, ok: r.ok, at: new Date(r.created_at) })),
    now,
  );
  if (!channels.length) return refuse(500, 'no channel configured');
  const attempts = await sendLoginCode({ phone, code: parsed.data.sms.otp, channels }, config);
  if (db)
    await db
      .from('otp_sends')
      .insert(
        attempts.map((a) => ({
          phone_hash: phoneHash,
          channel: a.channel,
          ok: a.ok,
          error: a.error ?? null,
        })),
      );

  if (!attempts.some((a) => a.ok)) return refuse(502, 'could not send the code');
  return Response.json({});
}
