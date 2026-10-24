-- Paying for a plan, checked against the real functions and policies. Run with
-- supabase/tests/run.sh. Hala owns a tree and pays; Ibrahim is a stranger.
\set ON_ERROR_STOP 1
\set QUIET 1

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

/** Passes when the statement fails, optionally with a message containing `expect`. */
create function tests.fails(stmt text, what text, expect text default null) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if expect is not null and position(expect in sqlerrm) = 0 then
      raise exception 'FAILED: % (wrong error: %)', what, sqlerrm;
    end if;
    raise notice 'ok - %', what;
    return;
  end;
  raise exception 'FAILED: % (it was allowed)', what;
end $$;

create function tests.as_id(id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', id, false)
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

create table tests.vars (k text primary key, v text);
grant all on tests.vars to anon, authenticated, service_role;

insert into auth.users (id, phone) values
  ('00000000-0000-4000-8000-0000000000e1', '966500000011'),
  ('00000000-0000-4000-8000-0000000000e2', '966500000012');

set role authenticated;
select tests.as_id('00000000-0000-4000-8000-0000000000e1');
update public.profiles set first_name = 'هلا', father_name = 'فهد' where id = auth.uid();
insert into tests.vars values ('btree', public.create_tree()::text);

-- ---------- Plans ----------

set role anon;
select tests.ok((select count(*) from public.plans) = 3, 'anyone sees the plans');
select tests.ok((select price_monthly_halalas from public.plans where id = 'family') is null,
  'plans ship without prices');
select tests.fails($$ update public.plans set price_monthly_halalas = 100 $$,
  'nobody outside the server edits prices');
select tests.ok(public.reviewer_cap('extended') = 5, 'the reviewer cap comes from the plans table');

set role authenticated;
select tests.fails($$ select public.billing_apply_payment(gen_random_uuid(), 'pay_1', 100, 'SAR') $$,
  'a signed in person cannot apply a payment');
select tests.fails($$ select public.billing_grant_manual(
  (select v::uuid from tests.vars where k = 'btree'), 'tribe', null) $$,
  'a signed in person cannot grant a plan');
select tests.fails($$ insert into public.checkouts (tree_id, kind, plan, cycle, amount_halalas,
  period_start, period_end, provider) select v::uuid, 'new', 'tribe', 'monthly', 100, now(),
  now() + interval '1 month', 'sandbox' from tests.vars where k = 'btree' $$,
  'checkouts are opened by the server only');

-- ---------- A first payment ----------

reset role;
update public.plans set price_monthly_halalas = 4900, price_annual_halalas = 49000 where id = 'extended';
set role service_role;
insert into public.checkouts (id, tree_id, user_id, kind, plan, cycle, amount_halalas, period_start,
  period_end, provider)
select '00000000-0000-4000-8000-0000000000c1', v::uuid, '00000000-0000-4000-8000-0000000000e1',
  'new', 'extended', 'monthly', 4900, now(), now() + interval '1 month', 'sandbox'
from tests.vars where k = 'btree';

select tests.fails($$ select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c1',
  'pay_1', 100, 'SAR') $$, 'a payment for less than the checkout is refused', 'amount');
select tests.fails($$ select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c1',
  'pay_1', 4900, 'USD') $$, 'a payment in another currency is refused', 'amount');

insert into tests.vars select 'inv1', public.billing_apply_payment(
  '00000000-0000-4000-8000-0000000000c1', 'pay_1', 4900, 'SAR', 'token_abc', 'visa', '1111', 12, 2030)::text;
select tests.ok((select v from tests.vars where k = 'inv1') = public.billing_apply_payment(
  '00000000-0000-4000-8000-0000000000c1', 'pay_1', 4900, 'SAR')::text,
  'a replayed webhook answers the same invoice');
select tests.fails($$ select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c1',
  'pay_2', 4900, 'SAR') $$, 'a second payment for a paid checkout is surfaced', 'already paid');
select tests.ok((select count(*) from public.invoices where checkout_id = '00000000-0000-4000-8000-0000000000c1') = 1,
  'one invoice per checkout');
select tests.ok((select plan from public.trees t join tests.vars on t.id = v::uuid and k = 'btree') = 'extended',
  'the tree moves to the paid plan');
select tests.ok((select status from public.subscriptions) = 'active', 'the subscription is active');
select tests.ok((select number from public.invoices limit 1) ~ '^SUL-[0-9]{4}-000001$',
  'invoices are numbered from 1');
select tests.ok((select vat_halalas = 0 and net_halalas = 4900 and zatca_status = 'not_required'
  from public.invoices limit 1), 'no VAT before the seller registers');
select tests.ok((select buyer_name from public.invoices limit 1) = 'هلا فهد', 'the buyer is printed');

-- ---------- What the owner sees ----------

set role authenticated;
select tests.as_id('00000000-0000-4000-8000-0000000000e1');
select tests.ok((select count(*) from public.invoices) = 1, 'the payer sees the invoice');
select tests.ok((select count(*) from public.checkouts) = 1, 'the owner sees the checkout');
select tests.ok((select last4 from public.payment_methods) = '1111', 'the owner sees the card ending');
select tests.fails($$ select token from public.payment_methods $$, 'nobody reads a card token');
select tests.fails($$ update public.subscriptions set status = 'active' $$,
  'the owner cannot edit the subscription');

select tests.as_id('00000000-0000-4000-8000-0000000000e2');
select tests.ok((select count(*) from public.invoices) = 0, 'a stranger sees no invoices');
select tests.ok((select count(*) from public.subscriptions) = 0, 'a stranger sees no subscription');
select tests.ok((select count(*) from public.payment_methods) = 0, 'a stranger sees no cards');
select tests.fails(format($$ select public.billing_cancel(%L) $$, v), 'a stranger cannot cancel')
from tests.vars where k = 'btree';

-- ---------- Changes ----------

select tests.as_id('00000000-0000-4000-8000-0000000000e1');
select tests.fails(format($$ select public.billing_schedule_change(%L, 'tribe', 'monthly') $$, v),
  'an upgrade is paid, never scheduled', 'not a downgrade') from tests.vars where k = 'btree';
select tests.fails(format($$ select public.billing_schedule_change(%L, 'family', 'monthly') $$, v),
  'a plan without a price cannot be scheduled', 'not on sale') from tests.vars where k = 'btree';
reset role;
update public.plans set price_monthly_halalas = 1900 where id = 'family';
set role authenticated;
select public.billing_schedule_change(v::uuid, 'family', 'monthly') from tests.vars where k = 'btree';
select tests.ok((select scheduled_plan from public.subscriptions) = 'family', 'a downgrade waits for renewal');
select public.billing_cancel(v::uuid) from tests.vars where k = 'btree';
select tests.ok((select cancel_at_period_end and scheduled_plan is null from public.subscriptions),
  'canceling stops renewal and drops a waiting downgrade');
select public.billing_resume(v::uuid) from tests.vars where k = 'btree';
select tests.ok((select not cancel_at_period_end from public.subscriptions), 'the owner can resume');

-- ---------- Renewals ----------

reset role;
update public.billing_settings set vat_number = '300000000000003';
set role service_role;
insert into public.checkouts (id, tree_id, kind, plan, cycle, amount_halalas, period_start,
  period_end, provider)
select '00000000-0000-4000-8000-0000000000c2', v::uuid, 'renewal', 'extended', 'monthly', 4900,
  now() + interval '1 month', now() + interval '2 months', 'sandbox'
from tests.vars where k = 'btree';
select public.billing_payment_failed('00000000-0000-4000-8000-0000000000c2', 'pay_3', 'insufficient funds');
select public.billing_payment_failed('00000000-0000-4000-8000-0000000000c2', 'pay_3', 'insufficient funds');
select tests.ok((select status = 'past_due' and retry_count = 1 and next_retry_at > now()
  from public.subscriptions), 'a declined renewal starts the grace days, counted once');
select tests.ok((select plan from public.trees t join tests.vars on t.id = v::uuid and k = 'btree') = 'extended',
  'the plan holds during the grace days');

select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c2', 'pay_4', 4900, 'SAR');
select tests.ok((select status = 'active' and retry_count = 0 from public.subscriptions),
  'a retry that goes through restores the plan');
select tests.ok((select vat_halalas = 639 and net_halalas = 4261 and zatca_status = 'pending'
  from public.invoices where checkout_id = '00000000-0000-4000-8000-0000000000c2'),
  'a registered seller charges 15% VAT inside the price');
select tests.ok((select number from public.invoices where checkout_id = '00000000-0000-4000-8000-0000000000c2')
  ~ '000002$', 'the next invoice takes the next number');

-- Three declines in a row and the plan lapses.
insert into public.checkouts (id, tree_id, kind, plan, cycle, amount_halalas, period_start,
  period_end, provider)
select ('00000000-0000-4000-8000-0000000000d' || n)::uuid, v::uuid, 'renewal', 'extended',
  'monthly', 4900, now() + interval '2 months', now() + interval '3 months', 'sandbox'
from tests.vars, generate_series(1, 4) n where k = 'btree';
select public.billing_payment_failed(('00000000-0000-4000-8000-0000000000d' || n)::uuid, 'pay_d' || n, 'declined')
from generate_series(1, 3) n;
select tests.ok((select next_retry_at is not null from public.subscriptions), 'three tries leave one more wait');
select public.billing_payment_failed('00000000-0000-4000-8000-0000000000d4', 'pay_d4', 'declined');
select tests.ok(public.billing_expire() = 1, 'out of retries, the plan lapses');
select tests.ok((select status from public.subscriptions) = 'expired', 'the subscription is expired');

-- ---------- Manual grants ----------

select public.billing_grant_manual(v::uuid, 'tribe', null) from tests.vars where k = 'btree';
select tests.ok((select status = 'active' and provider = 'manual' from public.subscriptions),
  'the admin grants a plan by hand');
select tests.ok(public.billing_expire() = 0, 'an open ended grant does not lapse');

-- ---------- Invoices outlive the tree ----------

reset role;
delete from public.trees where id = (select v::uuid from tests.vars where k = 'btree');
select tests.ok((select count(*) from public.invoices where owner_id = '00000000-0000-4000-8000-0000000000e1') = 2,
  'deleting the tree keeps its invoices');
