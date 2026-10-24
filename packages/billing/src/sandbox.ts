import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ChargeRequest, PaymentProvider, ProviderPayment } from './types';

/**
 * A stand-in for Moyasar until the account exists: same answers, no money. A payment's id
 * carries the payment itself, signed with a server secret, so fetching it back proves the
 * server made it and nobody edited the amount on the way.
 *
 * Test cards, as on Moyasar's test mode: 4111 1111 1111 1111 pays, 4000 0000 0000 0002 is
 * declined. A saved card ending 0002 is declined on renewal too.
 */
export const SANDBOX_DECLINED = '4000000000000002';

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString();

export function sandbox(secret: string): PaymentProvider & {
  pay(p: {
    amount: number;
    metadata: Record<string, string>;
    cardNumber: string;
    saveCard: boolean;
  }): ProviderPayment;
} {
  const sign = (body: string) => createHmac('sha256', secret).update(body).digest('base64url');
  const seal = (p: Omit<ProviderPayment, 'id'>): ProviderPayment => {
    const body = b64(
      JSON.stringify({ ...p, n: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }),
    );
    return { ...p, id: `sbx_${body}.${sign(body)}` };
  };
  const tokenFor = (last4: string) => {
    const body = `${last4}${Math.random().toString(36).slice(2, 10)}`;
    return `sbxtok_${body}_${sign(body).slice(0, 16)}`;
  };
  const tokenLast4 = (token: string) => {
    const m = /^sbxtok_([0-9]{4}[a-z0-9]*)_([A-Za-z0-9_-]{16})$/.exec(token);
    return m && sign(m[1]!).slice(0, 16) === m[2] ? m[1]!.slice(0, 4) : null;
  };

  return {
    name: 'sandbox',
    pay({ amount, metadata, cardNumber, saveCard }) {
      const digits = cardNumber.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      const declined = digits === SANDBOX_DECLINED || digits.length < 12;
      return seal({
        status: declined ? 'failed' : 'paid',
        amount,
        currency: 'SAR',
        metadata,
        ...(declined ? { message: 'رفض البنك العملية (بطاقة تجريبية)' } : {}),
        card: {
          brand: digits.startsWith('5') ? 'mastercard' : digits.startsWith('4') ? 'visa' : 'mada',
          last4,
          ...(saveCard && !declined ? { token: tokenFor(last4) } : {}),
          month: 12,
          year: new Date().getFullYear() + 3,
        },
        live: false,
      });
    },
    async fetchPayment(id) {
      const m = /^sbx_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(id);
      if (!m) return null;
      const want = Buffer.from(sign(m[1]!));
      const got = Buffer.from(m[2]!);
      if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
      const { n: _n, ...p } = JSON.parse(unb64(m[1]!)) as ProviderPayment & { n: string };
      return { ...p, id };
    },
    async chargeToken(req: ChargeRequest) {
      const last4 = tokenLast4(req.token);
      const declined = !last4 || last4 === '0002';
      return seal({
        status: declined ? 'failed' : 'paid',
        amount: req.amount,
        currency: 'SAR',
        metadata: req.metadata,
        ...(declined ? { message: 'رفض البنك التجديد (بطاقة تجريبية)' } : {}),
        card: { token: req.token, brand: 'visa', last4: last4 ?? '' },
        live: false,
      });
    },
  };
}

/** The event Moyasar would post for this payment, for delivering sandbox payments. */
export const sandboxEvent = (p: ProviderPayment, secretToken: string) => ({
  id: `evt_${p.id.slice(4, 20)}`,
  type: p.status === 'paid' ? 'payment_paid' : 'payment_failed',
  created_at: new Date().toISOString(),
  secret_token: secretToken,
  account_name: 'sulalah-sandbox',
  live: false,
  data: {
    id: p.id,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    metadata: p.metadata,
  },
});
