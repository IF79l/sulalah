import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks a request signed the Standard Webhooks way, as Supabase Auth signs its hooks:
 * HMAC-SHA256 over "id.timestamp.body", with the secret written "v1,whsec_<base64>".
 * Several secrets may be given separated by "|" while one is being rotated.
 */
export function verifyStandardWebhook(
  secrets: string,
  headers: { get(name: string): string | null },
  body: string,
  now = Date.now(),
): boolean {
  const id = headers.get('webhook-id');
  const ts = headers.get('webhook-timestamp');
  const sig = headers.get('webhook-signature');
  if (!id || !ts || !sig || !/^\d+$/.test(ts)) return false;
  // Five minutes either way, so an old request cannot be replayed.
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;

  const given = sig
    .split(' ')
    .map((s) => s.split(','))
    .filter(([v, s]) => v === 'v1' && s)
    .map(([, s]) => Buffer.from(s!, 'base64'));
  for (const secret of secrets.split('|')) {
    const key = Buffer.from(
      secret
        .trim()
        .replace(/^v1,/, '')
        .replace(/^whsec_/, ''),
      'base64',
    );
    if (!key.length) continue;
    const want = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
    if (given.some((g) => g.length === want.length && timingSafeEqual(g, want))) return true;
  }
  return false;
}

/** Signs like Supabase does, for tests and local runs. */
export function signStandardWebhook(secret: string, id: string, ts: number, body: string) {
  const key = Buffer.from(secret.replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  return `v1,${createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')}`;
}
