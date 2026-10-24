-- The whole database of سُلالة (decided with Faisal, 2026-10-23).
--
-- It holds accounts, trees as bare records, who belongs to which tree, invites, and billing.
-- It never holds a family member's name or a relation: those live in one tree file per tree,
-- sealed on the family's devices (packages/domain/src/treefile.ts) and kept in the private
-- `tree-files` bucket. The server only ever sees ciphertext.
--
-- Every table has row level security on. Writes that need checks across tables go through
-- the security definer functions at the end, never straight into the tables.

-- ---------- Types ----------

create type public.tree_role as enum ('owner', 'reviewer', 'contributor');
create type public.plan_id as enum ('family', 'extended', 'tribe');
create type public.invite_kind as enum ('contribute', 'review');
create type public.subscription_status as enum ('pending', 'active', 'expired', 'canceled');
create type public.billing_cycle as enum ('monthly', 'annual');

-- ---------- Accounts ----------

/**
 * One row per signed in person, made by the trigger below when they first verify a code.
 * First and father's name only: a family name can reveal tribal origin, which PDPL treats as
 * sensitive, so it lives only in the sealed tree files.
 */
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 40),
  father_name text not null default '' check (char_length(father_name) <= 40),
  notify text not null default 'app' check (notify in ('app', 'sms')),
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Trees ----------

/**
 * A tree as the server knows it: who owns it, its plan, and where its sealed file is.
 * No title, no family name, no people.
 */
create table public.trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  plan public.plan_id not null default 'family',
  /** The plan the owner chose when planting; activated by hand until payments arrive. */
  requested_plan public.plan_id,
  /** Bumped on every save; a save only lands on the version it was made from. */
  file_version integer not null default 0 check (file_version >= 0),
  /** Path inside the `tree-files` bucket, null until the first file is saved. */
  file_path text,
  file_size integer check (file_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trees_owner_idx on public.trees (owner_id);

/**
 * Who belongs to a tree and as what. The owner has a row too, so one lookup answers every
 * permission question. Person ids here are the opaque ids from inside the tree file.
 */
create table public.tree_members (
  tree_id uuid not null references public.trees (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.tree_role not null,
  /** A contributor's own place in the tree, once they pick it. */
  branch_person_id text check (char_length(branch_person_id) <= 64),
  /** Branches a reviewer covers; empty means the whole tree. */
  scope_person_ids text[] not null default '{}',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (tree_id, user_id)
);

create unique index tree_members_one_owner on public.tree_members (tree_id) where role = 'owner';
create index tree_members_user_idx on public.tree_members (user_id);

/** Invite links. Only the token's hash is stored; the token lives in the link alone. */
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  kind public.invite_kind not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  /** The branch a contributor joins under, or a reviewer covers; null means any. */
  branch_person_id text check (char_length(branch_person_id) <= 64),
  max_uses integer check (max_uses > 0),
  use_count integer not null default 0,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index invites_tree_idx on public.invites (tree_id);

-- ---------- Billing ----------

/** Written only by the payment webhook with the service key. */
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees (id) on delete cascade,
  plan public.plan_id not null,
  status public.subscription_status not null default 'pending',
  cycle public.billing_cycle not null,
  period_end timestamptz,
  provider text not null,
  created_at timestamptz not null default now()
);

create index subscriptions_tree_idx on public.subscriptions (tree_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  amount_halalas integer not null check (amount_halalas >= 0),
  currency text not null default 'SAR',
  /** Unique so a replayed webhook can never pay twice. */
  provider_payment_id text not null unique,
  status text not null,
  created_at timestamptz not null default now()
);

-- ---------- Who may see what ----------

/** The caller's role in a tree, or null. Security definer so policies do not recurse. */
create function public.my_role(tree uuid) returns public.tree_role
language sql stable security definer set search_path = '' as $$
  select role from public.tree_members where tree_id = tree and user_id = auth.uid()
$$;

/** Same, for a storage path whose first folder is the tree id. Bad paths answer null. */
create function public.my_role_at(path text) returns public.tree_role
language plpgsql stable security definer set search_path = '' as $$
declare
  head text := split_part(path, '/', 1);
begin
  if head !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return public.my_role(head::uuid);
end $$;

/** Whether the caller shares a tree with this person, so they may see each other's names. */
create function public.shares_tree_with(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.tree_members a
    join public.tree_members b on b.tree_id = a.tree_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

alter table public.profiles enable row level security;
alter table public.trees enable row level security;
alter table public.tree_members enable row level security;
alter table public.invites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;

create policy "see own and fellow members' names" on public.profiles for select
  to authenticated using (id = auth.uid() or public.shares_tree_with(id));
create policy "edit own profile" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members see their trees" on public.trees for select
  to authenticated using (public.my_role(id) is not null);
create policy "owner deletes the tree" on public.trees for delete
  to authenticated using (owner_id = auth.uid());

create policy "members see each other" on public.tree_members for select
  to authenticated using (public.my_role(tree_id) is not null);
create policy "owner changes members" on public.tree_members for update
  to authenticated
  using (public.my_role(tree_id) = 'owner' and role <> 'owner')
  with check (role <> 'owner');
create policy "owner removes members, members leave" on public.tree_members for delete
  to authenticated
  using (role <> 'owner' and (public.my_role(tree_id) = 'owner' or user_id = auth.uid()));
create policy "contributor picks their branch" on public.tree_members for update
  to authenticated
  using (user_id = auth.uid() and role = 'contributor')
  with check (user_id = auth.uid() and role = 'contributor');

create policy "owner sees invites" on public.invites for select
  to authenticated using (public.my_role(tree_id) = 'owner');
create policy "owner makes invites" on public.invites for insert
  to authenticated
  with check (public.my_role(tree_id) = 'owner' and created_by = auth.uid() and use_count = 0);
create policy "owner stops invites" on public.invites for update
  to authenticated using (public.my_role(tree_id) = 'owner')
  with check (public.my_role(tree_id) = 'owner');

create policy "owner sees billing" on public.subscriptions for select
  to authenticated using (public.my_role(tree_id) = 'owner');
create policy "owner sees invoices" on public.invoices for select
  to authenticated using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and public.my_role(s.tree_id) = 'owner'
    )
  );

-- Columns a person may change on their own rows; everything else is fixed by the functions.
revoke update on public.profiles from authenticated;
grant update (first_name, father_name, notify, updated_at) on public.profiles to authenticated;
revoke update on public.tree_members from authenticated;
grant update (branch_person_id, scope_person_ids) on public.tree_members to authenticated;
revoke update on public.invites from authenticated;
grant update (revoked_at) on public.invites to authenticated;
revoke insert, update on public.trees from authenticated;
revoke insert on public.tree_members from authenticated;
revoke all on public.subscriptions, public.invoices from anon, authenticated;
grant select on public.subscriptions, public.invoices to authenticated;
revoke all on public.profiles, public.trees, public.tree_members, public.invites from anon;

-- ---------- Actions ----------

/** Plants a tree: the caller becomes its owner. The file is saved next with save_tree_file. */
create function public.create_tree(requested public.plan_id default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  tree uuid;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if (select count(*) from public.trees where owner_id = me) >= 10 then
    raise exception 'tree limit reached' using errcode = 'P0001';
  end if;
  insert into public.trees (owner_id, requested_plan) values (me, requested) returning id into tree;
  insert into public.tree_members (tree_id, user_id, role) values (tree, me, 'owner');
  return tree;
end $$;

/**
 * Points the tree at a file just uploaded, if the tree is still on the version the change was
 * made from. Answers the new version, or raises 'conflict' when someone saved first.
 */
create function public.save_tree_file(tree uuid, from_version integer, path text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  new_version integer;
  size integer;
begin
  if coalesce(public.my_role(tree)::text, '') not in ('owner', 'reviewer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if path <> tree::text || '/tree/v' || (from_version + 1) || '.json' then
    raise exception 'bad path' using errcode = '22023';
  end if;
  select (o.metadata ->> 'size')::integer into size
  from storage.objects o where o.bucket_id = 'tree-files' and o.name = path;
  if not found then raise exception 'file missing' using errcode = 'P0002'; end if;

  update public.trees
  set file_version = from_version + 1, file_path = path, file_size = size, updated_at = now()
  where id = tree and file_version = from_version
  returning file_version into new_version;
  if new_version is null then raise exception 'conflict' using errcode = '40001'; end if;
  return new_version;
end $$;

create function public.hash_token(token text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(token, 'UTF8')), 'hex')
$$;

/** What an invite link shows before joining: who sent it and whether it still works. */
create function public.invite_preview(token text)
returns table (kind public.invite_kind, inviter text, valid boolean)
language sql stable security definer set search_path = '' as $$
  select
    i.kind,
    trim(p.first_name || case when p.father_name <> '' then ' بن ' || p.father_name else '' end),
    i.revoked_at is null and i.expires_at > now() and (i.max_uses is null or i.use_count < i.max_uses)
  from public.invites i
  join public.profiles p on p.id = i.created_by
  where i.token_hash = public.hash_token(token)
$$;

/**
 * Joins the tree an invite is for. A reviewer invite counts against the plan's reviewers.
 * Joining again is harmless and answers the same tree.
 */
create function public.accept_invite(token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv public.invites;
  plan public.plan_id;
  reviewers integer;
  cap integer;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into inv from public.invites where token_hash = public.hash_token(token) for update;
  if not found or inv.revoked_at is not null or inv.expires_at <= now()
     or (inv.max_uses is not null and inv.use_count >= inv.max_uses) then
    raise exception 'invite not valid' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.tree_members where tree_id = inv.tree_id and user_id = me) then
    return inv.tree_id;
  end if;

  if inv.kind = 'review' then
    select t.plan into plan from public.trees t where t.id = inv.tree_id;
    cap := case plan when 'family' then 1 when 'extended' then 5 else 20 end;
    select count(*) into reviewers
    from public.tree_members where tree_id = inv.tree_id and role = 'reviewer';
    if reviewers >= cap then raise exception 'reviewer limit reached' using errcode = 'P0001'; end if;
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
  return inv.tree_id;
end $$;

revoke execute on function public.create_tree, public.save_tree_file, public.accept_invite,
  public.my_role, public.my_role_at, public.shares_tree_with, public.handle_new_user
  from public, anon;
grant execute on function public.create_tree, public.save_tree_file, public.accept_invite,
  public.my_role, public.my_role_at, public.shares_tree_with to authenticated;
grant execute on function public.invite_preview to anon, authenticated;

-- ---------- The tree files ----------

-- Private bucket. Paths:
--   <tree id>/tree/v<n>.json                     the tree, written by the owner and reviewers
--   <tree id>/submissions/<user id>/<name>.json  a contributor's additions, waiting on review
-- Files are never overwritten: each save is a new version, so history comes for free.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tree-files', 'tree-files', false, 5242880, array['application/json'])
on conflict (id) do nothing;

create policy "members read the tree" on storage.objects for select
  to authenticated using (
    bucket_id = 'tree-files'
    and (
      (split_part(name, '/', 2) = 'tree' and public.my_role_at(name) is not null)
      or (
        split_part(name, '/', 2) = 'submissions'
        and (
          public.my_role_at(name) in ('owner', 'reviewer')
          or split_part(name, '/', 3) = auth.uid()::text
        )
      )
    )
  );

create policy "owner and reviewers save the tree" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'tree-files'
    and split_part(name, '/', 2) = 'tree'
    and split_part(name, '/', 3) ~ '^v[0-9]+\.json$'
    and public.my_role_at(name) in ('owner', 'reviewer')
  );

create policy "members send additions" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'tree-files'
    and split_part(name, '/', 2) = 'submissions'
    and split_part(name, '/', 3) = auth.uid()::text
    and split_part(name, '/', 4) ~ '^[A-Za-z0-9_-]{1,64}\.json$'
    and public.my_role_at(name) is not null
  );

create policy "owner clears old files" on storage.objects for delete
  to authenticated using (bucket_id = 'tree-files' and public.my_role_at(name) = 'owner');
