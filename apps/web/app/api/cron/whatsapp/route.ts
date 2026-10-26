import { timingSafeEqual } from 'node:crypto';
import { backendOn } from '@/lib/backend';
import { flushWhatsApp } from '@/server/whatsapp/send';

/**
 * The WhatsApp job (vercel.json crons): queues the "your plan ends in three days" reminders,
 * then sends whatever is due, retries included. Vercel calls it with
 * "Authorization: Bearer $CRON_SECRET". Messages normally go at once (see /api/whatsapp/flush);
 * this catches retries and anything a dropped ping left behind.
 */
export async function GET(req: Request) {
  if (!backendOn) return new Response('not configured', { status: 503 });
  const secret = process.env.CRON_SECRET ?? '';
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want))
    return new Response('unauthorized', { status: 401 });

  const report = await flushWhatsApp({ reminders: true });
  console.info('[whatsapp job]', report);
  return Response.json(report);
}
