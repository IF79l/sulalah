import type { ChargeRequest, PaymentProvider, ProviderPayment } from './types';

const API = 'https://api.moyasar.com/v1';

interface MoyasarPayment {
  id: string;
  status: ProviderPayment['status'];
  amount: number;
  currency: string;
  metadata?: Record<string, string> | null;
  live?: boolean;
  source?: {
    type?: string;
    company?: string;
    number?: string;
    message?: string | null;
    transaction_url?: string | null;
    token?: string | null;
    month?: number | string;
    year?: number | string;
  };
}

export function fromMoyasar(p: MoyasarPayment, live: boolean): ProviderPayment {
  const s = p.source ?? {};
  const last4 = (s.number ?? '').replace(/\D/g, '').slice(-4);
  return {
    id: p.id,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    metadata: p.metadata ?? {},
    ...(s.message ? { message: s.message } : {}),
    ...(s.type === 'creditcard' || s.type === 'token' || s.token
      ? {
          card: {
            ...(s.token ? { token: s.token } : {}),
            brand: s.company ?? '',
            last4,
            ...(s.month ? { month: Number(s.month) } : {}),
            ...(s.year ? { year: Number(s.year) } : {}),
          },
        }
      : {}),
    ...(s.transaction_url ? { transactionUrl: s.transaction_url } : {}),
    live: p.live ?? live,
  };
}

/**
 * Moyasar, with the secret key (server only). Test keys (sk_test_) reach Moyasar's test mode,
 * live keys real cards; the webhook refuses events from the other mode.
 */
export function moyasar(secretKey: string, fetcher: typeof fetch = fetch): PaymentProvider {
  const live = secretKey.startsWith('sk_live_');
  const auth = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetcher(`${API}${path}`, {
      ...init,
      headers: { authorization: auth, 'content-type': 'application/json', ...init?.headers },
    });
    return res;
  };

  return {
    name: 'moyasar',
    async fetchPayment(id) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
      const res = await call(`/payments/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`moyasar: fetching payment answered ${res.status}`);
      return fromMoyasar((await res.json()) as MoyasarPayment, live);
    },
    async chargeToken(req: ChargeRequest) {
      const res = await call('/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: req.amount,
          currency: 'SAR',
          description: req.description,
          callback_url: req.callbackUrl,
          metadata: req.metadata,
          source: { type: 'token', token: req.token },
        }),
      });
      const body = (await res.json()) as MoyasarPayment & { message?: string };
      // A declined card still comes back as a payment with status "failed".
      if (!res.ok && !body.id)
        throw new Error(`moyasar: charge answered ${res.status}: ${body.message}`);
      return fromMoyasar(body, live);
    },
  };
}
