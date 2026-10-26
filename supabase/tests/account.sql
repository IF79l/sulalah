-- Leaving a tree, deleting an account, and the admin's grants and extensions. Run with
-- supabase/tests/run.sh. Amal owns a tree that Badr contributes to and Chadi reviews; Dana owns
-- a tree of her own; Eid is the platform admin.
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
update public.profiles set first_name = 'أمل' where id = tests.id('amal');
update public.profiles set first_name = 'بدر' where id = tests.id('badr');

-- Amal's tree, with Badr and Chadi in it.
set role authenticated;
select tests.as_user('amal');
insert into tests.vars values ('tree', public.create_tree()::text);
insert into tests.vars values ('spare', public.create_tree()::text);
reset role;
insert into public.tree_members (tree_id, user_id, role)
values (tests.v('tree')::uuid, tests.id('badr'), 'contributor'),
       (tests.v('tree')::uuid, tests.id('chadi'), 'reviewer'),
       (tests.v('spare')::uuid, tests.id('badr'), 'contributor');

-- ---------- Leaving and removing ----------

set role authenticated;
select tests.as_user('badr');
delete from public.tree_members where tree_id = tests.v('tree')::uuid and user_id = auth.uid();
select tests.ok(tests.notices('amal', 'left') = 1, 'the owner hears that a member left');
select tests.ok(tests.queued('amal', 'member_left') = 1, 'and it goes out on WhatsApp');
select tests.ok(tests.notices('badr', 'left') = 0, 'the one who left is not told of it');
select tests.as_user('amal');
select tests.ok((select first_name from public.profiles where id = tests.id('badr')) = 'بدر',
  'the owner still reads the name of who left');
select tests.as_user('dana');
select tests.ok(not exists (select 1 from public.profiles where id = tests.id('badr')),
  'a stranger does not');

select tests.as_user('amal');
delete from public.tree_members where tree_id = tests.v('tree')::uuid and user_id = tests.id('chadi');
select tests.ok(tests.notices('chadi', 'removed') = 1, 'a removed member is told');
select tests.ok(tests.queued('chadi', 'member_removed') = 1, 'on WhatsApp too');
reset role;
select tests.ok(
  (select actor_id from public.notifications where kind::text = 'removed') = tests.id('amal'),
  'with who removed them');
set role authenticated;

select tests.as_user('chadi');
select tests.ok((select first_name from public.profiles where id = tests.id('amal')) = 'أمل',
  'a removed member still reads who removed them');

select tests.as_user('amal');
delete from public.trees where id = tests.v('spare')::uuid;
select tests.ok(tests.notices('badr', 'removed') = 0, 'deleting a tree is not removing its members');

-- ---------- Deleting an account ----------

reset role;
insert into public.tree_members (tree_id, user_id, role)
values (tests.v('tree')::uuid, tests.id('badr'), 'contributor');
set role authenticated;
select tests.as_user('dana');
insert into tests.vars values ('dana_tree', public.create_tree()::text);

select tests.as_user('amal');
select tests.ok(
  (select others = 1 and not paid from public.my_owned_trees() where tree_id = tests.v('tree')::uuid),
  'the owner sees who else is in each tree they own');
select tests.ok((select count(*) from public.my_owned_trees()) = 1, 'only the trees they own');
select tests.fails($$ select public.delete_account(auth.uid()) $$,
  'nobody deletes an account from the browser');

set role service_role;
select tests.fails($$ select public.delete_account(tests.id('amal')) $$,
  'an owner of a tree others are in cannot delete their account', 'owns shared trees');

-- Badr owns a tree alone and contributes to Amal's.
reset role;
set role authenticated;
select tests.as_user('badr');
insert into tests.vars values ('badr_tree', public.create_tree()::text);
set role service_role;
create temp table gone as select * from public.delete_account(tests.id('badr'));
select tests.ok((select deleted from gone where tree_id = tests.v('badr_tree')::uuid),
  'a tree only they were in goes with the account');
select tests.ok((select not deleted from gone where tree_id = tests.v('tree')::uuid),
  'a tree they only belonged to is answered for clearing their additions');
reset role;
select tests.ok(not exists (select 1 from public.trees where id = tests.v('badr_tree')::uuid),
  'their own tree is gone');
select tests.ok(not exists (select 1 from public.profiles where id = tests.id('badr')),
  'their profile is gone');
select tests.ok(not exists (select 1 from auth.users where id = tests.id('badr')),
  'and the sign in itself');
select tests.ok(exists (select 1 from public.trees where id = tests.v('tree')::uuid),
  'the family''s tree stays');
select tests.ok(tests.notices('amal', 'left') = 2, 'its owner hears a member left');
select tests.ok(
  (select actor_id is null from public.notifications where kind::text = 'left' order by created_at desc, id limit 1),
  'without the deleted name');

set role service_role;
select public.delete_account(tests.id('amal'));
reset role;
select tests.ok(not exists (select 1 from public.trees where id = tests.v('tree')::uuid),
  'once alone in it, the owner deletes their account and the tree with it');
select tests.ok(exists (select 1 from public.trees where id = tests.v('dana_tree')::uuid),
  'other families are untouched');

-- ---------- Grants and extensions ----------

reset role;
insert into public.subscriptions (tree_id, plan, cycle, status, period_start, period_end, provider)
values (tests.v('dana_tree')::uuid, 'extended', 'monthly', 'active', now(),
  '2030-01-10 12:00+03', 'sandbox');

set role authenticated;
select tests.as_user('dana');
select tests.ok((select paid from public.my_owned_trees()), 'a running paid plan shows as paid');
select tests.fails($$ select public.billing_extend(tests.v('dana_tree')::uuid, 30, 'تعويض') $$,
  'nobody extends a plan from the browser');

set role service_role;
select tests.fails($$ select public.billing_grant_manual(tests.v('dana_tree')::uuid, 'tribe', null) $$,
  'a manual grant never replaces a paid plan', 'extend it instead');
select tests.fails($$ select public.billing_extend(tests.v('dana_tree')::uuid, 0, 'تعويض عن عطل') $$,
  'an extension is at least a day');
select tests.fails($$ select public.billing_extend(tests.v('dana_tree')::uuid, 30, '  ') $$,
  'an extension needs a reason');
select tests.ok(
  public.billing_extend(tests.v('dana_tree')::uuid, 30, 'تعويض عن عطل', tests.id('eid'))
    = '2030-02-09 12:00+03'::timestamptz,
  'the admin extends a paid plan by 30 days');
reset role;
select tests.ok(
  (select period_end = '2030-02-09 12:00+03' and provider = 'sandbox' and plan = 'extended'
   from public.subscriptions where tree_id = tests.v('dana_tree')::uuid),
  'only the end date moved');
select tests.ok(
  (select kind = 'extend' and days = 30 and reason = 'تعويض عن عطل' and admin_id = tests.id('eid')
     and old_end = '2030-01-10 12:00+03' from public.subscription_changes),
  'with the reason kept');
select tests.ok(tests.queued('dana', 'plan_extended') = 1, 'the owner is told on WhatsApp');

update public.subscriptions set status = 'past_due', period_end = now() - interval '2 days',
  retry_count = 2, next_retry_at = now() + interval '1 day'
where tree_id = tests.v('dana_tree')::uuid;
set role service_role;
select public.billing_extend(tests.v('dana_tree')::uuid, 7, 'تعويض عن تأخر التجديد');
reset role;
select tests.ok(
  (select status = 'active' and next_retry_at is null and retry_count = 0
     and period_end between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'
   from public.subscriptions where tree_id = tests.v('dana_tree')::uuid),
  'a failing renewal gets its days from today and stops retrying');

update public.subscriptions set status = 'expired' where tree_id = tests.v('dana_tree')::uuid;
set role service_role;
select tests.fails($$ select public.billing_extend(tests.v('dana_tree')::uuid, 7, 'تعويض') $$,
  'an ended plan is not extended', 'no running plan');
select public.billing_grant_manual(tests.v('dana_tree')::uuid, 'tribe', null, 'منحة', tests.id('eid'));
reset role;
select tests.ok(
  (select provider = 'manual' and status = 'active' from public.subscriptions
   where tree_id = tests.v('dana_tree')::uuid),
  'a tree without a running paid plan can still be given one');
select tests.ok(
  (select count(*) = 1 from public.subscription_changes where kind = 'grant' and reason = 'منحة'),
  'and the grant is kept too');
set role service_role;
select tests.fails($$ select public.billing_extend(tests.v('dana_tree')::uuid, 7, 'تعويض') $$,
  'an open ended grant has no end to move', 'open ended');

set role authenticated;
select tests.as_user('dana');
select tests.fails($$ select * from public.subscription_changes $$,
  'owners do not read the admin''s log');
