/**
 * The billing tables (supabase/migrations/20261024120000_billing.sql) in the shape
 * `supabase gen types typescript` writes. Kept apart from types.ts so billing code types its
 * own clients; `pnpm db:types` writes both into generated.ts.
 */
import type { PlanCode } from './types';

export type Cycle = 'monthly' | 'annual';
export type SubStatus = 'pending' | 'active' | 'past_due' | 'expired' | 'canceled';

type Table<Row, Insert = never, Update = never> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type PlanRow = {
  id: PlanCode;
  rank: number;
  max_persons: number;
  max_reviewers: number;
  price_monthly_halalas: number | null;
  price_annual_halalas: number | null;
  updated_at: string;
  updated_by: string | null;
};

export type BillingSettingsRow = {
  id: boolean;
  seller_name: string;
  vat_number: string;
  cr_number: string;
  address: string;
  vat_rate_bp: number;
  updated_at: string;
};

export type PaymentMethodRow = {
  id: string;
  owner_id: string | null;
  provider: string;
  token: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
  created_at: string;
};

export type CheckoutRow = {
  id: string;
  tree_id: string;
  user_id: string | null;
  kind: 'new' | 'upgrade' | 'renewal';
  plan: PlanCode;
  cycle: Cycle;
  amount_halalas: number;
  credit_halalas: number;
  period_start: string;
  period_end: string;
  provider: string;
  provider_payment_id: string | null;
  status: 'open' | 'paid' | 'failed' | 'expired';
  failure_reason: string | null;
  created_at: string;
  paid_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  tree_id: string;
  plan: PlanCode;
  status: SubStatus;
  cycle: Cycle;
  period_start: string | null;
  period_end: string | null;
  period_value_halalas: number;
  provider: string;
  payment_method_id: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  scheduled_plan: PlanCode | null;
  scheduled_cycle: Cycle | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  number: string | null;
  subscription_id: string | null;
  checkout_id: string | null;
  tree_id: string | null;
  owner_id: string | null;
  amount_halalas: number;
  net_halalas: number;
  vat_halalas: number;
  vat_rate_bp: number;
  currency: string;
  provider_payment_id: string;
  status: string;
  plan: PlanCode | null;
  cycle: Cycle | null;
  period_start: string | null;
  period_end: string | null;
  seller: { name?: string; vatNumber?: string; crNumber?: string; address?: string };
  buyer_name: string;
  issued_at: string;
  zatca_status: 'not_required' | 'pending' | 'reported' | 'failed';
  zatca_uuid: string | null;
  created_at: string;
};

export type OtpSendRow = {
  id: number;
  phone_hash: string;
  channel: 'whatsapp' | 'sms' | 'mock';
  ok: boolean;
  error: string | null;
  created_at: string;
};

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type BillingDatabase = {
  public: {
    Tables: {
      plans: Table<PlanRow, never, Partial<PlanRow>>;
      billing_settings: Table<BillingSettingsRow, never, Partial<BillingSettingsRow>>;
      payment_methods: Table<PaymentMethodRow>;
      checkouts: Table<
        CheckoutRow,
        Omit<
          CheckoutRow,
          'id' | 'created_at' | 'paid_at' | 'status' | 'provider_payment_id' | 'failure_reason'
        >,
        Partial<Pick<CheckoutRow, 'provider_payment_id' | 'status'>>
      >;
      subscriptions: Table<SubscriptionRow>;
      invoices: Table<InvoiceRow>;
      otp_sends: Table<
        OtpSendRow,
        Pick<OtpSendRow, 'phone_hash' | 'channel' | 'ok'> & { error?: string | null }
      >;
      trees: {
        Row: {
          id: string;
          owner_id: string;
          plan: PlanCode;
          requested_plan: PlanCode | null;
          file_size: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: Rel[];
      };
      tree_members: {
        Row: { tree_id: string; user_id: string; role: 'owner' | 'reviewer' | 'contributor' };
        Insert: never;
        Update: never;
        Relationships: Rel[];
      };
      profiles: {
        Row: {
          id: string;
          first_name: string;
          father_name: string;
          is_platform_admin: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: Rel[];
      };
    };
    Views: Record<never, never>;
    Functions: {
      billing_apply_payment: {
        Args: {
          checkout: string;
          payment_id: string;
          amount: number;
          currency: string;
          card_token?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          card_exp_month?: number | null;
          card_exp_year?: number | null;
        };
        Returns: string;
      };
      billing_payment_failed: {
        Args: { checkout: string; payment_id: string; reason: string };
        Returns: undefined;
      };
      billing_expire: { Args: Record<never, never>; Returns: number };
      billing_grant_manual: {
        Args: { tree: string; plan: PlanCode; until: string | null };
        Returns: undefined;
      };
      billing_cancel: { Args: { tree: string }; Returns: undefined };
      billing_resume: { Args: { tree: string }; Returns: undefined };
      billing_schedule_change: {
        Args: { tree: string; plan: PlanCode | null; cycle: Cycle | null };
        Returns: undefined;
      };
      my_role: { Args: { tree: string }; Returns: 'owner' | 'reviewer' | 'contributor' | null };
    };
    Enums: { plan_id: PlanCode; billing_cycle: Cycle; subscription_status: SubStatus };
    CompositeTypes: Record<never, never>;
  };
};
