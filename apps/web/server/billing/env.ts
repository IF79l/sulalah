import 'server-only';
import { moyasar, sandbox, type PaymentProvider } from '@sulalah/billing';
import type { PayMode } from '@/lib/billing/types';

/**
 * Which payment provider this deployment uses. "sandbox" until the Moyasar account exists;
 * "moyasar" with test keys on staging and live keys on production.
 */
export const payMode: Exclude<PayMode, 'demo'> =
  process.env.PAYMENT_PROVIDER === 'moyasar' ? 'moyasar' : 'sandbox';

const secretKey = process.env.SUPABASE_SECRET_KEY ?? '';

/** The webhook's shared secret, set on the Moyasar dashboard and here. */
export const webhookSecret =
  payMode === 'moyasar'
    ? (process.env.MOYASAR_WEBHOOK_SECRET ?? '')
    : (process.env.MOYASAR_WEBHOOK_SECRET ?? `sandbox:${secretKey.slice(-16)}`);

/** Test payments are only ever accepted where test payments belong. */
export const liveMode =
  payMode === 'moyasar' && (process.env.MOYASAR_SECRET_KEY ?? '').startsWith('sk_live_');

export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export function paymentProvider(): PaymentProvider & Partial<ReturnType<typeof sandbox>> {
  if (payMode === 'moyasar') {
    const key = process.env.MOYASAR_SECRET_KEY;
    if (!key) throw new Error('MOYASAR_SECRET_KEY is not set');
    return moyasar(key);
  }
  if (process.env.NEXT_PUBLIC_APP_ENV === 'production')
    throw new Error('the payment sandbox is not allowed on production');
  // Signs sandbox payments; anything secret and stable will do.
  return sandbox(process.env.SANDBOX_PAYMENT_SECRET ?? `sbx:${secretKey}`);
}

export const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? '';
