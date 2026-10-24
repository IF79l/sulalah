import { createHash, timingSafeEqual } from 'node:crypto';
import {
  RENEW_AHEAD_MS,
  addCycle,
  priceOf,
  quote,
  type BillingCycle,
  type PlanId,
  type Quote,
} from '@sulalah/domain';
import { z } from 'zod';
import type { BillingStore, Checkout, PaymentProvider, ProviderPayment } from './types';

// ---------- Opening a checkout ----------

export type OpenResult =
  | { ok: true; checkout: Checkout; quote: Quote }
  | { ok: false; reason: 'not_on_sale' | 'already_on_it' | 'is_downgrade' | 'unknown_plan' };

/**
 * Prices the change on the server, from the plans table and the tree's subscription, and opens
 * a checkout for exactly that amount. The browser only ever learns the amount; it never sets it.
 */
export async function openCheckout(
  store: BillingStore,
  p: {
    treeId: string;
    userId: string;
    plan: PlanId;
    cycle: BillingCycle;
    provider: string;
    now: Date;
  },
): Promise<OpenResult> {
  const offer = (await store.offers()).find((o) => o.id === p.plan);
  if (!offer) return { ok: false, reason: 'unknown_plan' };
  const sub = await store.subscription(p.treeId);
  const q = quote(sub, { plan: p.plan, cycle: p.cycle }, offer, p.now);
  if (!q) return { ok: false, reason: 'not_on_sale' };
  if (q.kind === 'none') return { ok: false, reason: 'already_on_it' };
  if (q.kind === 'downgrade') return { ok: false, reason: 'is_downgrade' };
  const checkout = await store.openCheckout({
    treeId: p.treeId,
    userId: p.userId,
    kind: q.kind === 'upgrade' ? 'upgrade' : 'new',
    plan: p.plan,
    cycle: p.cycle,
    amount: q.charge,
    credit: q.credit,
    periodStart: q.periodStart,
    periodEnd: q.periodEnd,
    provider: p.provider,
  });
  return { ok: true, checkout, quote: q };
}

// ---------- Settling a payment ----------

export type Settled = 'applied' | 'declined' | 'mismatch' | 'waiting' | 'not_ours';

/**
 * Applies a payment the provider itself reported. The amount must be the checkout's to the
 * halala: the payment form runs in the browser, so a tampered amount is caught here.
 */
export async function settle(store: BillingStore, payment: ProviderPayment): Promise<Settled> {
  const checkoutId = payment.metadata.checkout_id;
  if (!checkoutId) return 'not_ours';
  const checkout = await store.checkout(checkoutId);
  if (!checkout) return 'not_ours';

  if (payment.status === 'paid' || payment.status === 'captured') {
    if (payment.amount !== checkout.amount || payment.currency !== 'SAR') {
      await store.paymentFailed(checkout.id, payment.id, 'amount does not match the checkout');
      return 'mismatch';
    }
    await store.applyPayment({
      checkoutId: checkout.id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      ...(payment.card?.token
        ? {
            card: {
              token: payment.card.token,
              brand: payment.card.brand,
              last4: payment.card.last4,
              ...(payment.card.month ? { month: payment.card.month } : {}),
              ...(payment.card.year ? { year: payment.card.year } : {}),
            },
          }
        : {}),
    });
    return 'applied';
  }
  if (payment.status === 'failed') {
    await store.paymentFailed(checkout.id, payment.id, payment.message ?? 'declined');
    return 'declined';
  }
  return 'waiting';
}

// ---------- The webhook ----------

const event = z.object({
  id: z.string(),
  type: z.string(),
  secret_token: z.string(),
  live: z.boolean().optional(),
  data: z.object({ id: z.string() }).passthrough(),
});

const digest = (s: string) => createHash('sha256').update(s).digest();

export interface WebhookResult {
  status: number;
  outcome: Settled | 'bad_request' | 'bad_secret' | 'wrong_mode' | 'ignored' | 'unknown_payment';
}

/**
 * Moyasar's webhook. The body is trusted for nothing but the payment id: the shared secret
 * says the call came from Moyasar, and the payment is then fetched back with our secret key.
 * Errors answer 500 so Moyasar delivers again; everything else answers 200 so it stops.
 */
export async function handleWebhook(
  body: unknown,
  deps: { secret: string; provider: PaymentProvider; store: BillingStore; live: boolean },
): Promise<WebhookResult> {
  const parsed = event.safeParse(body);
  if (!parsed.success) return { status: 400, outcome: 'bad_request' };
  const e = parsed.data;
  if (!deps.secret || !timingSafeEqual(digest(e.secret_token), digest(deps.secret)))
    return { status: 401, outcome: 'bad_secret' };
  if (e.live !== undefined && e.live !== deps.live) return { status: 200, outcome: 'wrong_mode' };
  if (!e.type.startsWith('payment_')) return { status: 200, outcome: 'ignored' };

  const payment = await deps.provider.fetchPayment(e.data.id);
  if (!payment) return { status: 200, outcome: 'unknown_payment' };
  if (payment.live !== deps.live) return { status: 200, outcome: 'wrong_mode' };
  return { status: 200, outcome: await settle(deps.store, payment) };
}

// ---------- Renewals ----------

export interface RenewalReport {
  expired: number;
  charged: number;
  declined: number;
  skipped: number;
}

/**
 * The daily billing job: ends what is due, then charges the saved card of every plan ending
 * within half a day, and retries declined renewals on their day. A renewal moves to a waiting
 * downgrade. Running it twice in a row charges nobody twice.
 */
export async function runRenewals(deps: {
  store: BillingStore;
  provider: PaymentProvider;
  now: Date;
  callbackUrl: string;
}): Promise<RenewalReport> {
  const { store, provider, now } = deps;
  const report: RenewalReport = {
    expired: await store.expire(),
    charged: 0,
    declined: 0,
    skipped: 0,
  };
  const offers = await store.offers();

  for (const sub of await store.renewable(now, RENEW_AHEAD_MS)) {
    const plan = sub.scheduledPlan ?? sub.plan;
    const cycle = sub.scheduledCycle ?? sub.cycle;
    const offer = offers.find((o) => o.id === plan);
    const price = offer ? priceOf(offer, cycle) : null;
    if (!sub.periodEnd || price === null) {
      report.skipped++;
      continue;
    }

    let checkout = await store.renewalFor(sub.treeId, sub.periodEnd);
    if (checkout && checkout.status !== 'failed') {
      // Paid already, or a charge is in flight.
      report.skipped++;
      continue;
    }
    checkout ??= await store.openCheckout({
      treeId: sub.treeId,
      userId: null,
      kind: 'renewal',
      plan,
      cycle,
      amount: price,
      credit: 0,
      periodStart: sub.periodEnd,
      periodEnd: addCycle(sub.periodEnd, cycle),
      provider: provider.name,
    });

    const payment = await provider.chargeToken({
      amount: checkout.amount,
      token: sub.cardToken,
      description: `تجديد باقة سُلالة`,
      metadata: { checkout_id: checkout.id, tree_id: sub.treeId },
      callbackUrl: deps.callbackUrl,
    });
    // Our own call with the secret key, answered by the provider: as good as the webhook,
    // which will report the same payment again and change nothing.
    const result = await settle(store, payment);
    if (result === 'applied') report.charged++;
    else if (result === 'declined') report.declined++;
    else report.skipped++;
  }
  return report;
}
