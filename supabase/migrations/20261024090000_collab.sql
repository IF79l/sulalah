-- Working on a tree together: invite and view links, members' roles, notifications and the
-- visitors' copy of the tree. Still no names here: notifications carry who and how many, and
-- the person ids they point at are the opaque ids from inside the sealed tree file.

-- ---------- Plan limits ----------

/**
 * Assistant reviewers a plan allows, not counting the owner. The billing migration replaces
 * this with the configurable plans table; every caller below goes through it.
 */
create function public.reviewer_cap(plan public.plan_id) returns integer
language sql stable set search_path = '' as $$
  select case plan when 'family' then 1 when 'extended' then 5 else 20 end
$$;

-- ---------- View links ----------

-- A view link opens a read-only copy of the tree without an account. That copy is sealed
-- with a key derived from the tree key (members can make it, visitors cannot get back to the
-- tree key from it) and kept in a public bucket under a random folder name, so it is
-- reachable only through a valid link. Closing the tree to links clears the folder name.
alter type public.invite_kind add value if not exists 'view';

alter table public.trees
  /** The random folder of the visitors' copy; null means the tree is closed to view links. */
  add column view_slug text unique check (view_slug ~ '^[0-9a-f]{32}$'),
  /** The visitors' copy as last published, inside the folder above. */
  add column view_path text;

/** The invite's own token, sealed with the tree key, so the owner can copy the link again. */
alter table public.invites
  add column token_sealed text check (char_length(token_sealed) <= 1024);

-- ---------- Notifications ----------

create type public.notice_kind as enum (
  'submitted',
  'approved',
  'partly_approved',
  'changes',
  'rejected',
  'withdrawn',
  'joined',
  'made_reviewer',
  'made_contributor',
  'owner_now'
);

/**
 * One line in a person's notifications. The words are put together on the device from the
 * kind, the actor's name and the tree file, so nothing here names a family member.
 */
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tree_id uuid not null references public.trees (id) on delete cascade,
  kind public.notice_kind not null,
  actor_id uuid references public.profiles (id) on delete set null,
  /** How many people the change covered. */
  count integer not null default 1 check (count between 0 and 10000),
  /** The person the change hangs from, as the tree file knows them. */
  ref text check (char_length(ref) <= 64),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "see own notifications" on public.notifications for select
  to authenticated using (user_id = auth.uid());
create policy "mark own notifications read" on public.notifications for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clear own notifications" on public.notifications for delete
  to authenticated using (user_id = auth.uid());

revoke all on public.notifications from anon;
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

/** Writes one notification; only the functions below call it. */
create function public.add_notice(
  member uuid, tree uuid, what public.notice_kind, actor uuid, n integer default 1, at text default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, tree_id, kind, actor_id, count, ref)
  select member, tree, what, actor, n, at
  where member is distinct from actor
$$;

-- ---------- Actions ----------

-- Answers why a link no longer works, or null when it does.
create function public.invite_problem(inv public.invites) returns text
language sql stable set search_path = '' as $$
  select case
    when inv.revoked_at is not null then 'stopped'
    when inv.expires_at <= now() then 'expired'
    when inv.max_uses is not null and inv.use_count >= inv.max_uses then 'used-up'
  end
$$;

drop function public.invite_preview(text);

/**
 * What an invite link shows before joining: who sent it, and why it no longer works if it
 * does not. A reviewer link to a tree with every reviewer seat taken answers 'full'.
 */
create function public.invite_preview(token text)
returns table (kind public.invite_kind, inviter text, valid boolean, problem text, branch text)
language plpgsql stable security definer set search_path = '' as $$
declare
  inv public.invites;
  who text;
  why text;
  plan public.plan_id;
begin
  select * into inv from public.invites i where i.token_hash = public.hash_token(token);
  if not found then return; end if;
  select trim(p.first_name || case when p.father_name <> '' then ' بن ' || p.father_name else '' end)
  into who from public.profiles p where p.id = inv.created_by;
  why := public.invite_problem(inv);
  if why is null and inv.kind::text = 'review' then
    select t.plan into plan from public.trees t where t.id = inv.tree_id;
    if (select count(*) from public.tree_members m
        where m.tree_id = inv.tree_id and m.role = 'reviewer') >= public.reviewer_cap(plan) then
      why := 'full';
    end if;
  end if;
  return query select inv.kind, who, why is null, why, inv.branch_person_id;
end $$;

/**
 * Joins the tree an invite is for. A reviewer invite counts against the plan's reviewers.
 * Joining again is harmless and answers the same tree, even once the link has stopped. View
 * links do not make members.
 */
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

  select t.plan, t.owner_id into plan, owner from public.trees t where t.id = inv.tree_id;
  if inv.kind = 'review' and (
    select count(*) from public.tree_members where tree_id = inv.tree_id and role = 'reviewer'
  ) >= public.reviewer_cap(plan) then
    raise exception 'reviewer limit reached' using errcode = 'P0001';
  end if;

  insert into public.tree_members (tree_id, user_id, role, branch_person_id, scope_person_ids, invited_by)
  values (
    inv.tree_id,
    me,
    case inv.kind when 'review' then 'reviewer'::public.tree_role else 'contributor'::public.tree_role end,
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

/**
 * Opens a view link: answers where the visitors' copy is, or why it cannot be opened
 * ('stopped', 'expired', 'used-up', 'closed', 'not-ready'). Each opening counts as a use.
 */
create function public.open_view(token text) returns table (problem text, path text)
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites;
  tree public.trees;
  why text;
begin
  select * into inv from public.invites i
  where i.token_hash = public.hash_token(token) and i.kind::text = 'view' for update;
  if not found then return; end if;
  why := public.invite_problem(inv);
  if why is not null then return query select why, null::text; return; end if;
  select * into tree from public.trees t where t.id = inv.tree_id;
  if tree.view_slug is null then return query select 'closed', null::text; return; end if;
  if tree.view_path is null or split_part(tree.view_path, '/', 2) <> tree.view_slug then
    return query select 'not-ready', null::text;
    return;
  end if;
  update public.invites set use_count = use_count + 1 where id = inv.id;
  return query select null::text, tree.view_path;
end $$;

/**
 * Opens or closes the tree to view links. Opening again keeps the folder; `fresh` moves the
 * visitors' copy to a new folder, so anyone holding an old path loses it.
 */
create function public.set_view_open(tree uuid, open boolean, fresh boolean default false)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  slug text;
begin
  if public.my_role(tree) is distinct from 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.trees t
  set view_slug = case
        when not open then null
        when fresh or t.view_slug is null then replace(gen_random_uuid()::text, '-', '')
        else t.view_slug end,
      view_path = case when not open or fresh then null else t.view_path end
  where t.id = tree
  returning view_slug into slug;
  return slug;
end $$;

/** Points visitors at a copy just uploaded to the tree's view folder. */
create function public.publish_view(tree uuid, path text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  slug text;
begin
  if coalesce(public.my_role(tree)::text, '') not in ('owner', 'reviewer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select view_slug into slug from public.trees where id = tree;
  if slug is null then raise exception 'closed' using errcode = 'P0001'; end if;
  if path !~ ('^' || tree::text || '/' || slug || '/v[0-9]+\.json$') then
    raise exception 'bad path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'tree-views' and o.name = path) then
    raise exception 'file missing' using errcode = 'P0002';
  end if;
  update public.trees set view_path = path where id = tree;
end $$;

/**
 * The owner makes a member a reviewer (within the plan's seats) or a contributor again, and
 * sets the branches a reviewer covers; empty covers the whole tree.
 */
create function public.set_member_role(
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
  select role into was from public.tree_members where tree_id = tree and user_id = member for update;
  if was is null then raise exception 'not a member' using errcode = 'P0002'; end if;
  if was = 'owner' then raise exception 'not allowed' using errcode = '42501'; end if;

  if new_role = 'reviewer' and was <> 'reviewer' then
    select t.plan into plan from public.trees t where t.id = tree;
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

/**
 * Hands the tree to another member. The old owner stays on as a reviewer of the whole tree;
 * that seat is not counted against the plan, so a full plan never blocks a handover.
 */
create function public.transfer_ownership(tree uuid, member uuid) returns void
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
  update public.tree_members set role = 'owner', scope_person_ids = '{}', branch_person_id = null
  where tree_id = tree and user_id = member;
  update public.trees set owner_id = member, updated_at = now() where id = tree;
  perform public.add_notice(member, tree, 'owner_now', me);
end $$;

/**
 * Tells the owner, and every reviewer whose branches cover it, that additions arrived.
 * `anchor_path` is the father's line from the root, as person ids. A member may send at most
 * 30 a day per tree, so a link holder cannot flood the reviewers.
 */
create function public.notify_submission(tree uuid, anchor_path text[], n integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  m record;
begin
  if public.my_role(tree) is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if n not between 1 and 200 or coalesce(array_length(anchor_path, 1), 0) not between 1 and 200 then
    raise exception 'bad request' using errcode = '22023';
  end if;
  if (select count(distinct created_at) from public.notifications
      where tree_id = tree and actor_id = me and kind = 'submitted'
        and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many' using errcode = 'P0001';
  end if;
  for m in
    select user_id from public.tree_members
    where tree_id = tree and user_id <> me
      and (role = 'owner' or (role = 'reviewer'
        and (scope_person_ids = '{}' or scope_person_ids && anchor_path)))
  loop
    perform public.add_notice(m.user_id, tree, 'submitted', me, n, anchor_path[array_length(anchor_path, 1)]);
  end loop;
end $$;

/** Tells a member what became of their additions. Only the owner and reviewers send these. */
create function public.notify_member(
  tree uuid, member uuid, what public.notice_kind, n integer, at text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(tree)::text, '') not in ('owner', 'reviewer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if what not in ('approved', 'partly_approved', 'changes', 'rejected')
     or n not between 0 and 10000 or char_length(at) > 64 then
    raise exception 'bad request' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tree_members where tree_id = tree and user_id = member) then
    return;
  end if;
  perform public.add_notice(member, tree, what, auth.uid(), n, at);
end $$;

revoke execute on function public.add_notice, public.invite_problem, public.reviewer_cap,
  public.open_view, public.set_view_open, public.publish_view, public.set_member_role,
  public.transfer_ownership, public.notify_submission, public.notify_member, public.invite_preview
  from public, anon;
grant execute on function public.set_view_open, public.publish_view, public.set_member_role,
  public.transfer_ownership, public.notify_submission, public.notify_member, public.reviewer_cap
  to authenticated;
grant execute on function public.invite_preview, public.open_view to anon, authenticated;

-- ---------- Files ----------

-- A contributor may take back additions that nobody has reviewed yet.
create policy "members take back their additions" on storage.objects for delete
  to authenticated using (
    bucket_id = 'tree-files'
    and split_part(name, '/', 2) = 'submissions'
    and split_part(name, '/', 3) = auth.uid()::text
    and public.my_role_at(name) is not null
  );

/** The tree's current view folder, for the policies below. */
create function public.view_slug_at(path text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  head text := split_part(path, '/', 1);
begin
  if head !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return (select view_slug from public.trees where id = head::uuid);
end $$;
revoke execute on function public.view_slug_at from public, anon;
grant execute on function public.view_slug_at to authenticated;

-- Public bucket: a file is readable by anyone who knows its full path, and the path holds
-- the random folder. Nobody can list it. Paths: <tree id>/<view folder>/v<n>.json
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tree-views', 'tree-views', true, 5242880, array['application/json'])
on conflict (id) do nothing;

create policy "owner and reviewers publish the visitors' copy" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'tree-views'
    and split_part(name, '/', 2) = public.view_slug_at(name)
    and split_part(name, '/', 3) ~ '^v[0-9]+\.json$'
    and public.my_role_at(name) in ('owner', 'reviewer')
  );

-- Removing needs the old files to be visible to their writers.
create policy "owner and reviewers see the visitors' copies" on storage.objects for select
  to authenticated using (
    bucket_id = 'tree-views' and public.my_role_at(name) in ('owner', 'reviewer')
  );

create policy "owner and reviewers clear old visitors' copies" on storage.objects for delete
  to authenticated using (
    bucket_id = 'tree-views' and public.my_role_at(name) in ('owner', 'reviewer')
  );
