import { runRenewals } from '@sulalah/billing';
import { timingSafeEqual } from 'node:crypto';
import { backendOn } from '@/lib/backend';
import { billingAsServer } from '@/server/billing/clients';
import { appUrl, paymentProvider } from '@/server/billing/env';
import { supabaseStore } from '@/server/billing/store';
import { flushWhatsApp } from '@/server/whatsapp/send';

/**
 * The daily billing job (vercel.json crons): ends plans that are due, renews with saved cards,
 * retries declined renewals. Vercel calls it with "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: Request) {
  if (!backendOn) return new Response('not configured', { status: 503 });
  const secret = process.env.CRON_SECRET ?? '';
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want))
    return new Response('unauthorized', { status: 401 });

  const report = await runRenewals({
    store: supabaseStore(billingAsServer()),
    provider: paymentProvider(),
    now: new Date(),
    callbackUrl: `${appUrl}/trees`,
  });
  // Renewal receipts go now; the night's other notices wait for the morning in the queue.
  const whatsapp = await flushWhatsApp().catch((e) => {
    console.error('[whatsapp] flush failed', e);
    return null;
  });
  console.info('[billing job]', report, whatsapp);
  return Response.json({ ...report, whatsapp });
}
