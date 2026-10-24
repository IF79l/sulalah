import {
  defaultPlanLimits,
  nextRetry,
  planIds,
  testPlanPrices,
  type PlanOffer,
} from '@sulalah/domain';
import type { BillingStore, Checkout, Renewable, Subscription } from './types';

/**
 * The store in memory, following the database functions' rules, for tests and local runs
 * without a database. Not for production: nothing survives a restart.
 */
export function memoryStore(offers?: PlanOffer[]) {
  const plans: PlanOffer[] =
    offers ??
    planIds.map((id) => ({ id, limits: defaultPlanLimits[id], prices: testPlanPrices[id] }));
  const checkouts = new Map<string, Checkout>();
  const subs = new Map<string, Subscription & { cardToken: string | null }>();
  const invoices: { id: string; checkoutId: string; amount: number }[] = [];
  let n = 0;

  const store: BillingStore & {
    checkouts: typeof checkouts;
    subs: typeof subs;
    invoices: typeof invoices;
  } = {
    checkouts,
    subs,
    invoices,
    async offers() {
      return plans;
    },
    async subscription(treeId) {
      return subs.get(treeId) ?? null;
    },
    async checkout(id) {
      return checkouts.get(id) ?? null;
    },
    async openCheckout(c) {
      const row: Checkout = { ...c, id: `chk_${++n}`, status: 'open', providerPaymentId: null };
      checkouts.set(row.id, row);
      return row;
    },
    async attachPayment(id, paymentId) {
      const c = checkouts.get(id);
      if (c && c.status !== 'paid') c.providerPaymentId = paymentId;
    },
    async applyPayment(p) {
      const c = checkouts.get(p.checkoutId);
      if (!c) throw new Error('unknown checkout');
      if (c.status === 'paid') {
        if (c.providerPaymentId !== p.paymentId)
          throw new Error('checkout already paid by another payment');
        return invoices.find((i) => i.checkoutId === c.id)!.id;
      }
      if (p.amount !== c.amount || p.currency !== 'SAR')
        throw new Error('amount does not match the checkout');
      const old = subs.get(c.treeId);
      subs.set(c.treeId, {
        id: old?.id ?? `sub_${++n}`,
        treeId: c.treeId,
        plan: c.plan,
        cycle: c.cycle,
        status: 'active',
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        periodValue: c.amount + c.credit,
        provider: c.provider,
        cancelAtPeriodEnd: c.kind === 'renewal' ? (old?.cancelAtPeriodEnd ?? false) : false,
        scheduledPlan: null,
        scheduledCycle: null,
        retryCount: 0,
        nextRetryAt: null,
        cardToken: p.card?.token ?? old?.cardToken ?? null,
      });
      c.status = 'paid';
      c.providerPaymentId = p.paymentId;
      const inv = { id: `inv_${++n}`, checkoutId: c.id, amount: p.amount };
      invoices.push(inv);
      return inv.id;
    },
    async paymentFailed(id, paymentId) {
      const c = checkouts.get(id);
      if (!c || c.status === 'paid') return;
      if (c.status === 'failed' && c.providerPaymentId === paymentId) return;
      c.status = 'failed';
      c.providerPaymentId = paymentId;
      const s = subs.get(c.treeId);
      if (c.kind === 'renewal' && s) {
        s.status = 'past_due';
        s.retryCount++;
        s.nextRetryAt = nextRetry(s.retryCount, new Date());
      }
    },
    async expire() {
      let ended = 0;
      const now = Date.now();
      for (const s of subs.values()) {
        const due = s.periodEnd && s.periodEnd.getTime() <= now;
        if ((s.status === 'active' || s.status === 'past_due') && s.cancelAtPeriodEnd && due) {
          s.status = 'canceled';
          ended++;
        } else if (
          (s.status === 'past_due' && !s.nextRetryAt) ||
          (s.status === 'active' && due && (s.provider === 'manual' || !s.cardToken))
        ) {
          s.status = 'expired';
          ended++;
        }
      }
      return ended;
    },
    async renewable(now, aheadMs) {
      return [...subs.values()].filter(
        (s): s is Renewable =>
          !!s.cardToken &&
          s.provider !== 'manual' &&
          !s.cancelAtPeriodEnd &&
          ((s.status === 'active' &&
            !!s.periodEnd &&
            s.periodEnd.getTime() <= now.getTime() + aheadMs) ||
            (s.status === 'past_due' &&
              !!s.nextRetryAt &&
              s.nextRetryAt.getTime() <= now.getTime())),
      );
    },
    async renewalFor(treeId, periodStart) {
      return (
        [...checkouts.values()].find(
          (c) =>
            c.treeId === treeId &&
            c.kind === 'renewal' &&
            c.periodStart.getTime() === periodStart.getTime(),
        ) ?? null
      );
    },
  };
  return store;
}
