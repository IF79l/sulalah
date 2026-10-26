-- More cases for leaving, deleting an account, grants and extensions: the edges. Run with
-- supabase/tests/run.sh. Amal owns a tree Badr reviews and Chadi contributes to; Dana pays for
-- her own tree; Eid is the platform admin.
\set ON_ERROR_STOP 1
\set QUIET 1

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

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

create function tests.id(name text) returns uuid language sql immutable as $$
  select (case name
    when 'amal' then '00000000-0000-4000-8000-00000000000a'
    when 'badr' then '00000000-0000-4000-8000-00000000000b'
    when 'chadi' then '00000000-0000-4000-8000-00000000000c'
    when 'dana' then '00000000-0000-4000-8000-00000000000d'
    when 'eid' then '00000000-0000-4000-8000-00000000000e'
  end)::uuid
$$;

create function tests.as_user(name text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(tests.id(name)::text, ''), false)
$$;

create table tests.vars (k text primary key, v text);
create function tests.v(key text) returns text language sql stable as $$
  select v from tests.vars where k = key
$$;

/** Notices as the server sees them, for the checks below. */
create function tests.notices(who text, what text) returns integer language sql security definer as $$
  select count(*)::integer from public.notifications
  where user_id = tests.id(who) and kind::text = what
$$;
create function tests.queued(who text, what text) returns integer language sql security definer as $$
  select count(*)::integer from public.wa_outbox
  where user_id = tests.id(who) and template = what and status = 'queued'
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;
grant all on tests.vars to anon, authenticated, service_role;

insert into auth.users (id, phone)
select tests.id(n), '96650000000' || i
from unnest(array['amal', 'badr', 'chadi', 'dana', 'eid']) with ordinality as x(n, i);

set role authenticated;
select tests.as_user('amal');
insert into tests.vars values ('tree', public.create_tree()::text);
select tests.as_user('dana');
insert into tests.vars values ('dana_tree', public.create_tree()::text);
reset role;
insert into public.tree_members (tree_id, user_id, role)
values (tests.v('tree')::uuid, tests.id('badr'), 'reviewer'),
       (tests.v('tree')::uuid, tests.id('chadi'), 'contributor');

-- ---------- Who may remove whom ----------

set role authenticated;
select tests.as_user('badr');
delete from public.tree_members where tree_id = tests.v('tree')::uuid and user_id = tests.id('chadi');
reset role;
select tests.ok(exists (select 1 from public.tree_members where user_id = tests.id('chadi')),
  'a reviewer cannot remove a member');
select tests.ok(tests.notices('chadi', 'removed') = 0, 'so nobody is told of it');

set role authenticated;
select tests.as_user('chadi');
delete from public.tree_members where tree_id = tests.v('tree')::uuid and user_id = tests.id('amal');
reset role;
select tests.ok(exists (select 1 from public.tree_members where user_id = tests.id('amal') and role = 'owner'),
  'nobody removes the owner');

-- Chadi has turned the members topic off; Badr has WhatsApp off altogether.
update public.profiles set notify_muted = array['members'] where id = tests.id('chadi');
update public.profiles set notify = 'app' where id = tests.id('badr');

set role authenticated;
select tests.as_user('amal');
delete from public.tree_members where tree_id = tests.v('tree')::uuid and user_id = tests.id('chadi');
delete from public.tree_members where tree_id = tests.v('tree')::uuid and user_id = tests.id('badr');
select tests.as_user('chadi');
select tests.ok((select count(*) = 1 from public.notifications where kind::text = 'removed'),
  'a removed member still reads their notice');
select tests.ok(not exists (select 1 from public.trees where id = tests.v('tree')::uuid),
  'but no longer sees the tree');
reset role;
select tests.ok(tests.notices('chadi', 'removed') = 1 and tests.queued('chadi', 'member_removed') = 0,
  'the members topic turned off keeps it off WhatsApp');
select tests.ok(tests.notices('badr', 'removed') = 1 and tests.queued('badr', 'member_removed') = 0,
  'and so does WhatsApp turned off');

-- ---------- Grants on every kind of plan ----------

reset role;
insert into public.subscriptions (tree_id, plan, cycle, status, period_start, period_end, provider,
  cancel_at_period_end, canceled_at)
values (tests.v('dana_tree')::uuid, 'family', 'annual', 'past_due', now() - interval '1 year',
  now() - interval '1 day', 'moyasar', false, null);
set role service_role;
select tests.fails($$ select public.billing_grant_manual(tests.v('dana_tree')::uuid, 'tribe', null) $$,
  'a paid plan whose renewal is failing is not replaced either', 'extend it instead');
reset role;
update public.subscriptions set status = 'canceled' where tree_id = tests.v('dana_tree')::uuid;
set role service_role;
select public.billing_grant_manual(tests.v('dana_tree')::uuid, 'extended', now() + interval '30 days');
select public.billing_grant_manual(tests.v('dana_tree')::uuid, 'tribe', now() + interval '60 days');
reset role;
select tests.ok(
  (select provider = 'manual' and plan = 'tribe' and status = 'active' from public.subscriptions
   where tree_id = tests.v('dana_tree')::uuid),
  'an ended paid plan, and a plan given by hand, can be given again');
select tests.ok((select plan = 'tribe' from public.trees where id = tests.v('dana_tree')::uuid),
  'and the tree follows the plan');
select tests.ok((select count(*) = 2 from public.subscription_changes where kind = 'grant'),
  'each grant is logged');

-- ---------- Extensions ----------

update public.subscriptions set provider = 'moyasar', plan = 'family', cycle = 'annual',
  status = 'active', period_end = '2031-03-01 00:00+03', cancel_at_period_end = true,
  canceled_at = now()
where tree_id = tests.v('dana_tree')::uuid;
set role service_role;
select tests.fails($$ select public.billing_extend(tests.v('dana_tree')::uuid, 367, 'تعويض كبير') $$,
  'no more than a year at once', 'days out of range');
select tests.fails($$ select public.billing_extend(gen_random_uuid(), 7, 'تعويض') $$,
  'a tree without a plan has nothing to extend', 'no running plan');
select public.billing_extend(tests.v('dana_tree')::uuid, 10, 'تعويض أول', tests.id('eid'));
select public.billing_extend(tests.v('dana_tree')::uuid, 5, 'تعويض ثاني', tests.id('eid'));
reset role;
select tests.ok(
  (select period_end = '2031-03-16 00:00+03' and cancel_at_period_end and plan = 'family'
     and cycle = 'annual' and provider = 'moyasar'
   from public.subscriptions where tree_id = tests.v('dana_tree')::uuid),
  'extensions add up, and the owner''s wish to stop renewing stays');
select tests.ok(tests.queued('dana', 'plan_extended') = 2, 'the owner hears of each one');
select tests.ok(
  (select array_agg(days order by created_at, days desc) = array[10, 5] from public.subscription_changes
   where kind = 'extend'),
  'and each is logged on its own');
select tests.ok(
  (select data ->> 'days' = '5' and (data ->> 'period_end')::timestamptz = '2031-03-16 00:00+03'
   from public.wa_outbox where template = 'plan_extended' order by created_at desc, count limit 1),
  'the message carries the days and the new end date');
select tests.ok(not public.tree_paused(tests.v('dana_tree')::uuid), 'an extended plan keeps the tree open');

-- ---------- Deleting a paying account ----------

reset role;
update public.plans set price_monthly_halalas = 4900 where id = 'extended';
update public.profiles set first_name = 'دانة', father_name = 'سعد' where id = tests.id('dana');
set role service_role;
insert into public.checkouts (id, tree_id, user_id, kind, plan, cycle, amount_halalas, period_start,
  period_end, provider)
values ('00000000-0000-4000-8000-0000000000c1', tests.v('dana_tree')::uuid, tests.id('dana'), 'upgrade',
  'extended', 'monthly', 4900, now(), now() + interval '1 month', 'sandbox');
select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c1', 'pay_1', 4900, 'SAR',
  'tok_dana', 'visa', '4242', 12, 2030);
reset role;
-- A link Dana made, never used: nobody else is in the tree yet.
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
values (tests.v('dana_tree')::uuid, 'contribute', repeat('a', 64), now() + interval '7 days', tests.id('dana'));
set role authenticated;
select tests.as_user('dana');
select tests.ok((select others = 0 and paid from public.my_owned_trees()),
  'an unused invite link does not count as someone in the tree');

set role service_role;
select tests.fails($$ select public.delete_account(gen_random_uuid()) $$,
  'an unknown account is refused', 'no account');
select public.delete_account(tests.id('dana'));
reset role;
select tests.ok(not exists (select 1 from public.trees where id = tests.v('dana_tree')::uuid),
  'her tree goes with her');
select tests.ok(not exists (select 1 from public.invites where created_by = tests.id('dana')),
  'and its links');
select tests.ok(not exists (select 1 from public.subscriptions where tree_id = tests.v('dana_tree')::uuid),
  'and its plan');
select tests.ok(not exists (select 1 from public.payment_methods where token = 'tok_dana'),
  'her saved card is gone');
select tests.ok(not exists (select 1 from public.wa_outbox where user_id = tests.id('dana')),
  'messages waiting for her are gone');
select tests.ok(
  (select owner_id is null and tree_id is null and buyer_name = 'دانة سعد' and amount_halalas = 4900
   from public.invoices where provider_payment_id = 'pay_1'),
  'her invoice stays as it was issued, tied to nobody');
select tests.ok(
  (select count(*) = 4 and bool_and(tree_id is null) from public.subscription_changes),
  'the admin''s log stays, without the tree');
select tests.ok(exists (select 1 from public.profiles where id = tests.id('amal')),
  'other accounts are untouched');
