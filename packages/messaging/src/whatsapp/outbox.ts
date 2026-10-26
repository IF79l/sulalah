import type { WhatsAppProvider } from './provider';
import { isTemplateKey } from './templates';

/**
 * Sending what waits in the outbox. The database queues a message whenever a notification or
 * a billing event happens (supabase/migrations/…_whatsapp.sql); this takes a batch, sends each,
 * and records the answer. A message that fails for a reason that may pass is tried again
 * later, up to five times; one that can never go is marked failed at once.
 */

export interface OutboxRow {
  id: string;
  template: string;
  /** Read from the account at send time and never stored in the outbox. Null: no number. */
  phone: string | null;
  actor: string;
  count: number;
  treeId: string | null;
  data: Record<string, unknown>;
  /** Tries made before this one. */
  attempts: number;
}

export interface OutboxStore {
  /**
   * Takes up to `limit` messages that are due, so no other run sends them too. Expires
   * messages too old to be worth sending and skips people who turned WhatsApp off.
   */
  claim(limit: number): Promise<OutboxRow[]>;
  /** Each records one more try on the row (`row.attempts + 1`). */
  sent(row: OutboxRow, providerId: string): Promise<void>;
  retry(row: OutboxRow, at: Date, error: string): Promise<void>;
  failed(row: OutboxRow, error: string): Promise<void>;
}

/** After the 1st, 2nd… failed try. */
export const RETRY_AFTER_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];

export interface FlushReport {
  sent: number;
  retried: number;
  failed: number;
}

export async function flushOutbox(deps: {
  store: OutboxStore;
  provider: WhatsAppProvider;
  now: Date;
  limit?: number;
}): Promise<FlushReport> {
  const { store, provider, now } = deps;
  const report: FlushReport = { sent: 0, retried: 0, failed: 0 };
  for (const row of await store.claim(deps.limit ?? 50)) {
    const to = (row.phone ?? '').replace(/\D/g, '');
    if (!isTemplateKey(row.template)) {
      await store.failed(row, `unknown template ${row.template}`);
      report.failed++;
      continue;
    }
    if (!/^[1-9]\d{7,14}$/.test(to)) {
      await store.failed(row, 'no phone number on the account');
      report.failed++;
      continue;
    }
    const res = await provider.send({
      to,
      template: row.template,
      input: { actor: row.actor, count: row.count, treeId: row.treeId, data: row.data },
    });
    if (res.ok) {
      await store.sent(row, res.id);
      report.sent++;
    } else if (res.retry && row.attempts < RETRY_AFTER_MS.length) {
      await store.retry(row, new Date(now.getTime() + RETRY_AFTER_MS[row.attempts]!), res.error);
      report.retried++;
    } else {
      await store.failed(row, res.error);
      report.failed++;
    }
  }
  return report;
}
