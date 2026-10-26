-- WhatsApp: the one channel سُلالة uses to reach people outside the app (decided with Faisal,
-- 2026-10-26). No SMS notices; SMS stays only as the fallback for a login code.
--
-- Every notification and billing event queues a message in `wa_outbox` from inside the
-- database, so nothing can happen without its message being queued. The server sends the
-- queue (packages/messaging/src/whatsapp/outbox.ts) through Meta's WhatsApp Cloud API, or the
-- mock until the Sulalah number is approved. The outbox holds no phone number and no family
-- member's name: the number is read from the account at send time, and a message says who
-- acted and how many, never who was added.

-- ---------- What each person wants ----------

alter table public.profiles drop constraint profiles_notify_check;
update public.profiles set notify = 'whatsapp' where notify = 'sms';
alter table public.profiles
  alter column notify set default 'whatsapp',
  add constraint profiles_notify_check check (notify in ('app', 'whatsapp')),
  /** Topics turned off while WhatsApp stays on: review, members, billing. */
  add column notify_muted text[] not null default '{}'
    check (notify_muted <@ array['review', 'members', 'billing']::text[]),
  /** When they agreed to WhatsApp notices (the sign in screen says so), and when they stopped. */
  add column whatsapp_opt_in_at timestamptz,
  add column whatsapp_opt_out_at timestamptz;

/** Keeps the consent record with every change of `notify`; nobody writes these columns. */
create function public.track_whatsapp_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.notify = 'whatsapp' then new.whatsapp_opt_in_at := now(); end if;
  elsif new.notify is distinct from old.notify then
    if new.notify = 'whatsapp' then
      new.whatsapp_opt_in_at := now();
      new.whatsapp_opt_out_at := null;
    else
      new.whatsapp_opt_out_at := now();
    end if;
  end if;
  return new;
end $$;

create trigger profiles_whatsapp_consent
  before insert or update of notify on public.profiles
  for each row execute function public.track_whatsapp_consent();

grant update (notify, notify_muted) on public.profiles to authenticated;

-- ---------- The outbox ----------

create type public.wa_status as enum (
  'queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'expired', 'skipped'
);

create table public.wa_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tree_id uuid references public.trees (id) on delete cascade,
  /** A key of packages/messaging/src/whatsapp/templates.ts. */
  template text not null check (template ~ '^[a-z_]{1,40}$'),
  topic text not null check (topic in ('review', 'members', 'billing')),
  actor_id uuid references public.profiles (id) on delete set null,
  count integer not null default 1 check (count between 0 and 10000),
  /** Billing details: plan, cycle, amounts, invoice number, dates. Never a family name. */
  data jsonb not null default '{}',
  /** One message per event, for events that may be reported more than once. */
  dedupe_key text unique,
  status public.wa_status not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  provider_message_id text unique,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz
);

create index wa_outbox_due_idx on public.wa_outbox (next_attempt_at) where status = 'queued';
create index wa_outbox_user_idx on public.wa_outbox (user_id, created_at desc);
/** Additions from the same person to the same tree, still waiting, go as one message. */
create unique index wa_outbox_merge on public.wa_outbox (user_id, tree_id, template, actor_id)
  where status = 'queued' and dedupe_key is null;

alter table public.wa_outbox enable row level security;
revoke all on public.wa_outbox from anon, authenticated;

-- ---------- Queueing ----------

/** Night in Riyadh (11 pm to 7 am) holds a message until the morning. */
create function public.wa_after_quiet(at timestamptz) returns timestamptz
language sql stable set search_path = '' as $$
  select case
    when extract(hour from at at time zone 'Asia/Riyadh') >= 23
      then (date_trunc('day', at at time zone 'Asia/Riyadh') + interval '1 day 7 hours')
        at time zone 'Asia/Riyadh'
    when extract(hour from at at time zone 'Asia/Riyadh') < 7
      then (date_trunc('day', at at time zone 'Asia/Riyadh') + interval '7 hours')
        at time zone 'Asia/Riyadh'
    else at
  end
$$;

/**
 * Queues one message, if the person wants WhatsApp and this topic. Nobody is told of their own
 * act. A message like one still waiting adds its count to it instead.
 */
create function public.wa_enqueue(
  member uuid,
  tree uuid,
  what text,
  about text,
  actor uuid default null,
  n integer default 1,
  extra jsonb default '{}',
  dedupe text default null,
  quiet boolean default true
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  due timestamptz := case when quiet then public.wa_after_quiet(now()) else now() end;
begin
  if member is null or member is not distinct from actor then return; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = member and p.notify = 'whatsapp' and not (about = any (p.notify_muted))
  ) then
    return;
  end if;
  if dedupe is not null then
    insert into public.wa_outbox (user_id, tree_id, template, topic, actor_id, count, data,
      dedupe_key, next_attempt_at)
    values (member, tree, what, about, actor, n, extra, dedupe, due)
    on conflict (dedupe_key) do nothing;
  else
    insert into public.wa_outbox (user_id, tree_id, template, topic, actor_id, count, data,
      next_attempt_at)
    values (member, tree, what, about, actor, n, extra, due)
    on conflict (user_id, tree_id, template, actor_id) where status = 'queued' and dedupe_key is null
    do update set count = least(public.wa_outbox.count + excluded.count, 10000), updated_at = now();
  end if;
end $$;

/** Every notification in the app also goes on WhatsApp, except a taken back addition. */
create function public.wa_on_notice() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t text := case new.kind
    when 'submitted' then 'additions_submitted'
    when 'approved' then 'additions_approved'
    when 'partly_approved' then 'additions_partly_approved'
    when 'changes' then 'additions_changes'
    when 'rejected' then 'additions_rejected'
    when 'joined' then 'member_joined'
    when 'made_reviewer' then 'made_reviewer'
    when 'made_contributor' then 'made_contributor'
    when 'owner_now' then 'owner_now'
  end;
begin
  if t is not null then
    perform public.wa_enqueue(new.user_id, new.tree_id, t,
      case when new.kind in ('joined', 'made_reviewer', 'made_contributor', 'owner_now')
        then 'members' else 'review' end,
      new.actor_id, new.count);
  end if;
  return new;
end $$;

create trigger notifications_whatsapp
  after insert on public.notifications
  for each row execute function public.wa_on_notice();

/** A receipt for every paid invoice, sent at once whatever the hour: they just paid. */
create function public.wa_on_invoice() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.wa_enqueue(new.owner_id, new.tree_id, 'payment_received', 'billing', null, 1,
    jsonb_build_object('invoice_id', new.id, 'number', new.number,
      'amount_halalas', new.amount_halalas, 'plan', new.plan, 'cycle', new.cycle),
    'invoice:' || new.id, false);
  return new;
end $$;

create trigger invoices_whatsapp
  after insert on public.invoices
  for each row execute function public.wa_on_invoice();

/** A declined renewal, and a plan that has ended, tell the tree's owner. */
create function public.wa_on_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  info jsonb := jsonb_build_object('plan', new.plan, 'cycle', new.cycle,
    'period_end', new.period_end, 'next_retry_at', new.next_retry_at);
begin
  select t.owner_id into owner from public.trees t where t.id = new.tree_id;
  if new.status = 'past_due' and new.retry_count > old.retry_count and new.next_retry_at is not null then
    perform public.wa_enqueue(owner, new.tree_id, 'renewal_failed', 'billing', null, 1, info,
      'renewal_failed:' || new.id || ':' || coalesce(new.period_end::text, '') || ':' || new.retry_count);
  elsif new.status in ('expired', 'canceled') and old.status not in ('expired', 'canceled') then
    perform public.wa_enqueue(owner, new.tree_id, 'plan_ended', 'billing', null, 1, info,
      'plan_ended:' || new.id || ':' || coalesce(new.period_end::text, ''));
  end if;
  return new;
end $$;

create trigger subscriptions_whatsapp
  after update of status, retry_count on public.subscriptions
  for each row execute function public.wa_on_subscription();

/**
 * Three days before a plan that will not renew itself ends (renewal stopped, no saved card,
 * or a manual grant with an end date). Run daily by the WhatsApp job; answers how many.
 */
create function public.wa_plan_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  n integer := 0;
begin
  for s in
    select x.id, x.tree_id, x.plan, x.cycle, x.period_end, t.owner_id
    from public.subscriptions x join public.trees t on t.id = x.tree_id
    where x.status = 'active' and x.period_end between now() and now() + interval '3 days'
      and (x.cancel_at_period_end or x.provider = 'manual' or x.payment_method_id is null)
  loop
    perform public.wa_enqueue(s.owner_id, s.tree_id, 'plan_ending', 'billing', null, 1,
      jsonb_build_object('plan', s.plan, 'cycle', s.cycle, 'period_end', s.period_end),
      'plan_ending:' || s.id || ':' || s.period_end);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- Sending (server only) ----------

/**
 * Takes up to `batch` due messages for one run of the sender, with the number to send to and
 * the actor's name. Before that: drops what is too old to be news, frees what a dead run
 * held, and skips people who turned WhatsApp or the topic off since.
 */
create function public.wa_claim(batch integer default 50)
returns table (
  id uuid, template text, phone text, actor text, count integer, tree_id uuid, data jsonb,
  attempts integer
)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  update public.wa_outbox o set status = 'expired', updated_at = now()
  where o.status = 'queued'
    and o.created_at < now() - case when o.topic = 'billing' then interval '3 days' else interval '1 day' end;
  update public.wa_outbox o set status = 'queued', locked_until = null, updated_at = now()
  where o.status = 'sending' and o.locked_until < now();
  update public.wa_outbox o set status = 'skipped', last_error = 'turned off', updated_at = now()
  from public.profiles p
  where p.id = o.user_id and o.status = 'queued'
    and (p.notify <> 'whatsapp' or o.topic = any (p.notify_muted));

  return query
  with picked as (
    select o.id from public.wa_outbox o
    where o.status = 'queued' and o.next_attempt_at <= now()
    order by o.next_attempt_at
    limit greatest(1, least(batch, 200))
    for update skip locked
  ), claimed as (
    update public.wa_outbox o
    set status = 'sending', locked_until = now() + interval '2 minutes', updated_at = now()
    from picked where o.id = picked.id
    returning o.*
  )
  select c.id, c.template, u.phone::text,
    coalesce(trim(a.first_name || case when a.father_name <> '' then ' بن ' || a.father_name else '' end), ''),
    c.count, c.tree_id, c.data, c.attempts
  from claimed c
  left join auth.users u on u.id = c.user_id
  left join public.profiles a on a.id = c.actor_id;
end $$;

/** What Meta reported for a sent message. Only moves forward: sent, delivered, read. */
create function public.wa_delivery(
  message text, what public.wa_status, at timestamptz, error text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.wa_outbox o set
    status = case
      when what = 'failed' and o.status in ('sending', 'sent', 'delivered') then 'failed'::public.wa_status
      when what = 'delivered' and o.status in ('sending', 'sent') then 'delivered'::public.wa_status
      when what = 'read' and o.status in ('sending', 'sent', 'delivered') then 'read'::public.wa_status
      else o.status
    end,
    delivered_at = case when what in ('delivered', 'read') then coalesce(o.delivered_at, at) else o.delivered_at end,
    read_at = case when what = 'read' then coalesce(o.read_at, at) else o.read_at end,
    last_error = case when what = 'failed' then left(error, 300) else o.last_error end,
    updated_at = now()
  where o.provider_message_id = message;
end $$;

/** A reply of "إيقاف" or "تشغيل" from a number turns its account's WhatsApp notices off or on. */
create function public.wa_set_by_phone(number text, wanted boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.profiles p set notify = case when wanted then 'whatsapp' else 'app' end, updated_at = now()
  from auth.users u
  where u.id = p.id and regexp_replace(u.phone, '\D', '', 'g') = regexp_replace(number, '\D', '', 'g')
    and p.notify is distinct from case when wanted then 'whatsapp' else 'app' end;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.track_whatsapp_consent, public.wa_after_quiet,
  public.wa_enqueue, public.wa_on_notice, public.wa_on_invoice, public.wa_on_subscription,
  public.wa_plan_reminders, public.wa_claim, public.wa_delivery, public.wa_set_by_phone
  from public, anon, authenticated;
grant execute on function public.wa_plan_reminders, public.wa_claim, public.wa_delivery,
  public.wa_set_by_phone to service_role;
