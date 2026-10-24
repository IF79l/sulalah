import { describe, expect, it } from 'vitest';
import {
  addCycle,
  invoiceNumber,
  nextRetry,
  quote,
  sar,
  splitVat,
  testPlanPrices,
  validVatNumber,
  zatcaQr,
  type CurrentSubscription,
  type PlanOffer,
} from './index';
import { defaultPlanLimits } from './plans';

const offer = (id: 'family' | 'extended' | 'tribe'): PlanOffer => ({
  id,
  limits: defaultPlanLimits[id],
  prices: testPlanPrices[id],
});
const at = (s: string) => new Date(s);

describe('periods', () => {
  it('adds a month and clamps to the end of short months', () => {
    expect(addCycle(at('2026-01-31T10:00:00Z'), 'monthly').toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addCycle(at('2028-01-31T00:00:00Z'), 'monthly').toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
    expect(addCycle(at('2026-10-24T00:00:00Z'), 'annual').toISOString()).toBe(
      '2027-10-24T00:00:00.000Z',
    );
  });
});

describe('VAT', () => {
  it('takes 15% out of an inclusive price', () => {
    expect(splitVat(11_500, 1500)).toEqual({
      net: 10_000,
      vat: 1_500,
      total: 11_500,
      rateBp: 1500,
    });
    const s = splitVat(4_900, 1500);
    expect(s.net + s.vat).toBe(4_900);
    expect(s.vat).toBe(639);
  });

  it('charges none before the seller registers', () => {
    expect(splitVat(4_900, 0)).toEqual({ net: 4_900, vat: 0, total: 4_900, rateBp: 0 });
  });
});

describe('quotes', () => {
  const now = at('2026-10-16T00:00:00Z');
  const monthlyExtended: CurrentSubscription = {
    plan: 'extended',
    cycle: 'monthly',
    status: 'active',
    periodStart: at('2026-10-01T00:00:00Z'),
    periodEnd: at('2026-10-31T00:00:00Z'),
    periodValue: 4_900,
    provider: 'moyasar',
  };

  it('charges the full price for a first subscription', () => {
    const q = quote(null, { plan: 'family', cycle: 'monthly' }, offer('family'), now)!;
    expect(q).toMatchObject({ kind: 'new', charge: 1_900, credit: 0 });
    expect(q.periodEnd.toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });

  it('credits the unused half of the month on an upgrade', () => {
    const q = quote(monthlyExtended, { plan: 'tribe', cycle: 'monthly' }, offer('tribe'), now)!;
    expect(q.kind).toBe('upgrade');
    expect(q.credit).toBe(2_450);
    expect(q.charge).toBe(14_900 - 2_450);
    expect(q.periodStart).toEqual(now);
  });

  it('treats monthly to annual on the same plan as an upgrade', () => {
    const q = quote(
      monthlyExtended,
      { plan: 'extended', cycle: 'annual' },
      offer('extended'),
      now,
    )!;
    expect(q.kind).toBe('upgrade');
    expect(q.charge).toBe(49_000 - 2_450);
  });

  it('waits for the period end on a downgrade and charges nothing now', () => {
    const q = quote(monthlyExtended, { plan: 'family', cycle: 'monthly' }, offer('family'), now)!;
    expect(q).toMatchObject({ kind: 'downgrade', charge: 0 });
    expect(q.periodStart).toEqual(monthlyExtended.periodEnd);
  });

  it('never lets credit bring a charge below the minimum', () => {
    const rich = { ...monthlyExtended, periodValue: 1_000_000 };
    const q = quote(rich, { plan: 'tribe', cycle: 'monthly' }, offer('tribe'), now)!;
    expect(q.charge).toBe(100);
    expect(q.credit + q.charge).toBe(q.price);
  });

  it('starts over after the plan lapsed', () => {
    const lapsed = { ...monthlyExtended, status: 'expired' as const };
    expect(
      quote(lapsed, { plan: 'extended', cycle: 'monthly' }, offer('extended'), now)!.kind,
    ).toBe('new');
  });

  it('gives a manual activation no credit', () => {
    const manual = { ...monthlyExtended, periodStart: null, periodEnd: null, provider: 'manual' };
    expect(quote(manual, { plan: 'tribe', cycle: 'monthly' }, offer('tribe'), now)!.charge).toBe(
      14_900,
    );
  });

  it('has nothing to sell before prices are set', () => {
    const unpriced = { ...offer('tribe'), prices: { monthly: null, annual: null } };
    expect(quote(null, { plan: 'tribe', cycle: 'monthly' }, unpriced, now)).toBeNull();
  });
});

describe('renewal retries', () => {
  it('tries after 1, 3 and 7 days, then stops', () => {
    const t = at('2026-10-01T00:00:00Z');
    expect(nextRetry(1, t)?.toISOString()).toBe('2026-10-02T00:00:00.000Z');
    expect(nextRetry(3, t)?.toISOString()).toBe('2026-10-08T00:00:00.000Z');
    expect(nextRetry(4, t)).toBeNull();
  });
});

describe('invoices', () => {
  it('numbers invoices by year without gaps', () => {
    expect(invoiceNumber(2026, 42)).toBe('SUL-2026-000042');
  });

  it('checks the shape of a Saudi VAT number', () => {
    expect(validVatNumber('300000000000003')).toBe(true);
    expect(validVatNumber('123')).toBe(false);
  });

  it('formats riyals', () => {
    expect(sar(14_900)).toBe('149.00');
    expect(sar(639)).toBe('6.39');
  });

  it('builds the ZATCA TLV QR payload', () => {
    // ZATCA's own example: "Bobs Records", 310122393500003, 2022-04-25T15:30:00Z, 1000.00, 150.00.
    const qr = zatcaQr({
      seller: 'Bobs Records',
      vatNumber: '310122393500003',
      issuedAt: at('2022-04-25T15:30:00Z'),
      totalHalalas: 100_000,
      vatHalalas: 15_000,
    });
    const bytes = Uint8Array.from(atob(qr), (c) => c.charCodeAt(0));
    expect(bytes[0]).toBe(1);
    expect(bytes[1]).toBe(12);
    expect(new TextDecoder().decode(bytes.slice(2, 14))).toBe('Bobs Records');
    expect(qr).toBe(
      'AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBzEwMDAuMDAFBjE1MC4wMA==',
    );
  });
});
