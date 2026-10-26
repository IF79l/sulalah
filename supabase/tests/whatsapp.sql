-- WhatsApp notices: what gets queued, for whom, and who may touch the queue.
-- Amal owns a tree, Chadi contributes, Badr mutes review notices, Dana keeps to the app.
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
  end)::uuid
$$;

create function tests.as_user(name text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(tests.id(name)::text, ''), false)
$$;

create table tests.vars (k text primary key, v text);
create function tests.v(key text) returns text language sql stable as $$
  select v from tests.vars where k = key
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;
grant all on tests.vars to anon, authenticated, service_role;

/** The queue as the server sees it, for the checks below. */
create function tests.queued(who text, what text) returns integer language sql security definer as $$
  select coalesce(sum(count), 0)::integer from public.wa_outbox
  where user_id = tests.id(who) and template = what and status = 'queued'
$$;
grant execute on function tests.queued to authenticated, service_role;

insert into auth.users (id, phone) values
  (tests.id('amal'), '966500000001'),
  (tests.id('badr'), '966500000002'),
  (tests.id('chadi'), '966500000003'),
  (tests.id('dana'), '966500000004');
update public.profiles set first_name = 'شادي', father_name = 'سالم' where id = tests.id('chadi');

-- ---------- Consent ----------

select tests.ok((select count(*) from public.profiles where notify = 'whatsapp'
  and whatsapp_opt_in_at is not null) = 4, 'a new account gets WhatsApp notices, with the time it agreed');

set role authenticated;
select tests.as_user('dana');
update public.profiles set notify = 'app' where id = auth.uid();
select tests.ok((select notify = 'app' and whatsapp_opt_out_at is not null from public.profiles
  where id = auth.uid()), 'turning WhatsApp off is recorded');
select tests.fails($$ update public.profiles set notify = 'sms' where id = auth.uid() $$,
  'SMS is no longer a channel for notices', 'profiles_notify_check');
select tests.fails($$ update public.profiles set whatsapp_opt_in_at = now() - interval '1 year'
  where id = auth.uid() $$, 'nobody back-dates their consent', 'permission denied');
select tests.fails($$ update public.profiles set notify_muted = '{marketing}' where id = auth.uid() $$,
  'only known topics can be muted', 'check');

select tests.as_user('badr');
update public.profiles set notify_muted = '{review}' where id = auth.uid();

-- ---------- Nobody but the server touches the queue ----------

select tests.fails($$ select * from public.wa_outbox $$, 'members cannot read the queue', 'permission denied');
select tests.fails($$ insert into public.wa_outbox (user_id, template, topic) values (auth.uid(), 'owner_now', 'members') $$,
  'members cannot queue a message', 'permission denied');
select tests.fails($$ select * from public.wa_claim(10) $$, 'members cannot take from the queue', 'permission denied');
select tests.fails($$ select public.wa_set_by_phone('966500000001', false) $$,
  'members cannot switch another number off', 'permission denied');
select tests.fails($$ select public.wa_enqueue(auth.uid(), null, 'owner_now', 'members') $$,
  'members cannot queue through the function either', 'permission denied');

-- ---------- Notices become messages ----------

select tests.as_user('amal');
insert into tests.vars values ('tree', public.create_tree()::text);
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
values (tests.v('tree')::uuid, 'contribute', public.hash_token('tok-c'), now() + interval '7 days', auth.uid());
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
values (tests.v('tree')::uuid, 'review', public.hash_token('tok-r'), now() + interval '7 days', auth.uid());

select tests.as_user('chadi');
select public.accept_invite('tok-c');
select tests.as_user('dana');
select public.accept_invite('tok-c');
select tests.as_user('badr');
select public.accept_invite('tok-r');
select tests.ok(tests.queued('amal', 'member_joined') = 3, 'the owner hears on WhatsApp of everyone who joined');

select tests.as_user('chadi');
select public.notify_submission(tests.v('tree')::uuid, '{p-root,p-saad}', 2);
select public.notify_submission(tests.v('tree')::uuid, '{p-root,p-saad}', 3);
select tests.ok(tests.queued('amal', 'additions_submitted') = 5,
  'additions from one person, still waiting, go as one message with the total');
select tests.ok(tests.queued('badr', 'additions_submitted') = 0, 'a muted topic queues nothing');
select tests.ok(tests.queued('chadi', 'additions_submitted') = 0, 'nobody hears of their own act');

select tests.as_user('amal');
select public.notify_member(tests.v('tree')::uuid, tests.id('dana'), 'approved', 2);
select public.notify_member(tests.v('tree')::uuid, tests.id('chadi'), 'partly_approved', 1);
select tests.ok(tests.queued('dana', 'additions_approved') = 0, 'a person on app-only gets no WhatsApp');
select tests.ok(tests.queued('chadi', 'additions_partly_approved') = 1, 'a review result goes to the contributor');
select public.set_member_role(tests.v('tree')::uuid, tests.id('badr'), 'contributor', '{}');
select tests.ok(tests.queued('badr', 'made_contributor') = 1, 'a new role goes out as well');
reset role;

-- ---------- Quiet hours ----------

select tests.ok(public.wa_after_quiet('2026-10-26T20:30:00Z') = '2026-10-27T04:00:00Z',
  '11:30 pm in Riyadh waits for 7 am');
select tests.ok(public.wa_after_quiet('2026-10-26T02:00:00Z') = '2026-10-26T04:00:00Z',
  '5 am in Riyadh waits for 7 am the same day');
select tests.ok(public.wa_after_quiet('2026-10-26T09:00:00Z') = '2026-10-26T09:00:00Z',
  'noon goes at once');

-- ---------- Sending ----------

update public.wa_outbox set next_attempt_at = now();
set role service_role;
create temp table claimed as select * from public.wa_claim(100);
select tests.ok((select count(*) from claimed) = 6, 'the sender takes every message that is due');
select tests.ok((select phone from claimed where template = 'additions_submitted') = '966500000001',
  'with the number read from the account at send time');
select tests.ok((select actor from claimed where template = 'additions_submitted') = 'شادي بن سالم',
  'and the name of who acted');
select tests.ok((select count(*) from public.wa_claim(100)) = 0, 'a message taken by one run is not taken by another');

update public.wa_outbox set status = 'sent', provider_message_id = 'wamid.1', sent_at = now()
where id = (select id from claimed where template = 'additions_submitted');
select public.wa_delivery('wamid.1', 'read', now());
select public.wa_delivery('wamid.1', 'delivered', now());
select tests.ok((select status = 'read' and read_at is not null and delivered_at is not null
  from public.wa_outbox where provider_message_id = 'wamid.1'), 'a late "delivered" never undoes "read"');

-- A run that died holding messages lets them go again.
update public.wa_outbox set locked_until = now() - interval '1 minute' where status = 'sending';
select tests.ok((select count(*) from public.wa_claim(100)) = 5, 'a dead run’s messages are taken again');

-- Turned off after the message was queued, and messages too old to be news.
reset role;
update public.wa_outbox set status = 'queued', next_attempt_at = now() where status = 'sending';
update public.profiles set notify_muted = '{review,members}' where id = tests.id('badr');
update public.wa_outbox set created_at = now() - interval '2 days' where template = 'member_joined';
set role service_role;
select tests.ok((select count(*) from public.wa_claim(100)) = 1, 'only what is still wanted and fresh goes');
select tests.ok((select status from public.wa_outbox where template = 'made_contributor') = 'skipped',
  'a topic muted since is skipped');
select tests.ok((select bool_and(status = 'expired') from public.wa_outbox where template = 'member_joined'),
  'a day-old notice expires unsent');

-- ---------- Billing ----------

reset role;
update public.plans set price_monthly_halalas = 4900 where id = 'extended';
set role service_role;
insert into public.checkouts (id, tree_id, user_id, kind, plan, cycle, amount_halalas, period_start,
  period_end, provider)
values ('00000000-0000-4000-8000-0000000000c1', tests.v('tree')::uuid, tests.id('amal'), 'new',
  'extended', 'monthly', 4900, now(), now() + interval '1 month', 'sandbox');
select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c1', 'pay_1', 4900, 'SAR', 'tok', 'visa', '1111');
select public.billing_apply_payment('00000000-0000-4000-8000-0000000000c1', 'pay_1', 4900, 'SAR');
select tests.ok((select count(*) from public.wa_outbox where template = 'payment_received') = 1,
  'a payment sends one receipt, even when reported twice');
select tests.ok((select data ->> 'number' ~ '^SUL-' and (data ->> 'amount_halalas')::int = 4900
  and next_attempt_at <= now() from public.wa_outbox where template = 'payment_received'),
  'the receipt carries the invoice and goes at once');

insert into public.checkouts (id, tree_id, kind, plan, cycle, amount_halalas, period_start, period_end, provider)
values ('00000000-0000-4000-8000-0000000000c2', tests.v('tree')::uuid, 'renewal', 'extended', 'monthly',
  4900, now() + interval '1 month', now() + interval '2 months', 'sandbox');
select public.billing_payment_failed('00000000-0000-4000-8000-0000000000c2', 'pay_2', 'declined');
select public.billing_payment_failed('00000000-0000-4000-8000-0000000000c2', 'pay_2', 'declined');
select tests.ok((select count(*) from public.wa_outbox where template = 'renewal_failed') = 1,
  'a declined renewal tells the owner once');
select tests.ok((select data ->> 'next_retry_at' is not null from public.wa_outbox where template = 'renewal_failed'),
  'with the day of the next try');

reset role;
update public.subscriptions set status = 'active', retry_count = 0, next_retry_at = null,
  cancel_at_period_end = true, period_end = now() + interval '2 days';
set role service_role;
select tests.ok(public.wa_plan_reminders() = 1, 'a plan that will not renew gets a reminder');
select public.wa_plan_reminders();
select tests.ok((select count(*) from public.wa_outbox where template = 'plan_ending') = 1,
  'once per period');

reset role;
update public.subscriptions set period_end = now() - interval '1 minute';
set role service_role;
select public.billing_expire();
select tests.ok((select count(*) from public.wa_outbox where template = 'plan_ended') = 1,
  'a plan that ended tells the owner');

-- ---------- Replies ----------

select tests.ok(public.wa_set_by_phone('+966 500000001', false) = 1, 'a reply of "إيقاف" turns the number off');
select tests.ok((select notify from public.profiles where id = tests.id('amal')) = 'app', 'the account is app-only now');
select tests.ok(public.wa_set_by_phone('966500000001', true) = 1, 'and "تشغيل" turns it back on');
select tests.ok(public.wa_set_by_phone('966599999999', false) = 0, 'an unknown number changes nothing');
reset role;
