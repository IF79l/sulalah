-- Fixes from the full review before launch (2026-10-26). Safe to run more than once.
--
-- 1. A contributor who joined on a link for one branch stays inside it. They still pick their
--    own place (their father, or themselves) on the join screen, but only inside that branch:
--    the branch the link was for is kept in `branch_root`, which nobody can change, and the
--    owner's and reviewers' devices refuse submissions from outside it.
-- 2. Two people accepting reviewer links at the same moment can no longer both take the last
--    seat: the tree's row is locked while the seats are counted.
-- 3. Handing a tree over no longer leaves the old owner's card paying its renewals: the card
--    comes off the subscription, which then runs to the end of what was paid and the new owner
--    is reminded to renew. A failed renewal left without a card lapses instead of waiting.

-- ---------- 1. The branch a link was for ----------

alter table public.tree_members
  add column if not exists branch_root text check (char_length(branch_root) <= 64);

-- Contributors may still change their own place, never the branch it must sit in.
revoke update on public.tree_members from authenticated;
grant update (branch_person_id, scope_person_ids) on public.tree_members to authenticated;

-- ---------- 2. Reviewer seats, counted under a lock ----------

create or replace function public.accept_invite(token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv public.invites;
  plan public.plan_id;
  owner uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into inv from public.invites where token_hash = public.hash_token(token) for update;
  if not found or inv.kind::text = 'view' then
    raise exception 'invite not valid' using errcode = 'P0001';
  end if;
  -- A member opening their link again on a new phone only needs the key it carries.
  if exists (select 1 from public.tree_members where tree_id = inv.tree_id and user_id = me) then
    return inv.tree_id;
  end if;
  if public.invite_problem(inv) is not null then
    raise exception 'invite not valid' using errcode = 'P0001';
  end if;

  -- Locked until this transaction ends, so seats are counted one join at a time.
  select t.plan, t.owner_id into plan, owner from public.trees t where t.id = inv.tree_id for update;
  if inv.kind = 'review' and (
    select count(*) from public.tree_members where tree_id = inv.tree_id and role = 'reviewer'
  ) >= public.reviewer_cap(plan) then
    raise exception 'reviewer limit reached' using errcode = 'P0001';
  end if;

  insert into public.tree_members (
    tree_id, user_id, role, branch_person_id, branch_root, scope_person_ids, invited_by
  )
  values (
    inv.tree_id,
    me,
    case inv.kind when 'review' then 'reviewer'::public.tree_role else 'contributor'::public.tree_role end,
    case when inv.kind = 'contribute' then inv.branch_person_id end,
    case when inv.kind = 'contribute' then inv.branch_person_id end,
    case when inv.kind = 'review' and inv.branch_person_id is not null
      then array[inv.branch_person_id] else '{}'::text[] end,
    inv.created_by
  );
  update public.invites set use_count = use_count + 1 where id = inv.id;
  perform public.add_notice(owner, inv.tree_id, 'joined', me);
  if inv.created_by <> owner then perform public.add_notice(inv.created_by, inv.tree_id, 'joined', me); end if;
  return inv.tree_id;
end $$;

create or replace function public.set_member_role(
  tree uuid, member uuid, new_role public.tree_role, scope text[] default '{}'
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  was public.tree_role;
  plan public.plan_id;
begin
  if public.my_role(tree) is distinct from 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new_role = 'owner' then raise exception 'use transfer_ownership' using errcode = '22023'; end if;
  if coalesce(array_length(scope, 1), 0) > 50 or exists (
    select 1 from unnest(scope) s where char_length(s) not between 1 and 64
  ) then
    raise exception 'bad scope' using errcode = '22023';
  end if;
  select t.plan into plan from public.trees t where t.id = tree for update;
  select role into was from public.tree_members where tree_id = tree and user_id = member for update;
  if was is null then raise exception 'not a member' using errcode = 'P0002'; end if;
  if was = 'owner' then raise exception 'not allowed' using errcode = '42501'; end if;

  if new_role = 'reviewer' and was <> 'reviewer' then
    if (select count(*) from public.tree_members where tree_id = tree and role = 'reviewer')
       >= public.reviewer_cap(plan) then
      raise exception 'reviewer limit reached' using errcode = 'P0001';
    end if;
  end if;

  update public.tree_members
  set role = new_role,
      scope_person_ids = case when new_role = 'reviewer' then coalesce(scope, '{}') else '{}' end
  where tree_id = tree and user_id = member;
  if new_role <> was then
    perform public.add_notice(member, tree,
      case new_role when 'reviewer' then 'made_reviewer'::public.notice_kind
        else 'made_contributor'::public.notice_kind end,
      auth.uid());
  end if;
end $$;

-- ---------- 3. Handing over a tree ----------

create or replace function public.transfer_ownership(tree uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if public.my_role(tree) is distinct from 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if member = me or not exists (
    select 1 from public.tree_members where tree_id = tree and user_id = member
  ) then
    raise exception 'not a member' using errcode = 'P0002';
  end if;
  update public.tree_members set role = 'reviewer', scope_person_ids = '{}'
  where tree_id = tree and user_id = me;
  update public.tree_members
  set role = 'owner', scope_person_ids = '{}', branch_person_id = null, branch_root = null
  where tree_id = tree and user_id = member;
  update public.trees set owner_id = member, updated_at = now() where id = tree;
  -- The old owner's card stops paying for a tree that is no longer theirs.
  update public.subscriptions
  set payment_method_id = null, scheduled_plan = null, scheduled_cycle = null, updated_at = now()
  where tree_id = tree;
  perform public.add_notice(member, tree, 'owner_now', me);
end $$;

/** As before, and a failed renewal with no card left to retry (handed over) lapses too. */
create or replace function public.billing_expire() returns integer
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
  where (status = 'past_due' and (next_retry_at is null or payment_method_id is null))
     or (status = 'active' and period_end <= now() - interval '1 hour'
         and (provider = 'manual' or payment_method_id is null));
  get diagnostics m = row_count;
  return n + m;
end $$;

revoke execute on function public.billing_expire from public, anon, authenticated;
grant execute on function public.billing_expire to service_role;

revoke execute on function public.accept_invite, public.set_member_role,
  public.transfer_ownership from public, anon;
grant execute on function public.accept_invite, public.set_member_role,
  public.transfer_ownership to authenticated;

-- Tell the API about the changes straight away.
notify pgrst, 'reload schema';
