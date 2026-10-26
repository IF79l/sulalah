import 'server-only';
import {
  flushOutbox,
  whatsappConfig,
  whatsappProvider,
  type FlushReport,
  type OutboxStore,
} from '@sulalah/messaging';
import { backendOn } from '@/lib/backend';
import type { WaOutboxRow } from '@/lib/supabase/billing-types';
import { billingAsServer, type ServerDb } from '@/server/billing/clients';

/** This deployment's WhatsApp channel: Meta, the mock, or off (docs/WHATSAPP.md). */
export const whatsapp = whatsappConfig(process.env);

/** The outbox as the sender sees it, with the secret key. */
export function outboxStore(db: ServerDb): OutboxStore {
  const set = async (id: string, patch: Partial<WaOutboxRow>) => {
    const { error } = await db.from('wa_outbox').update(patch).eq('id', id);
    if (error) throw error;
  };
  return {
    async claim(limit) {
      const { data, error } = await db.rpc('wa_claim', { batch: limit });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        template: r.template,
        phone: r.phone,
        actor: r.actor,
        count: r.count,
        treeId: r.tree_id,
        data: r.data ?? {},
        attempts: r.attempts,
      }));
    },
    async sent(row, providerId) {
      const now = new Date().toISOString();
      await set(row.id, {
        status: 'sent',
        provider_message_id: providerId,
        attempts: row.attempts + 1,
        sent_at: now,
        updated_at: now,
        locked_until: null,
        last_error: null,
      });
    },
    async retry(row, at, error) {
      await set(row.id, {
        status: 'queued',
        attempts: row.attempts + 1,
        next_attempt_at: at.toISOString(),
        last_error: error.slice(0, 300),
        locked_until: null,
        updated_at: new Date().toISOString(),
      });
    },
    async failed(row, error) {
      await set(row.id, {
        status: 'failed',
        attempts: row.attempts + 1,
        last_error: error.slice(0, 300),
        locked_until: null,
        updated_at: new Date().toISOString(),
      });
    },
  };
}

/**
 * Sends what is due in the outbox. Called right after anything that queues a message (the
 * app pings /api/whatsapp/flush, the payment webhook and the billing job call it themselves),
 * and by the daily job for retries. Safe to run many times at once: each message is taken by
 * one run only. With WhatsApp off, messages wait in the queue until they expire.
 */
export async function flushWhatsApp(
  opts: { reminders?: boolean } = {},
): Promise<FlushReport & { mode: string; reminders?: number }> {
  const empty = { sent: 0, retried: 0, failed: 0, mode: whatsapp.mode };
  if (!backendOn || !process.env.SUPABASE_SECRET_KEY) return empty;
  const db = billingAsServer();
  let reminders: number | undefined;
  if (opts.reminders) {
    const { data, error } = await db.rpc('wa_plan_reminders');
    if (error) throw error;
    reminders = data ?? 0;
  }
  const provider = whatsappProvider(whatsapp);
  if (!provider) return { ...empty, ...(reminders !== undefined ? { reminders } : {}) };
  const report = await flushOutbox({ store: outboxStore(db), provider, now: new Date() });
  return { ...report, mode: whatsapp.mode, ...(reminders !== undefined ? { reminders } : {}) };
}
