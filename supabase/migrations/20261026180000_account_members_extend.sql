-- Decided with Faisal on 2026-10-26. Safe to run more than once.
--
-- 1. A member who leaves a tree tells its owner, and a member the owner removes is told. Both
--    reach WhatsApp through the notifications table, like every other notice.
-- 2. A person deletes their own account from "حسابي". Trees they own with other people in them
--    must be handed over or deleted first, so a family never loses its tree to one click. Trees
--    only they are in go with the account. Invoices stay, as tax records, with the buyer's name
--    as printed on the day.
-- 3. A plan given by hand never replaces a paid subscription. The platform admin extends the
--    paid one instead (compensation): its end date moves on, and the reason is kept.

-- ---------- 1. Leaving and removing ----------

alter type public.notice_kind add value if not exists 'left';
alter type public.notice_kind add value if not exists 'removed';

/**
 * After a member's row goes: the owner hears that someone left, or the member hears that the
 * owner removed them. A row that goes with its tree (the tree was deleted) says nothing. When
 * the account itself was deleted, the owner hears that a member left, without a name.
 */
create or replace function public.on_member_gone() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  owner uuid;
begin
  if old.role = 'owner' then return old; end if;
  select t.owner_id into owner from public.trees t where t.id = old.tree_id;
  if owner is null then return old; end if;
  if not exists (select 1 from public.profiles p where p.id = old.user_id) then
    perform public.add_notice(owner, old.tree_id, 'left'::public.notice_kind, null);
  elsif me = old.user_id then
    perform public.add_notice(owner, old.tree_id, 'left'::public.notice_kind, me);
  elsif me = owner then
    perform public.add_notice(old.user_id, old.tree_id, 'removed'::public.notice_kind, me);
  end if;
  return old;
end $$;

/**
 * A person may read the name of whoever acted in one of their notifications. Names are
 * otherwise shown only between people who share a tree, and "left" and "removed" arrive just
 * after the two stopped sharing it, so without this the notice could not say who.
 */
create or replace function public.acted_for_me(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.notifications n where n.user_id = auth.uid() and n.actor_id = other
  )
$$;

drop policy if exists "see who acted in my notices" on public.profiles;
create policy "see who acted in my notices" on public.profiles for select
  to authenticated using (public.acted_for_me(id));

create or replace trigger tree_members_gone
  after delete on public.tree_members
  for each row execute function public.on_member_gone();

/** As before, with the two new notices. */
create or replace function public.wa_on_notice() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t text := case new.kind::text
    when 'submitted' then 'additions_submitted'
    when 'approved' then 'additions_approved'
    when 'partly_approved' then 'additions_partly_approved'
    when 'changes' then 'additions_changes'
    when 'rejected' then 'additions_rejected'
    when 'joined' then 'member_joined'
    when 'made_reviewer' then 'made_reviewer'
    when 'made_contributor' then 'made_contributor'
    when 'owner_now' then 'owner_now'
    when 'left' then 'member_left'
    when 'removed' then 'member_removed'
  end;
begin
  if t is not null then
    perform public.wa_enqueue(new.user_id, new.tree_id, t,
      case when new.kind::text in ('joined', 'made_reviewer', 'made_contributor', 'owner_now',
        'left', 'removed') then 'members' else 'review' end,
      new.actor_id, new.count);
  end if;
  return new;
end $$;

-- ---------- 2. Deleting an account ----------

/**
 * The trees the caller owns, with how many other people are in each and whether a paid plan is
 * running on it. Trees with others in them stand in the way of deleting the account.
 */
create or replace function public.my_owned_trees()
returns table (tree_id uuid, others integer, paid boolean)
language sql stable security definer set search_path = '' as $$
  select t.id,
    (select count(*)::integer from public.tree_members m
      where m.tree_id = t.id and m.user_id <> t.owner_id),
    exists (select 1 from public.subscriptions s
      where s.tree_id = t.id and s.provider <> 'manual' and s.status in ('active', 'past_due'))
  from public.trees t
  where t.owner_id = auth.uid()
  order by t.created_at
$$;

/**
 * Deletes an account. Called by the server with the secret key, after it checked who is asking
 * and that they just signed in again. Refuses while they own a tree that others are in. Answers
 * every tree they were in, and whether it was deleted with them, so the server can clear the
 * files that belonged to them: whole trees they alone were in, and additions they sent that
 * nobody reviewed.
 */
create or replace function public.delete_account(member uuid)
returns table (tree_id uuid, deleted boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  mine uuid[];
  rest uuid[];
begin
  if not exists (select 1 from public.profiles p where p.id = member) then
    raise exception 'no account' using errcode = 'P0002';
  end if;
  -- Locked so nobody joins a tree between the check and the delete.
  perform 1 from public.trees t where t.owner_id = member for update;
  if exists (
    select 1 from public.trees t join public.tree_members m on m.tree_id = t.id
    where t.owner_id = member and m.user_id <> member
  ) then
    raise exception 'owns shared trees' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(t.id), '{}') into mine from public.trees t where t.owner_id = member;
  select coalesce(array_agg(m.tree_id), '{}') into rest
  from public.tree_members m where m.user_id = member and m.role <> 'owner';

  delete from public.trees t where t.owner_id = member;
  -- Goes on to the profile and, through it, their memberships, notices and saved cards.
  delete from auth.users u where u.id = member;

  return query
    select x, true from unnest(mine) x
    union all
    select x, false from unnest(rest) x;
end $$;

revoke execute on function public.on_member_gone, public.my_owned_trees, public.delete_account,
  public.acted_for_me from public, anon, authenticated;
grant execute on function public.my_owned_trees, public.acted_for_me to authenticated;
grant execute on function public.delete_account to service_role;

-- ---------- 3. Grants and extensions ----------

/**
 * Every change the platform admin makes to a plan by hand, with why. Only the admin's desk
 * (with the secret key) reads it.
 */
create table if not exists public.subscription_changes (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid references public.trees (id) on delete set null,
  kind text not null check (kind in ('extend', 'grant')),
  plan public.plan_id not null,
  days integer check (days between 1 and 366),
  old_end timestamptz,
  new_end timestamptz,
  reason text not null check (char_length(reason) between 3 and 300),
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists subscription_changes_tree_idx
  on public.subscription_changes (tree_id, created_at desc);

alter table public.subscription_changes enable row level security;
revoke all on public.subscription_changes from anon, authenticated;

/**
 * The platform admin gives a tree a plan without payment, open ended or until a date. Never on
 * top of a paid plan that is still running: that one is extended instead.
 */
drop function if exists public.billing_grant_manual(uuid, public.plan_id, timestamptz);
create or replace function public.billing_grant_manual(
  tree uuid,
  plan public.plan_id,
  until timestamptz,
  reason text default 'تفعيل باقة طلبها المالك قبل فتح الدفع',
  admin uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
begin
  select * into sub from public.subscriptions s where s.tree_id = tree for update;
  if found and sub.provider <> 'manual' and sub.status in ('active', 'past_due') then
    raise exception 'paid plan running, extend it instead' using errcode = 'P0001';
  end if;
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
  insert into public.subscription_changes (tree_id, kind, plan, old_end, new_end, reason, admin_id)
  values (tree, 'grant', plan, sub.period_end, until, reason, admin);
end $$;

/**
 * Moves a running plan's end date on by `days`, as compensation. A renewal that was failing
 * gets the days from today and stops retrying until the new end. The owner is told on WhatsApp.
 * Answers the new end date.
 */
create or replace function public.billing_extend(
  tree uuid, days integer, reason text, admin uuid default null
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  sub public.subscriptions;
  new_end timestamptz;
  owner uuid;
  change uuid;
begin
  if days is null or days not between 1 and 366 then
    raise exception 'days out of range' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(reason, ''))) < 3 then
    raise exception 'reason missing' using errcode = '22023';
  end if;
  select * into sub from public.subscriptions s where s.tree_id = tree for update;
  if not found or sub.status not in ('active', 'past_due') then
    raise exception 'no running plan' using errcode = 'P0002';
  end if;
  if sub.period_end is null then
    raise exception 'plan is open ended' using errcode = 'P0001';
  end if;

  new_end := greatest(sub.period_end, now()) + make_interval(days => days);
  update public.subscriptions
  set period_end = new_end, status = 'active', retry_count = 0, next_retry_at = null,
      updated_at = now()
  where id = sub.id;
  insert into public.subscription_changes (tree_id, kind, plan, days, old_end, new_end, reason, admin_id)
  values (tree, 'extend', sub.plan, days, sub.period_end, new_end, trim(reason), admin)
  returning id into change;

  select t.owner_id into owner from public.trees t where t.id = tree;
  perform public.wa_enqueue(owner, tree, 'plan_extended', 'billing', null, days,
    jsonb_build_object('plan', sub.plan, 'cycle', sub.cycle, 'period_end', new_end, 'days', days),
    'plan_extended:' || change);
  return new_end;
end $$;

revoke execute on function public.billing_grant_manual, public.billing_extend
  from public, anon, authenticated;
grant execute on function public.billing_grant_manual, public.billing_extend to service_role;

-- Tell the API about the changes straight away.
notify pgrst, 'reload schema';
