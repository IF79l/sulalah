'use client';

/**
 * Billing for the sample tree, in this browser: the same rules as the server (the shared
 * quote, the webhook's checks, invoice numbers, VAT), with test prices and test cards, so the
 * whole path can be tried before any account exists. No money moves.
 */
import {
  addCycle,
  defaultPlanLimits,
  invoiceNumber,
  nextRetry,
  planIds,
  quote,
  splitVat,
  testPlanPrices,
  type BillingCycle,
  type PlanId,
  type PlanOffer,
  type Seller,
} from '@sulalah/domain';
import { getState, myName, update } from '@/lib/demo-store';
import type {
  BillingView,
  ChangeAction,
  CheckoutView,
  InvoiceView,
  SubscriptionView,
} from './types';

const KEY = 'sulalah-billing-demo-v1';
const DECLINED = '4000000000000002';

interface Checkout extends Omit<CheckoutView, 'savedCard' | 'vatRateBp' | 'mode' | 'callbackUrl'> {
  periodStart: string;
}

interface DemoBilling {
  offers: PlanOffer[];
  seller: Seller;
  subscription: SubscriptionView | null;
  card: BillingView['card'];
  invoices: InvoiceView[];
  checkouts: Checkout[];
  counter: number;
}

export const demoOffers = (): PlanOffer[] =>
  planIds.map((id) => ({ id, limits: defaultPlanLimits[id], prices: testPlanPrices[id] }));

const day = 86_400_000;

function seed(): DemoBilling {
  const start = new Date(Date.now() - 12 * day);
  start.setUTCHours(9, 0, 0, 0);
  const end = addCycle(start, 'monthly');
  const seller: Seller = {
    name: 'أصل لتقنية المعلومات',
    vatNumber: '',
    crNumber: '',
    address: 'المملكة العربية السعودية',
  };
  const year = start.getUTCFullYear();
  return {
    offers: demoOffers(),
    seller,
    subscription: {
      plan: 'extended',
      cycle: 'monthly',
      status: 'active',
      provider: 'sandbox',
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      periodValue: testPlanPrices.extended.monthly,
      cancelAtPeriodEnd: false,
      scheduledPlan: null,
      scheduledCycle: null,
      nextRetryAt: null,
    },
    card: { brand: 'visa', last4: '1111', expMonth: 12, expYear: year + 3 },
    invoices: [
      {
        id: 'demo-inv-1',
        number: invoiceNumber(year, 1),
        issuedAt: start.toISOString(),
        ...pick(splitVat(testPlanPrices.extended.monthly, 0)),
        plan: 'extended',
        cycle: 'monthly',
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        seller,
        buyerName: 'فيصل خالد',
        zatcaStatus: 'not_required',
      },
    ],
    checkouts: [],
    counter: 1,
  };
}

function pick(v: ReturnType<typeof splitVat>) {
  return { total: v.total, net: v.net, vat: v.vat, vatRateBp: v.rateBp };
}

let state: DemoBilling | null = null;

function load(): DemoBilling {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as DemoBilling) : seed();
  } catch {
    state = seed();
  }
  return state;
}

function save(next: DemoBilling) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private windows may refuse storage; the change still holds for this visit.
  }
}

export function resetDemoBilling() {
  save(seed());
  update((s) => ({ ...s, plan: 'extended' }));
}

const rate = (b: DemoBilling) => (b.seller.vatNumber ? 1500 : 0);

const toCurrent = (s: SubscriptionView | null) =>
  s && {
    ...s,
    periodStart: s.periodStart ? new Date(s.periodStart) : null,
    periodEnd: s.periodEnd ? new Date(s.periodEnd) : null,
  };

export function demoView(): BillingView {
  const b = load();
  return {
    mode: 'demo',
    offers: b.offers,
    plan: getState().plan,
    subscription: b.subscription,
    card: b.card,
    invoices: b.invoices,
    vatRegistered: !!b.seller.vatNumber,
  };
}

const viewOf = (b: DemoBilling, c: Checkout, treeId: string): CheckoutView => ({
  ...c,
  mode: 'demo',
  callbackUrl: `/trees/${treeId}/plan/return?checkout=${c.id}`,
  savedCard: b.card,
  vatRateBp: rate(b),
});

export function demoStartCheckout(
  treeId: string,
  plan: PlanId,
  cycle: BillingCycle,
): CheckoutView | { error: string } {
  const b = load();
  const offer = b.offers.find((o) => o.id === plan)!;
  const q = quote(toCurrent(b.subscription), { plan, cycle }, offer, new Date());
  if (!q) return { error: 'هذي الباقة ما عليها سعر بعد' };
  if (q.kind === 'none') return { error: 'شجرتك على هذي الباقة' };
  if (q.kind === 'downgrade') return { error: 'النزول لباقة أصغر يصير عند التجديد' };
  const c: Checkout = {
    id: `demo-chk-${Date.now().toString(36)}`,
    treeId,
    kind: q.kind === 'upgrade' ? 'upgrade' : 'new',
    plan,
    cycle,
    amount: q.charge,
    credit: q.credit,
    periodStart: q.periodStart.toISOString(),
    periodEnd: q.periodEnd.toISOString(),
    status: 'open',
    failureReason: null,
  };
  save({ ...b, checkouts: [c, ...b.checkouts].slice(0, 20) });
  return viewOf(load(), c, treeId);
}

export function demoCheckout(id: string): CheckoutView | null {
  const b = load();
  const c = b.checkouts.find((x) => x.id === id);
  return c ? viewOf(b, c, c.treeId) : null;
}

/** Pays a demo checkout, then plays the webhook: amount checked, plan applied, invoice issued. */
export function demoPay(
  id: string,
  p: { method: 'saved' } | { method: 'sandbox'; cardNumber: string; saveCard: boolean },
): { status: 'waiting' | 'failed'; message?: string } {
  const b = load();
  const c = b.checkouts.find((x) => x.id === id);
  if (!c || c.status === 'paid') return { status: 'waiting' };
  const digits = p.method === 'sandbox' ? p.cardNumber.replace(/\D/g, '') : (b.card?.last4 ?? '');
  const declined =
    p.method === 'sandbox'
      ? digits === DECLINED || digits.length < 12
      : !b.card || digits === '0002';
  if (declined) {
    const message = 'رفض البنك العملية (بطاقة تجريبية)';
    save({
      ...b,
      checkouts: b.checkouts.map((x) =>
        x.id === id ? { ...x, status: 'failed', failureReason: message } : x,
      ),
    });
    return { status: 'failed', message };
  }

  const issued = new Date();
  const counter = b.counter + 1;
  const invoice: InvoiceView = {
    id: `demo-inv-${counter}`,
    number: invoiceNumber(issued.getFullYear(), counter),
    issuedAt: issued.toISOString(),
    ...pick(splitVat(c.amount, rate(b))),
    plan: c.plan,
    cycle: c.cycle,
    periodStart: c.periodStart,
    periodEnd: c.periodEnd,
    seller: b.seller,
    buyerName: myName(getState()).replace(' بن ', ' '),
    zatcaStatus: rate(b) ? 'pending' : 'not_required',
  };
  const card =
    p.method === 'sandbox' && p.saveCard
      ? {
          brand: digits.startsWith('5') ? 'mastercard' : digits.startsWith('4') ? 'visa' : 'mada',
          last4: digits.slice(-4),
          expMonth: 12,
          expYear: issued.getFullYear() + 3,
        }
      : b.card;
  save({
    ...b,
    counter,
    card,
    subscription: {
      plan: c.plan,
      cycle: c.cycle,
      status: 'active',
      provider: 'sandbox',
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      periodValue: c.amount + c.credit,
      cancelAtPeriodEnd: false,
      scheduledPlan: null,
      scheduledCycle: null,
      nextRetryAt: null,
    },
    invoices: [invoice, ...b.invoices],
    checkouts: b.checkouts.map((x) =>
      x.id === id ? { ...x, status: 'paid', failureReason: null } : x,
    ),
  });
  update((s) => ({ ...s, plan: c.plan, upgradeRequested: undefined }));
  return { status: 'waiting' };
}

export function demoChange(a: ChangeAction): BillingView | { error: string } {
  const b = load();
  const s = b.subscription;
  if (!s || (s.status !== 'active' && s.status !== 'past_due'))
    return { error: 'ما فيه اشتراك مدفوع' };
  const next: SubscriptionView =
    a.action === 'cancel'
      ? { ...s, cancelAtPeriodEnd: true, scheduledPlan: null, scheduledCycle: null }
      : a.action === 'resume'
        ? { ...s, cancelAtPeriodEnd: false }
        : a.action === 'unschedule'
          ? { ...s, scheduledPlan: null, scheduledCycle: null }
          : { ...s, scheduledPlan: a.plan, scheduledCycle: a.cycle, cancelAtPeriodEnd: false };
  save({ ...b, subscription: next });
  return demoView();
}

/** Plays a renewal that the bank declines, to see the grace days on the plan page. */
export function demoDeclineRenewal() {
  const b = load();
  if (!b.subscription) return;
  save({
    ...b,
    subscription: {
      ...b.subscription,
      status: 'past_due',
      nextRetryAt: nextRetry(1, new Date())!.toISOString(),
    },
  });
}

// ---------- The admin's desk ----------

export function demoSeller() {
  return load().seller;
}

export function demoSetSeller(seller: Seller) {
  save({ ...load(), seller });
}

export function demoSetPrices(id: PlanId, prices: PlanOffer['prices']) {
  const b = load();
  save({ ...b, offers: b.offers.map((o) => (o.id === id ? { ...o, prices } : o)) });
}

export function demoInvoices() {
  return load().invoices;
}

export const demoInvoice = (id: string) => load().invoices.find((i) => i.id === id) ?? null;

export const demoPayments = () =>
  load().checkouts.map((c) => ({
    id: c.id,
    treeId: c.treeId,
    kind: c.kind,
    plan: c.plan,
    amount: c.amount,
    status: c.status,
    failureReason: c.failureReason,
    provider: 'sandbox',
    createdAt: c.periodStart,
  }));
