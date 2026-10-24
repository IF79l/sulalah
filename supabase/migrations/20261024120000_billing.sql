-- Paid plans for سُلالة.
--
-- Prices and limits live in `plans`, edited by the platform admin, so launch day needs no
-- deploy. A payment never activates anything from the browser: the server opens a checkout
-- with the amount it computed, the payment provider's webhook reports the payment, the server
-- fetches that payment back from the provider, and only then billing_apply_payment turns it
-- into an active subscription and an invoice, in one transaction. Replays answer the same
-- invoice. Invoices outlive the tree they paid for, as tax records must.

-- ---------- Plans ----------

create table public.plans (
  id public.plan_id primary key,
  rank integer not null unique check (rank > 0),
  max_persons integer not null check (max_persons > 0),
  max_reviewers integer not null check (max_reviewers >= 0),
  /** VAT included, in halalas. Null: not on sale yet ("يُعلن عند الإطلاق"). */
  price_monthly_halalas integer check (price_monthly_halalas >= 100),
  price_annual_halalas integer check (price_annual_halalas >= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- The limits the app has always shown; no prices until Faisal announces them.
insert into public.plans (id, rank, max_persons, max_reviewers) values
  ('family', 1, 50, 1),
  ('extended', 2, 500, 5),
  ('tribe', 3, 10000, 20);

/** How many assistant reviewers a plan allows. Every reviewer check goes through this. */
create or replace function public.reviewer_cap(plan public.plan_id) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.max_reviewers from public.plans p where p.id = plan), 0)
$$;

-- ---------- Who sells ----------

/** One row: the seller printed on every invoice, and whether VAT is charged. */
create table public.billing_settings (
  id boolean primary key default true check (id),
  seller_name text not null default 'أصل لتقنية المعلومات',
  /** Empty until the establishment registers for VAT; while empty, invoices carry no VAT. */
  vat_number text not null default '' check (vat_number = '' or vat_number ~ '^3[0-9]{13}3$'),
  cr_number text not null default '',
  address text not null default 'المملكة العربية السعودية',
  vat_rate_bp integer not null default 1500 check (vat_rate_bp between 0 and 10000),
  updated_at timestamptz not null default now()
);
insert into public.billing_settings default values;

-- ---------- Cards ----------

/**
 * A saved card, as the provider's token. The token can only be charged with our secret key,
 * yet it still stays out of reach: owners see the brand and last four digits, nothing more.
 */
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  provider text not null,
  token text not null,
  brand text not null default '',
  last4 text not null default '' check (last4 ~ '^[0-9]{0,4}$'),
  exp_month integer check (exp_month between 1 and 12),
  exp_year integer,
  created_at timestamptz not null default now(),
  unique (provider, token)
);

-- ---------- Checkouts ----------

create type public.checkout_kind as enum ('new', 'upgrade', 'renewal');
create type public.checkout_status as enum ('open', 'paid', 'failed', 'expired');

/**
 * One attempt to pay, opened by the server with the amount it computed. The payment carries
 * the checkout id in its metadata; the webhook checks the amount against this row.
 */
create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  kind public.checkout_kind not null,
  plan public.plan_id not null,
  cycle public.billing_cycle not null,
  /** Charged now. */
  amount_halalas integer not null check (amount_halalas >= 100),
  /** Credit for the unused days of the plan it replaces. */
  credit_halalas integer not null default 0 check (credit_halalas >= 0),
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end > period_start),
  provider text not null,
  /** The latest payment tried on it; a declined card can be tried again on the same checkout. */
  provider_payment_id text unique,
  status public.checkout_status not null default 'open',
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index checkouts_tree_idx on public.checkouts (tree_id, created_at desc);

-- ---------- Subscriptions ----------

alter table public.subscriptions
  add column period_start timestamptz,
  /** What the current period is worth (its price before credit), for crediting an upgrade. */
  add column period_value_halalas integer not null default 0 check (period_value_halalas >= 0),
  add column payment_method_id uuid references public.payment_methods (id) on delete set null,
  add column cancel_at_period_end boolean not null default false,
  add column canceled_at timestamptz,
  /** A downgrade waiting for the period to end. */
  add column scheduled_plan public.plan_id,
  add column scheduled_cycle public.billing_cycle,
  add column retry_count integer not null default 0,
  add column next_retry_at timestamptz,
  add column updated_at timestamptz not null default now();

drop index if exists public.subscriptions_tree_idx;
create unique index subscriptions_one_per_tree on public.subscriptions (tree_id);

-- ---------- Invoices ----------

-- An invoice is a tax record: deleting a tree or its subscription must not take it along.
alter table public.invoices drop constraint invoices_subscription_id_fkey;
alter table public.invoices alter column subscription_id drop not null;
alter table public.invoices
  add constraint invoices_subscription_id_fkey foreign key (subscription_id)
    references public.subscriptions (id) on delete set null,
  add column number text unique,
  add column checkout_id uuid unique references public.checkouts (id) on delete set null,
  add column tree_id uuid references public.trees (id) on delete set null,
  add column owner_id uuid references public.profiles (id) on delete set null,
  add column net_halalas integer not null default 0,
  add column vat_halalas integer not null default 0,
  add column vat_rate_bp integer not null default 0,
  add column plan public.plan_id,
  add column cycle public.billing_cycle,
  add column period_start timestamptz,
  add column period_end timestamptz,
  /** The seller and buyer as they were on the day, never looked up again. */
  add column seller jsonb not null default '{}',
  add column buyer_name text not null default '',
  add column issued_at timestamptz not null default now(),
  /** not_required while there is no VAT number; pending until reported to ZATCA (phase 2). */
  add column zatca_status text not null default 'not_required'
    check (zatca_status in ('not_required', 'pending', 'reported', 'failed')),
  add column zatca_uuid uuid,
  add constraint invoices_amounts_add_up check (net_halalas + vat_halalas = amount_halalas);

create index invoices_tree_idx on public.invoices (tree_id, issued_at desc);

/** Per year, so numbers never skip: the counter row is locked until the invoice commits. */
create table public.invoice_counters (
  year integer primary key,
  last integer not null
);

create function public.next_invoice_number() returns text
language plpgsql security definer set search_path = '' as $$
declare
  y integer := extract(year from now() at time zone 'Asia/Riyadh');
  n integer;
begin
  insert into public.invoice_counters (year, last) values (y, 1)
  on conflict (year) do update set last = public.invoice_counters.last + 1
  returning last into n;
  return 'SUL-' || y || '-' || lpad(n::text, 6, '0');
end $$;

-- ---------- Login codes ----------

/**
 * Each login code sent, by channel, so a resend goes by SMS when WhatsApp did not arrive,
 * and the admin sees what codes cost. The phone is kept only as a keyed hash.
 */
create table public.otp_sends (
  id bigint generated always as identity primary key,
  phone_hash text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'mock')),
  ok boolean not null,
  error text,
  created_at timestamptz not null default now()
);

create index otp_sends_phone_idx on public.otp_sends (phone_hash, created_at desc);

-- ---------- Who may see what ----------

alter table public.plans enable row level security;
alter table public.billing_settings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.checkouts enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.otp_sends enable row level security;

revoke all on public.plans, public.billing_settings, public.payment_methods, public.checkouts,
  public.invoice_counters, public.otp_sends from anon, authenticated;
revoke all on public.subscriptions, public.invoices from anon, authenticated;

-- Prices and the seller are public: the pricing page and every invoice show them.
grant select on public.plans, public.billing_settings to anon, authenticated;
create policy "anyone sees the plans" on public.plans for select using (true);
create policy "anyone sees the seller" on public.billing_settings for select using (true);

-- Never the token.
grant select (id, owner_id, provider, brand, last4, exp_month, exp_year, created_at)
  on public.payment_methods to authenticated;
create policy "owners see their cards" on public.payment_methods for select
  to authenticated using (owner_id = auth.uid());

grant select on public.checkouts, public.subscriptions, public.invoices to authenticated;
create policy "owner sees checkouts" on public.checkouts for select
  to authenticated using (public.my_role(tree_id) = 'owner');

-- An invoice belongs to whoever paid it, even after the tree is gone or handed over.
drop policy "owner sees invoices" on public.invoices;
create policy "payer sees invoices" on public.invoices for select
  to authenticated using (owner_id = auth.uid());

-- ---------- Payments (server only) ----------

/**
 * Turns a verified payment into an active plan and an invoice. Called by the webhook with the
 * service key, after it fetched the payment back from the provider. Safe to call twice.
 */
create function public.billing_apply_payment(
  checkout uuid,
  payment_id text,
  amount integer,
  currency text,
  card_token text default null,
  card_brand text default null,
  card_last4 text default null,
  card_exp_month integer default null,
  card_exp_year integer default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  c public.checkouts;
  sub public.subscriptions;
  st public.billing_settings;
  owner uuid;
  card uuid;
  rate integer;
  vat integer;
  invoice uuid;
begin
  select * into c from public.checkouts where id = checkout for update;
  if not found then raise exception 'unknown checkout' using errcode = 'P0002'; end if;

  if c.status = 'paid' then
    if c.provider_payment_id is distinct from payment_id then
      -- Paid twice: keep the first, and surface the second for a refund.
      raise exception 'checkout already paid by another payment' using errcode = 'P0001';
    end if;
    select i.id into invoice from public.invoices i where i.checkout_id = c.id;
    return invoice;
  end if;
  if amount <> c.amount_halalas or currency <> 'SAR' then
    raise exception 'amount does not match the checkout' using errcode = 'P0001';
  end if;

  select t.owner_id into owner from public.trees t where t.id = c.tree_id;

  if card_token is not null then
    insert into public.payment_methods (owner_id, provider, token, brand, last4, exp_month, exp_year)
    values (owner, c.provider, card_token, coalesce(card_brand, ''), coalesce(card_last4, ''),
      card_exp_month, card_exp_year)
    on conflict (provider, token) do update
      set brand = excluded.brand, last4 = excluded.last4,
          exp_month = excluded.exp_month, exp_year = excluded.exp_year
    returning id into card;
  end if;

  insert into public.subscriptions as s (
    tree_id, plan, cycle, status, period_start, period_end, period_value_halalas, provider,
    payment_method_id, cancel_at_period_end, canceled_at, scheduled_plan, scheduled_cycle,
    retry_count, next_retry_at, updated_at
  ) values (
    c.tree_id, c.plan, c.cycle, 'active', c.period_start, c.period_end,
    c.amount_halalas + c.credit_halalas, c.provider, card, false, null, null, null, 0, null, now()
  )
  on conflict (tree_id) do update set
    plan = excluded.plan,
    cycle = excluded.cycle,
    status = 'active',
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    period_value_halalas = excluded.period_value_halalas,
    provider = excluded.provider,
    payment_method_id = coalesce(excluded.payment_method_id, s.payment_method_id),
    -- A renewal keeps the owner's wish to stop; paying for a change of plan means staying.
    cancel_at_period_end = case when c.kind = 'renewal' then s.cancel_at_period_end else false end,
    canceled_at = case when c.kind = 'renewal' then s.canceled_at else null end,
    scheduled_plan = null,
    scheduled_cycle = null,
    retry_count = 0,
    next_retry_at = null,
    updated_at = now()
  returning * into sub;

  update public.trees set plan = c.plan, requested_plan = null where id = c.tree_id;
  update public.checkouts
  set status = 'paid', provider_payment_id = payment_id, paid_at = now(), failure_reason = null
  where id = c.id;

  select * into st from public.billing_settings where id;
  rate := case when st.vat_number <> '' then st.vat_rate_bp else 0 end;
  vat := case when rate > 0 then round(amount::numeric * rate / (10000 + rate))::integer else 0 end;

  insert into public.invoices (
    number, subscription_id, checkout_id, tree_id, owner_id, amount_halalas, net_halalas,
    vat_halalas, vat_rate_bp, currency, provider_payment_id, status, plan, cycle, period_start,
    period_end, seller, buyer_name, zatca_status
  )
  select
    public.next_invoice_number(), sub.id, c.id, c.tree_id, owner, amount, amount - vat, vat, rate,
    currency, payment_id, 'paid', c.plan, c.cycle, c.period_start, c.period_end,
    jsonb_build_object('name', st.seller_name, 'vatNumber', st.vat_number,
      'crNumber', st.cr_number, 'address', st.address),
    coalesce((select trim(p.first_name || ' ' || p.father_name) from public.profiles p
      where p.id = owner), ''),
    case when rate > 0 then 'pending' else 'not_required' end
  returning id into invoice;
  return invoice;
end $$;

/**
 * Records a declined payment. A declined renewal puts the plan in its grace days and sets
 * when to try the card again: after 1, 3 and 7 days (as RETRY_AFTER_DAYS in
 * packages/domain/src/billing.ts), then it stops and billing_expire lets the plan lapse.
 */
create function public.billing_payment_failed(checkout uuid, payment_id text, reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.checkouts;
begin
  select * into c from public.checkouts where id = checkout for update;
  if not found or c.status = 'paid' then return; end if;
  -- Already counted: the webhook and the charge's own answer both report the same decline.
  if c.status = 'failed' and c.provider_payment_id is not distinct from payment_id then return; end if;
  update public.checkouts
  set status = 'failed', provider_payment_id = payment_id, failure_reason = left(reason, 300)
  where id = c.id;

  if c.kind = 'renewal' then
    update public.subscriptions
    set status = 'past_due', retry_count = retry_count + 1, updated_at = now(),
        next_retry_at = case retry_count + 1
          when 1 then now() + interval '1 day'
          when 2 then now() + interval '3 days'
          when 3 then now() + interval '7 days'
        end
    where tree_id = c.tree_id;
  end if;
end $$;

/** Ends what is due to end. Run daily by the billing job; answers how many changed. */
create function public.billing_expire() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
  m integer;
begin
  -- Asked to stop: the plan runs to the end of what was paid.
  update public.subscriptions set status = 'canceled', updated_at = now()
  where status in ('active', 'past_due') and cancel_at_period_end and period_end <= now();
  get diagnostics n = row_count;
  -- Out of retries, or nothing to renew with (a manual grant with an end date, a lost card).
  update public.subscriptions set status = 'expired', updated_at = now()
  where (status = 'past_due' and next_retry_at is null)
     or (status = 'active' and period_end <= now() - interval '1 hour'
         and (provider = 'manual' or payment_method_id is null));
  get diagnostics m = row_count;
  return n + m;
end $$;

/** The platform admin gives a tree a plan without payment, open ended or until a date. */
create function public.billing_grant_manual(tree uuid, plan public.plan_id, until timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.subscriptions as s (
    tree_id, plan, cycle, status, period_start, period_end, period_value_halalas, provider
  ) values (tree, plan, 'monthly', 'active', now(), until, 0, 'manual')
  on conflict (tree_id) do update set
    plan = excluded.plan, status = 'active', period_start = excluded.period_start,
    period_end = excluded.period_end, period_value_halalas = 0, provider = 'manual',
    payment_method_id = null, cancel_at_period_end = false, canceled_at = null,
    scheduled_plan = null, scheduled_cycle = null, retry_count = 0, next_retry_at = null,
    updated_at = now();
  update public.trees t set plan = billing_grant_manual.plan, requested_plan = null
  where t.id = tree;
end $$;

-- ---------- The owner's own changes ----------

/** Stops renewing; the plan stays until the period ends. */
create function public.billing_cancel(tree uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role(tree) is distinct from 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.subscriptions
  set cancel_at_period_end = true, canceled_at = now(), scheduled_plan = null,
      scheduled_cycle = null, updated_at = now()
  where tree_id = tree and status in ('active', 'past_due') and provider <> 'manual';
  if not found then raise exception 'nothing to cancel' using errcode = 'P0002'; end if;
end $$;

/** Changes their mind before the period ends. */
create function public.billing_resume(tree uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_role(tree) is distinct from 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.subscriptions
  set cancel_at_period_end = false, canceled_at = null, updated_at = now()
  where tree_id = tree and status in ('active', 'past_due') and cancel_at_period_end;
  if not found then raise exception 'nothing to resume' using errcode = 'P0002'; end if;
end $$;

/**
 * Moves to a smaller plan or the monthly cycle at the next renewal; null plan clears it.
 * Upgrades are paid, so they go through a checkout instead.
 */
create function public.billing_schedule_change(
  tree uuid, plan public.plan_id, cycle public.billing_cycle
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  cur_rank integer;
  new_rank integer;
begin
  if public.my_role(tree) is distinct from 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into sub from public.subscriptions s
  where s.tree_id = tree and s.status in ('active', 'past_due') and s.provider <> 'manual'
  for update;
  if not found then raise exception 'no paid plan' using errcode = 'P0002'; end if;

  if plan is null then
    update public.subscriptions set scheduled_plan = null, scheduled_cycle = null,
      updated_at = now() where id = sub.id;
    return;
  end if;
  select p.rank into cur_rank from public.plans p where p.id = sub.plan;
  select p.rank into new_rank from public.plans p where p.id = billing_schedule_change.plan;
  if billing_schedule_change.cycle is null then
    raise exception 'cycle missing' using errcode = '22023';
  end if;
  if not (new_rank < cur_rank
          or (new_rank = cur_rank and sub.cycle = 'annual'
              and billing_schedule_change.cycle = 'monthly')) then
    raise exception 'not a downgrade' using errcode = '22023';
  end if;
  if (select case billing_schedule_change.cycle when 'monthly' then p.price_monthly_halalas else p.price_annual_halalas end
      from public.plans p where p.id = billing_schedule_change.plan) is null then
    raise exception 'plan not on sale' using errcode = 'P0001';
  end if;
  update public.subscriptions
  set scheduled_plan = billing_schedule_change.plan, scheduled_cycle = billing_schedule_change.cycle,
      cancel_at_period_end = false, canceled_at = null, updated_at = now()
  where id = sub.id;
end $$;

revoke execute on function public.billing_apply_payment, public.billing_payment_failed,
  public.billing_expire, public.billing_grant_manual, public.next_invoice_number
  from public, anon, authenticated;
grant execute on function public.billing_apply_payment, public.billing_payment_failed,
  public.billing_expire, public.billing_grant_manual, public.next_invoice_number to service_role;

revoke execute on function public.billing_cancel, public.billing_resume,
  public.billing_schedule_change from public, anon;
grant execute on function public.billing_cancel, public.billing_resume,
  public.billing_schedule_change, public.reviewer_cap to authenticated;
