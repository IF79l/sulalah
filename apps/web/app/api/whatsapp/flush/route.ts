import { backendOn } from '@/lib/backend';
import { billingAsUser } from '@/server/billing/clients';
import { flushWhatsApp } from '@/server/whatsapp/send';

/**
 * Sends the WhatsApp messages that are due now. The app calls it right after an action that
 * notifies someone (a submission, a review, a new role), so the message goes within seconds
 * instead of waiting for the daily job. It sends only what the database queued; asking it
 * twice sends nothing twice. Only a signed in person may ask.
 */
export async function POST() {
  if (!backendOn) return new Response(null, { status: 204 });
  const db = await billingAsUser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });
  try {
    const report = await flushWhatsApp();
    return Response.json({ sent: report.sent }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    // The message stays queued; the next ping or the daily job sends it.
    console.error('[whatsapp] flush failed', e);
    return Response.json({ sent: 0 }, { status: 202 });
  }
}
