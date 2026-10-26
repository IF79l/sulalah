import { metaHandshake, parseMetaWebhook, verifyMetaSignature } from '@sulalah/messaging';
import { backendOn } from '@/lib/backend';
import { billingAsServer } from '@/server/billing/clients';
import { whatsapp } from '@/server/whatsapp/send';

/**
 * Meta's webhook for the Sulalah WhatsApp number, saved in the Meta app under WhatsApp >
 * Configuration as https://<domain>/api/webhooks/whatsapp with WHATSAPP_VERIFY_TOKEN, and
 * subscribed to "messages". It reports what became of each message, and replies: "إيقاف"
 * turns that number's notices off, "تشغيل" back on.
 */
export async function GET(req: Request) {
  const challenge = metaHandshake(new URL(req.url).searchParams, whatsapp.verifyToken);
  return challenge === null
    ? new Response('forbidden', { status: 403 })
    : new Response(challenge, { headers: { 'content-type': 'text/plain' } });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(whatsapp.appSecret ?? '', req.headers.get('x-hub-signature-256'), raw))
    return new Response('bad signature', { status: 401 });
  // Meta wants a quick 200; anything unreadable is dropped rather than delivered again.
  if (!backendOn || !process.env.SUPABASE_SECRET_KEY) return Response.json({ ok: true });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }
  const { statuses, replies } = parseMetaWebhook(body);
  const db = billingAsServer();
  try {
    for (const s of statuses) {
      const { error } = await db.rpc('wa_delivery', {
        message: s.providerId,
        what: s.status,
        at: s.at.toISOString(),
        error: s.error ?? null,
      });
      if (error) throw error;
    }
    for (const r of replies) {
      if (!r.wants) continue;
      const { error } = await db.rpc('wa_set_by_phone', {
        number: r.from,
        wanted: r.wants === 'start',
      });
      if (error) throw error;
    }
  } catch (e) {
    // An error answer makes Meta deliver again, and every step above is safe to repeat.
    console.error('[whatsapp webhook] failed', e);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
