import { describe, expect, it } from 'vitest';
import {
  handleWebhook,
  memoryStore,
  openCheckout,
  runRenewals,
  sandbox,
  sandboxEvent,
} from './index';

const SECRET = 'whk_test_secret';
const provider = sandbox('server-secret');
const now = new Date();

async function paidTree(cardNumber = '4111111111111111') {
  const store = memoryStore();
  const r = await openCheckout(store, {
    treeId: 't1',
    userId: 'u1',
    plan: 'extended',
    cycle: 'monthly',
    provider: 'sandbox',
    now,
  });
  if (!r.ok) throw new Error(r.reason);
  const payment = provider.pay({
    amount: r.checkout.amount,
    metadata: { checkout_id: r.checkout.id },
    cardNumber,
    saveCard: true,
  });
  const res = await handleWebhook(sandboxEvent(payment, SECRET), {
    secret: SECRET,
    provider,
    store,
    live: false,
  });
  return { store, checkout: r.checkout, payment, res };
}

describe('checkout', () => {
  it('prices on the server and activates only through the webhook', async () => {
    const { store, checkout, res } = await paidTree();
    expect(checkout.amount).toBe(4_900);
    expect(res).toEqual({ status: 200, outcome: 'applied' });
    expect((await store.subscription('t1'))?.status).toBe('active');
    expect(store.invoices).toHaveLength(1);
  });

  it('applies a replayed webhook once', async () => {
    const { store, payment } = await paidTree();
    const again = await handleWebhook(sandboxEvent(payment, SECRET), {
      secret: SECRET,
      provider,
      store,
      live: false,
    });
    expect(again.outcome).toBe('applied');
    expect(store.invoices).toHaveLength(1);
  });

  it('refuses a webhook without the shared secret', async () => {
    const { store, payment } = await paidTree();
    const res = await handleWebhook(sandboxEvent(payment, 'guess'), {
      secret: SECRET,
      provider,
      store,
      live: false,
    });
    expect(res).toEqual({ status: 401, outcome: 'bad_secret' });
  });

  it('trusts the provider, not the webhook body', async () => {
    const store = memoryStore();
    const r = await openCheckout(store, {
      treeId: 't1',
      userId: 'u1',
      plan: 'tribe',
      cycle: 'monthly',
      provider: 'sandbox',
      now,
    });
    if (!r.ok) throw new Error();
    const forged = {
      ...sandboxEvent(
        {
          id: 'sbx_forged.sig',
          status: 'paid',
          amount: r.checkout.amount,
          currency: 'SAR',
          metadata: { checkout_id: r.checkout.id },
          live: false,
        },
        SECRET,
      ),
    };
    const res = await handleWebhook(forged, { secret: SECRET, provider, store, live: false });
    expect(res.outcome).toBe('unknown_payment');
    expect(await store.subscription('t1')).toBeNull();
  });

  it('catches an amount changed in the browser', async () => {
    const store = memoryStore();
    const r = await openCheckout(store, {
      treeId: 't1',
      userId: 'u1',
      plan: 'tribe',
      cycle: 'monthly',
      provider: 'sandbox',
      now,
    });
    if (!r.ok) throw new Error();
    const cheap = provider.pay({
      amount: 100,
      metadata: { checkout_id: r.checkout.id },
      cardNumber: '4111111111111111',
      saveCard: false,
    });
    const res = await handleWebhook(sandboxEvent(cheap, SECRET), {
      secret: SECRET,
      provider,
      store,
      live: false,
    });
    expect(res.outcome).toBe('mismatch');
    expect(await store.subscription('t1')).toBeNull();
  });

  it('ignores test payments on the live site', async () => {
    const { store, payment } = await paidTree();
    const res = await handleWebhook(sandboxEvent(payment, SECRET), {
      secret: SECRET,
      provider,
      store,
      live: true,
    });
    expect(res.outcome).toBe('wrong_mode');
  });

  it('records a declined card and leaves the plan alone', async () => {
    const { store, res } = await paidTree('4000000000000002');
    expect(res.outcome).toBe('declined');
    expect(await store.subscription('t1')).toBeNull();
  });

  it('sends downgrades to the schedule instead of a checkout', async () => {
    const { store } = await paidTree();
    const r = await openCheckout(store, {
      treeId: 't1',
      userId: 'u1',
      plan: 'family',
      cycle: 'monthly',
      provider: 'sandbox',
      now,
    });
    expect(r).toEqual({ ok: false, reason: 'is_downgrade' });
  });

  it('credits the current plan on an upgrade', async () => {
    const { store } = await paidTree();
    const r = await openCheckout(store, {
      treeId: 't1',
      userId: 'u1',
      plan: 'tribe',
      cycle: 'monthly',
      provider: 'sandbox',
      now,
    });
    if (!r.ok) throw new Error();
    expect(r.checkout.kind).toBe('upgrade');
    expect(r.checkout.amount).toBeLessThan(14_900);
    expect(r.checkout.amount + r.checkout.credit).toBe(14_900);
  });
});

describe('renewals', () => {
  const later = (sub: { periodEnd: Date | null }) => new Date(sub.periodEnd!.getTime() - 3_600_000);

  it('charges the saved card once, and moves to a waiting downgrade', async () => {
    const { store } = await paidTree();
    const sub = store.subs.get('t1')!;
    sub.scheduledPlan = 'family';
    sub.scheduledCycle = 'monthly';
    const deps = { store, provider, now: later(sub), callbackUrl: 'https://x/return' };
    expect(await runRenewals(deps)).toMatchObject({ charged: 1 });
    expect(store.subs.get('t1')!.plan).toBe('family');
    expect(store.invoices.at(-1)!.amount).toBe(1_900);
    expect(await runRenewals(deps)).toMatchObject({ charged: 0 });
  });

  it('does not renew a canceled plan', async () => {
    const { store } = await paidTree();
    const sub = store.subs.get('t1')!;
    sub.cancelAtPeriodEnd = true;
    expect(await runRenewals({ store, provider, now: later(sub), callbackUrl: 'x' })).toMatchObject(
      { charged: 0 },
    );
  });

  it('puts a declined renewal in its grace days', async () => {
    const { store } = await paidTree();
    const sub = store.subs.get('t1')!;
    sub.cardToken = 'sbxtok_0002abc_bad';
    const r = await runRenewals({ store, provider, now: later(sub), callbackUrl: 'x' });
    expect(r.declined).toBe(1);
    expect(store.subs.get('t1')!.status).toBe('past_due');
  });
});
