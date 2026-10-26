import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Meta's webhook for the Sulalah number: what became of each message (delivered, read,
 * failed), and replies. A reply of "إيقاف" turns WhatsApp notices off for that number and
 * "تشغيل" turns them back on, as WhatsApp's policy asks a business to honour.
 */

/** Meta signs the raw body with the app secret: "sha256=<hex>". */
export function verifyMetaSignature(appSecret: string, header: string | null, body: string) {
  if (!appSecret || !header?.startsWith('sha256=')) return false;
  const given = Buffer.from(header.slice(7), 'hex');
  const want = createHmac('sha256', appSecret).update(body).digest();
  return given.length === want.length && timingSafeEqual(given, want);
}

/** The one-time handshake when the webhook is saved on Meta: answers the challenge or null. */
export function metaHandshake(params: URLSearchParams, verifyToken: string | undefined) {
  if (!verifyToken) return null;
  if (params.get('hub.mode') !== 'subscribe') return null;
  const got = Buffer.from(params.get('hub.verify_token') ?? '');
  const want = Buffer.from(verifyToken);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  return params.get('hub.challenge');
}

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface StatusUpdate {
  providerId: string;
  status: DeliveryStatus;
  at: Date;
  error?: string;
}

export interface Reply {
  /** Digits with the country code. */
  from: string;
  wants: 'stop' | 'start' | null;
}

const STOP = ['إيقاف', 'ايقاف', 'وقف', 'الغاء', 'إلغاء', 'stop', 'unsubscribe'];
const START = ['تشغيل', 'start', 'subscribe'];

/** "إيقاف", "ايقاف التنبيهات", "STOP" all ask to stop; anything else is just a reply. */
export function intentOf(text: string): Reply['wants'] {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[.!؟?]/g, '');
  const first = t.split(/\s+/)[0] ?? '';
  if (STOP.includes(first)) return 'stop';
  if (START.includes(first)) return 'start';
  return null;
}

interface MetaBody {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        statuses?: {
          id?: string;
          status?: string;
          timestamp?: string;
          errors?: { code?: number; title?: string; message?: string }[];
        }[];
        messages?: {
          from?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string };
        }[];
      };
    }[];
  }[];
}

export function parseMetaWebhook(body: unknown): { statuses: StatusUpdate[]; replies: Reply[] } {
  const statuses: StatusUpdate[] = [];
  const replies: Reply[] = [];
  for (const entry of (body as MetaBody)?.entry ?? [])
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const s of change.value?.statuses ?? []) {
        if (!s.id || !['sent', 'delivered', 'read', 'failed'].includes(s.status ?? '')) continue;
        const e = s.errors?.[0];
        statuses.push({
          providerId: s.id,
          status: s.status as DeliveryStatus,
          at: new Date(Number(s.timestamp ?? 0) * 1000 || Date.now()),
          ...(e ? { error: `#${e.code ?? '?'} ${e.message ?? e.title ?? ''}`.trim() } : {}),
        });
      }
      for (const m of change.value?.messages ?? []) {
        if (!m.from) continue;
        const text = m.text?.body ?? m.button?.text ?? '';
        replies.push({ from: m.from.replace(/\D/g, ''), wants: intentOf(text) });
      }
    }
  return { statuses, replies };
}
