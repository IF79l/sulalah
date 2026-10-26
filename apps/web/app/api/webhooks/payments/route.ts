import { handleWebhook } from '@sulalah/billing';
import { after } from 'next/server';
import { backendOn } from '@/lib/backend';
import { billingAsServer } from '@/server/billing/clients';
import { liveMode, paymentProvider, webhookSecret } from '@/server/billing/env';
import { supabaseStore } from '@/server/billing/store';
import { flushWhatsApp } from '@/server/whatsapp/send';

/**
 * Payment webhook. Subscriptions activate only here: the shared secret is checked, the payment
 * is fetched back from the provider with our secret key, and its amount must match the
 * checkout the server opened. Set on the Moyasar dashboard as
 * https://<domain>/api/webhooks/payments with the same secret as MOYASAR_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  if (!backendOn) return new Response('not configured', { status: 503 });
  const body = await req.json().catch(() => null);
  try {
    const result = await handleWebhook(body, {
      secret: webhookSecret,
      provider: paymentProvider(),
      store: supabaseStore(billingAsServer()),
      live: liveMode,
    });
    if (result.outcome !== 'applied') console.info(`[payments webhook] ${result.outcome}`);
    // The receipt the payment queued goes on WhatsApp once Moyasar has its answer.
    else after(() => flushWhatsApp().catch((e) => console.error('[whatsapp] flush failed', e)));
    return Response.json({ outcome: result.outcome }, { status: result.status });
  } catch (e) {
    // Moyasar delivers again on any error answer.
    console.error('[payments webhook] failed', e);
    return Response.json({ outcome: 'error' }, { status: 500 });
  }
}
