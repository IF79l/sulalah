import 'server-only';
import type { BillingStore, Checkout, Renewable, Subscription } from '@sulalah/billing';
import { planIds, type PlanOffer } from '@sulalah/domain';
import type { CheckoutRow, PlanRow, SubscriptionRow } from '@/lib/supabase/billing-types';
import type { ServerDb } from './clients';

const date = (s: string | null) => (s ? new Date(s) : null);

export const toOffer = (p: PlanRow): PlanOffer => ({
  id: p.id,
  limits: { maxPersons: p.max_persons, maxReviewers: p.max_reviewers },
  prices: { monthly: p.price_monthly_halalas, annual: p.price_annual_halalas },
});

export const toSubscription = (s: SubscriptionRow): Subscription => ({
  id: s.id,
  treeId: s.tree_id,
  plan: s.plan,
  cycle: s.cycle,
  status: s.status,
  periodStart: date(s.period_start),
  periodEnd: date(s.period_end),
  periodValue: s.period_value_halalas,
  provider: s.provider,
  cancelAtPeriodEnd: s.cancel_at_period_end,
  scheduledPlan: s.scheduled_plan,
  scheduledCycle: s.scheduled_cycle,
  retryCount: s.retry_count,
  nextRetryAt: date(s.next_retry_at),
});

const toCheckout = (c: CheckoutRow): Checkout => ({
  id: c.id,
  treeId: c.tree_id,
  userId: c.user_id,
  kind: c.kind,
  plan: c.plan,
  cycle: c.cycle,
  amount: c.amount_halalas,
  credit: c.credit_halalas,
  periodStart: new Date(c.period_start),
  periodEnd: new Date(c.period_end),
  provider: c.provider,
  providerPaymentId: c.provider_payment_id,
  status: c.status,
});

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** Same, for answers that must have a value (a list, a row just written). */
function got<T>(r: { data: T | null; error: { message: string } | null }): T {
  const data = must(r);
  if (data === null) throw new Error('no data');
  return data;
}

export async function loadOffers(db: Pick<ServerDb, 'from'>): Promise<PlanOffer[]> {
  const rows = got(await db.from('plans').select('*').order('rank'));
  return planIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is PlanRow => !!r)
    .map(toOffer);
}

/** BillingStore on Supabase, with the secret key. */
export function supabaseStore(db: ServerDb): BillingStore {
  return {
    offers: () => loadOffers(db),
    async subscription(treeId) {
      const row = must(
        await db.from('subscriptions').select('*').eq('tree_id', treeId).maybeSingle(),
      );
      return row ? toSubscription(row) : null;
    },
    async checkout(id) {
      if (!uuid.test(id)) return null;
      const row = must(await db.from('checkouts').select('*').eq('id', id).maybeSingle());
      return row ? toCheckout(row) : null;
    },
    async openCheckout(c) {
      const row = got(
        await db
          .from('checkouts')
          .insert({
            tree_id: c.treeId,
            user_id: c.userId,
            kind: c.kind,
            plan: c.plan,
            cycle: c.cycle,
            amount_halalas: c.amount,
            credit_halalas: c.credit,
            period_start: c.periodStart.toISOString(),
            period_end: c.periodEnd.toISOString(),
            provider: c.provider,
          })
          .select('*')
          .single<CheckoutRow>(),
      );
      return toCheckout(row);
    },
    async attachPayment(id, paymentId) {
      must(
        await db
          .from('checkouts')
          .update({ provider_payment_id: paymentId })
          .eq('id', id)
          .neq('status', 'paid'),
      );
    },
    async applyPayment(p) {
      return got(
        await db.rpc('billing_apply_payment', {
          checkout: p.checkoutId,
          payment_id: p.paymentId,
          amount: p.amount,
          currency: p.currency,
          card_token: p.card?.token ?? null,
          card_brand: p.card?.brand ?? null,
          card_last4: p.card?.last4 ?? null,
          card_exp_month: p.card?.month ?? null,
          card_exp_year: p.card?.year ?? null,
        }),
      );
    },
    async paymentFailed(checkoutId, paymentId, reason) {
      must(
        await db.rpc('billing_payment_failed', {
          checkout: checkoutId,
          payment_id: paymentId,
          reason,
        }),
      );
    },
    async expire() {
      return got(await db.rpc('billing_expire', {}));
    },
    async renewable(now, aheadMs) {
      const until = new Date(now.getTime() + aheadMs).toISOString();
      const rows = got(
        await db
          .from('subscriptions')
          .select('*')
          .neq('provider', 'manual')
          .eq('cancel_at_period_end', false)
          .not('payment_method_id', 'is', null)
          .or(
            `and(status.eq.active,period_end.lte.${until}),and(status.eq.past_due,next_retry_at.lte.${now.toISOString()})`,
          ),
      );
      if (!rows.length) return [];
      const ids = rows.map((r) => r.payment_method_id!);
      const cards = got(await db.from('payment_methods').select('id, token').in('id', ids));
      return rows.flatMap((r): Renewable[] => {
        const token = cards.find((c) => c.id === r.payment_method_id)?.token;
        return token ? [{ ...toSubscription(r), cardToken: token }] : [];
      });
    },
    async renewalFor(treeId, periodStart) {
      const row = must(
        await db
          .from('checkouts')
          .select('*')
          .eq('tree_id', treeId)
          .eq('kind', 'renewal')
          .eq('period_start', periodStart.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      return row ? toCheckout(row) : null;
    },
  };
}
