import 'server-only';
import type { BillingView, CheckoutView, InvoiceView, SubscriptionView } from '@/lib/billing/types';
import type { CheckoutRow, InvoiceRow, SubscriptionRow } from '@/lib/supabase/billing-types';
import { billingAsServer, billingAsUser } from './clients';
import { appUrl, payMode, publishableKey } from './env';
import { loadOffers } from './store';

type UserDb = Awaited<ReturnType<typeof billingAsUser>>;

/** How long a checkout's price holds. */
const CHECKOUT_TTL_MS = 60 * 60_000;

/** Who is asking about this tree's billing; only its owner may. */
export async function ownerOf(treeId: string): Promise<{ db: UserDb; userId: string } | null> {
  const db = await billingAsUser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: role } = await db.rpc('my_role', { tree: treeId });
  return role === 'owner' ? { db, userId: user.id } : null;
}

export const subscriptionView = (s: SubscriptionRow): SubscriptionView => ({
  plan: s.plan,
  cycle: s.cycle,
  status: s.status,
  provider: s.provider,
  periodStart: s.period_start,
  periodEnd: s.period_end,
  periodValue: s.period_value_halalas,
  cancelAtPeriodEnd: s.cancel_at_period_end,
  scheduledPlan: s.scheduled_plan,
  scheduledCycle: s.scheduled_cycle,
  nextRetryAt: s.next_retry_at,
});

export const invoiceView = (i: InvoiceRow): InvoiceView => ({
  id: i.id,
  number: i.number ?? '',
  issuedAt: i.issued_at,
  total: i.amount_halalas,
  net: i.net_halalas,
  vat: i.vat_halalas,
  vatRateBp: i.vat_rate_bp,
  plan: i.plan,
  cycle: i.cycle,
  periodStart: i.period_start,
  periodEnd: i.period_end,
  seller: {
    name: i.seller.name ?? '',
    vatNumber: i.seller.vatNumber ?? '',
    crNumber: i.seller.crNumber ?? '',
    address: i.seller.address ?? '',
  },
  buyerName: i.buyer_name,
  zatcaStatus: i.zatca_status,
});

export async function billingView(db: UserDb, treeId: string): Promise<BillingView> {
  const [offers, tree, sub, invoices, settings] = await Promise.all([
    loadOffers(db),
    db.from('trees').select('plan').eq('id', treeId).single(),
    db.from('subscriptions').select('*').eq('tree_id', treeId).maybeSingle(),
    db.from('invoices').select('*').eq('tree_id', treeId).order('issued_at', { ascending: false }),
    db.from('billing_settings').select('vat_number').maybeSingle(),
  ]);
  let card: BillingView['card'] = null;
  if (sub.data?.payment_method_id) {
    const { data } = await db
      .from('payment_methods')
      .select('brand, last4, exp_month, exp_year')
      .eq('id', sub.data.payment_method_id)
      .maybeSingle();
    if (data)
      card = {
        brand: data.brand,
        last4: data.last4,
        expMonth: data.exp_month,
        expYear: data.exp_year,
      };
  }
  return {
    mode: payMode,
    offers,
    plan: tree.data?.plan ?? 'family',
    subscription: sub.data ? subscriptionView(sub.data) : null,
    card,
    invoices: (invoices.data ?? []).map(invoiceView),
    vatRegistered: !!settings.data?.vat_number,
  };
}

export function checkoutView(
  c: CheckoutRow,
  card: BillingView['card'],
  vatRateBp: number,
): CheckoutView {
  return {
    id: c.id,
    treeId: c.tree_id,
    kind: c.kind,
    plan: c.plan,
    cycle: c.cycle,
    amount: c.amount_halalas,
    credit: c.credit_halalas,
    periodEnd: c.period_end,
    status: c.status,
    failureReason: c.failure_reason,
    mode: payMode,
    ...(payMode === 'moyasar' ? { publishableKey } : {}),
    callbackUrl: `${appUrl}/trees/${c.tree_id}/plan/return?checkout=${c.id}`,
    savedCard: card,
    vatRateBp,
  };
}

/** A checkout the caller owns, with what the payment step needs. */
export async function ownCheckout(checkoutId: string) {
  if (!/^[0-9a-f-]{36}$/.test(checkoutId)) return null;
  const db = await billingAsUser();
  const { data: found } = await db.from('checkouts').select('*').eq('id', checkoutId).maybeSingle();
  if (!found) return null;
  let c = found;
  // A price is good for an hour: the credit for unused days and the period it buys were
  // worked out when it opened. After that the owner starts again and gets a fresh price.
  if (
    c.kind !== 'renewal' &&
    (c.status === 'open' || c.status === 'failed') &&
    Date.now() - Date.parse(c.created_at) > CHECKOUT_TTL_MS
  ) {
    await billingAsServer()
      .from('checkouts')
      .update({ status: 'expired' })
      .eq('id', c.id)
      .in('status', ['open', 'failed']);
    c = { ...c, status: 'expired' };
  }
  const [sub, settings] = await Promise.all([
    db.from('subscriptions').select('payment_method_id').eq('tree_id', c.tree_id).maybeSingle(),
    db.from('billing_settings').select('vat_number, vat_rate_bp').maybeSingle(),
  ]);
  let card: BillingView['card'] = null;
  if (sub.data?.payment_method_id) {
    const { data } = await db
      .from('payment_methods')
      .select('brand, last4, exp_month, exp_year')
      .eq('id', sub.data.payment_method_id)
      .maybeSingle();
    if (data)
      card = {
        brand: data.brand,
        last4: data.last4,
        expMonth: data.exp_month,
        expYear: data.exp_year,
      };
  }
  const rate = settings.data?.vat_number ? (settings.data.vat_rate_bp ?? 0) : 0;
  return { db, checkout: c, view: checkoutView(c, card, rate) };
}
