/**
 * What the plan screens show, the same for a real tree (from /api/billing) and for the sample
 * tree (lib/billing/demo.ts). Dates travel as ISO strings.
 */
import type { BillingCycle, PlanId, PlanOffer, Seller, SubscriptionStatus } from '@sulalah/domain';

/** demo: the sample tree in this browser. sandbox: real accounts, test payments. */
export type PayMode = 'demo' | 'sandbox' | 'moyasar';

export interface SubscriptionView {
  plan: PlanId;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  provider: string;
  periodStart: string | null;
  periodEnd: string | null;
  periodValue: number;
  cancelAtPeriodEnd: boolean;
  scheduledPlan: PlanId | null;
  scheduledCycle: BillingCycle | null;
  nextRetryAt: string | null;
}

export interface InvoiceView {
  id: string;
  number: string;
  issuedAt: string;
  total: number;
  net: number;
  vat: number;
  vatRateBp: number;
  plan: PlanId | null;
  cycle: BillingCycle | null;
  periodStart: string | null;
  periodEnd: string | null;
  seller: Seller;
  buyerName: string;
  zatcaStatus: 'not_required' | 'pending' | 'reported' | 'failed';
}

export interface BillingView {
  mode: PayMode;
  offers: PlanOffer[];
  /** The plan in force on the tree. */
  plan: PlanId;
  subscription: SubscriptionView | null;
  card: { brand: string; last4: string; expMonth: number | null; expYear: number | null } | null;
  invoices: InvoiceView[];
  vatRegistered: boolean;
}

export interface CheckoutView {
  id: string;
  treeId: string;
  kind: 'new' | 'upgrade' | 'renewal';
  plan: PlanId;
  cycle: BillingCycle;
  amount: number;
  credit: number;
  periodEnd: string;
  status: 'open' | 'paid' | 'failed' | 'expired';
  failureReason: string | null;
  mode: PayMode;
  /** Moyasar only: the key the payment form needs, and where 3-D Secure returns. */
  publishableKey?: string;
  callbackUrl: string;
  savedCard: BillingView['card'];
  vatRateBp: number;
}

export type ChangeAction =
  | { action: 'cancel' }
  | { action: 'resume' }
  | { action: 'schedule'; plan: PlanId; cycle: BillingCycle }
  | { action: 'unschedule' };

/** The platform admin's billing desk. Ids and numbers only, never what is inside a tree. */
export interface AdminBilling {
  offers: import('@sulalah/domain').PlanOffer[];
  seller: Seller & { vatRateBp: number };
  subscriptions: {
    treeId: string;
    owner: string;
    plan: PlanId;
    cycle: BillingCycle;
    status: SubscriptionStatus;
    provider: string;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    scheduledPlan: PlanId | null;
  }[];
  invoices: (InvoiceView & { treeId: string | null })[];
  payments: {
    id: string;
    treeId: string;
    kind: 'new' | 'upgrade' | 'renewal';
    plan: PlanId;
    amount: number;
    status: 'open' | 'paid' | 'failed' | 'expired';
    failureReason: string | null;
    provider: string;
    createdAt: string;
  }[];
  requests: { treeId: string; owner: string; from: PlanId; to: PlanId }[];
  codes: { channel: 'whatsapp' | 'sms' | 'mock'; sent: number; failed: number }[];
}

export type AdminAction =
  | { action: 'prices'; plan: PlanId; monthly: number | null; annual: number | null }
  | { action: 'seller'; name: string; vatNumber: string; crNumber: string; address: string }
  | { action: 'grant'; treeId: string; plan: PlanId; until: string | null };
