/**
 * Billing rules shared by the server and the screens: what a plan change costs, when it takes
 * effect, how VAT splits out of a price, and what a Saudi simplified tax invoice must carry.
 * Pure functions only; the server stores the result and the payment webhook applies it.
 */
import type { PlanId, PlanLimits } from './plans';

export type BillingCycle = 'monthly' | 'annual';

/** Moyasar's smallest charge. A credit never brings a charge below it. */
export const MIN_CHARGE_HALALAS = 100;

/** Saudi VAT, in basis points (15%). */
export const SAUDI_VAT_BP = 1500;

/** Larger plans rank higher; moving up is an upgrade, down is a downgrade. */
export const planRank: Record<PlanId, number> = { family: 1, extended: 2, tribe: 3 };

/** Prices in halalas, VAT included as Saudi consumer prices must be. Null: not on sale yet. */
export interface PlanPrices {
  monthly: number | null;
  annual: number | null;
}

/** A plan as the plans table holds it; prices and limits are edited by the platform admin. */
export interface PlanOffer {
  id: PlanId;
  limits: PlanLimits;
  prices: PlanPrices;
}

export const priceOf = (offer: PlanOffer, cycle: BillingCycle) => offer.prices[cycle];

/** Whether anything can be bought yet. Before launch every price is null. */
export const onSale = (offers: PlanOffer[]) =>
  offers.some((o) => o.prices.monthly !== null || o.prices.annual !== null);

/** The end of a period that starts at `start`. Month ends clamp: 31 Jan + 1 month = 28/29 Feb. */
export function addCycle(start: Date, cycle: BillingCycle): Date {
  const months = cycle === 'annual' ? 12 : 1;
  const d = new Date(start.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export interface VatSplit {
  net: number;
  vat: number;
  total: number;
  rateBp: number;
}

/**
 * Takes VAT out of a VAT-inclusive total. A seller who is not registered for VAT charges none,
 * so the whole total is the net (rate 0). Halalas round half up, as ZATCA's examples do.
 */
export function splitVat(total: number, rateBp: number): VatSplit {
  if (rateBp <= 0) return { net: total, vat: 0, total, rateBp: 0 };
  const vat = Math.round((total * rateBp) / (10_000 + rateBp));
  return { net: total - vat, vat, total, rateBp };
}

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'expired' | 'canceled';

/** The part of a subscription a quote needs. */
export interface CurrentSubscription {
  plan: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  /** Manual activations have no period and no price; they are treated as having paid nothing. */
  periodStart: Date | null;
  periodEnd: Date | null;
  /** What the current period is worth: its full price, before any credit it was bought with. */
  periodValue: number;
  provider: string;
}

export type QuoteKind =
  /** First subscription, or starting again after it lapsed. Charged now. */
  | 'new'
  /** Bigger plan or the annual cycle. Charged now, with credit for the unused days. */
  | 'upgrade'
  /** Smaller plan or the monthly cycle. Nothing now; the next renewal switches. */
  | 'downgrade'
  /** Already on it. */
  | 'none';

export interface Quote {
  kind: QuoteKind;
  plan: PlanId;
  cycle: BillingCycle;
  /** The plan's price for the cycle. */
  price: number;
  /** Credit for the unused part of the current period. */
  credit: number;
  /** What is charged now. */
  charge: number;
  /** The period the payment buys (or, for a downgrade, the one it starts). */
  periodStart: Date;
  periodEnd: Date;
}

/** Whether a subscription still gives its plan: active, or failing renewal inside the grace. */
export const inForce = (s: CurrentSubscription | null | undefined) =>
  !!s && (s.status === 'active' || s.status === 'past_due');

/**
 * What moving to `plan` on `cycle` costs today. Upgrades start a fresh period now and credit
 * the unused days of the old one; downgrades wait for the period to end, so nobody loses what
 * they paid for. Answers null when the price is not set.
 */
export function quote(
  current: CurrentSubscription | null,
  target: { plan: PlanId; cycle: BillingCycle },
  offer: PlanOffer,
  now: Date,
): Quote | null {
  const price = priceOf(offer, target.cycle);
  if (price === null) return null;
  const base = { plan: target.plan, cycle: target.cycle, price };
  const fresh = (credit: number, kind: QuoteKind): Quote => {
    const charge = Math.max(Math.min(price, MIN_CHARGE_HALALAS), price - credit);
    return {
      ...base,
      kind,
      credit: price - charge,
      charge,
      periodStart: now,
      periodEnd: addCycle(now, target.cycle),
    };
  };

  // A manual activation without a period has nothing to credit or wait for.
  if (!inForce(current) || !current!.periodEnd || !current!.periodStart) return fresh(0, 'new');
  const cur = current!;
  const start = cur.periodStart!;
  const end = cur.periodEnd!;

  const up =
    planRank[target.plan] > planRank[cur.plan] ||
    (target.plan === cur.plan && target.cycle === 'annual' && cur.cycle === 'monthly');
  const same = target.plan === cur.plan && target.cycle === cur.cycle;

  if (same)
    return { ...base, kind: 'none', credit: 0, charge: 0, periodStart: start, periodEnd: end };
  if (up) {
    const total = end.getTime() - start.getTime();
    const left = Math.max(0, end.getTime() - now.getTime());
    const credit = total > 0 ? Math.floor((cur.periodValue * left) / total) : 0;
    return fresh(credit, 'upgrade');
  }
  return {
    ...base,
    kind: 'downgrade',
    credit: 0,
    charge: 0,
    periodStart: end,
    periodEnd: addCycle(end, target.cycle),
  };
}

// ---------- Renewals ----------

/** Days after a failed renewal to try the card again; after the last, the plan lapses. */
export const RETRY_AFTER_DAYS = [1, 3, 7] as const;

/** When to try again after `failures` failed renewals, or null when it is time to stop. */
export function nextRetry(failures: number, from: Date): Date | null {
  const days = RETRY_AFTER_DAYS[failures - 1];
  return days === undefined ? null : new Date(from.getTime() + days * 86_400_000);
}

/** Renewals are charged this long before the period ends, so a working card never lapses. */
export const RENEW_AHEAD_MS = 12 * 3_600_000;

// ---------- Invoices ----------

/** "SUL-2026-000042": the year it was issued, then a number that never repeats or skips. */
export const invoiceNumber = (year: number, seq: number) =>
  `SUL-${year}-${String(seq).padStart(6, '0')}`;

/** Who sells, as printed on every invoice. Set by the platform admin. */
export interface Seller {
  name: string;
  /** 15 digits, starting and ending with 3. Empty until the establishment registers for VAT. */
  vatNumber: string;
  crNumber: string;
  address: string;
}

export const validVatNumber = (v: string) => /^3\d{13}3$/.test(v);

/**
 * The QR payload a Saudi simplified tax invoice carries (ZATCA phase 1): seller name, VAT
 * number, time, total and VAT, each as tag, length, UTF-8 value, all in base64.
 * Phase 2 adds a signed XML that the e-invoicing integration produces later.
 */
export function zatcaQr(f: {
  seller: string;
  vatNumber: string;
  issuedAt: Date;
  totalHalalas: number;
  vatHalalas: number;
}): string {
  const fields = [
    f.seller,
    f.vatNumber,
    f.issuedAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    sar(f.totalHalalas),
    sar(f.vatHalalas),
  ];
  const enc = new TextEncoder();
  const parts: number[] = [];
  fields.forEach((v, i) => {
    const bytes = enc.encode(v);
    if (bytes.length > 255) throw new Error(`QR field ${i + 1} is too long`);
    parts.push(i + 1, bytes.length, ...bytes);
  });
  return toBase64(Uint8Array.from(parts));
}

/** "149.00": halalas as riyals with two decimals. */
export const sar = (halalas: number) =>
  `${Math.trunc(halalas / 100)}.${String(Math.abs(halalas) % 100).padStart(2, '0')}`;

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
