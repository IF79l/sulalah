import type { BillingCycle, CurrentSubscription, PlanId, PlanOffer } from '@sulalah/domain';

/** A payment as the provider reports it when we ask, never as a browser or a webhook claims. */
export interface ProviderPayment {
  id: string;
  status:
    | 'initiated'
    | 'paid'
    | 'failed'
    | 'authorized'
    | 'captured'
    | 'refunded'
    | 'voided'
    | 'verified';
  /** Halalas. */
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  /** Why it failed, in the provider's words. */
  message?: string;
  card?: { token?: string; brand: string; last4: string; month?: number; year?: number };
  /** Where to send the cardholder for 3-D Secure, while the payment waits on it. */
  transactionUrl?: string;
  live: boolean;
}

export interface ChargeRequest {
  amount: number;
  token: string;
  description: string;
  metadata: Record<string, string>;
  callbackUrl: string;
}

export interface PaymentProvider {
  name: 'moyasar' | 'sandbox';
  /** Asks the provider what really happened. Null when it does not know the id. */
  fetchPayment(id: string): Promise<ProviderPayment | null>;
  /** Charges a saved card from the server, for renewals and one-tap upgrades. */
  chargeToken(req: ChargeRequest): Promise<ProviderPayment>;
}

export type CheckoutKind = 'new' | 'upgrade' | 'renewal';
export type CheckoutStatus = 'open' | 'paid' | 'failed' | 'expired';

export interface Checkout {
  id: string;
  treeId: string;
  userId: string | null;
  kind: CheckoutKind;
  plan: PlanId;
  cycle: BillingCycle;
  amount: number;
  credit: number;
  periodStart: Date;
  periodEnd: Date;
  provider: string;
  providerPaymentId: string | null;
  status: CheckoutStatus;
}

export interface Subscription extends CurrentSubscription {
  id: string;
  treeId: string;
  cancelAtPeriodEnd: boolean;
  scheduledPlan: PlanId | null;
  scheduledCycle: BillingCycle | null;
  retryCount: number;
  nextRetryAt: Date | null;
}

/** A subscription the renewal job may charge, with its card token (server only). */
export interface Renewable extends Subscription {
  cardToken: string;
}

export interface CardDetails {
  token: string;
  brand: string;
  last4: string;
  month?: number;
  year?: number;
}

/**
 * Where billing state lives. The web app implements it on Supabase with the service key; the
 * tests implement it in memory. Every write that matters is one database function.
 */
export interface BillingStore {
  offers(): Promise<PlanOffer[]>;
  subscription(treeId: string): Promise<Subscription | null>;
  checkout(id: string): Promise<Checkout | null>;
  openCheckout(c: Omit<Checkout, 'id' | 'status' | 'providerPaymentId'>): Promise<Checkout>;
  /** Remembers which payment the browser started on a checkout, for the admin's view. */
  attachPayment(checkoutId: string, paymentId: string): Promise<void>;
  /** billing_apply_payment: answers the invoice id; the same id when replayed. */
  applyPayment(p: {
    checkoutId: string;
    paymentId: string;
    amount: number;
    currency: string;
    card?: CardDetails;
  }): Promise<string>;
  /** billing_payment_failed. */
  paymentFailed(checkoutId: string, paymentId: string, reason: string): Promise<void>;
  /** billing_expire: answers how many subscriptions ended. */
  expire(): Promise<number>;
  /** Active ones ending within `aheadMs`, and lapsed renewals whose retry time came. */
  renewable(now: Date, aheadMs: number): Promise<Renewable[]>;
  /** The renewal checkout already opened for a period, if any. */
  renewalFor(treeId: string, periodStart: Date): Promise<Checkout | null>;
}
