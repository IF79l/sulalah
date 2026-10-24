-- The platform keeps each tree's key (Faisal, 2026-10-24). Signing in with the code sent to
-- the registered number is the only check, on any device, and the platform can restore a
-- tree when a family loses access. Tree files stay sealed in storage and the tables still
-- hold no names; the key sits apart, readable only through tree_key() by the tree's members.
-- This replaces the passkey tables from 20261024010000_keys.sql.

drop table if exists public.member_keys;
drop table if exists public.user_keys;

/** One key per tree. No policies: nobody reads this table except the functions below. */
create table public.tree_keys (
  tree_id uuid primary key references public.trees (id) on delete cascade,
  key text not null check (key ~ '^[A-Za-z0-9_-]{43}$'),
  created_at timestamptz not null default now()
);

alter table public.tree_keys enable row level security;
revoke all on public.tree_keys from anon, authenticated;

/** The tree's key, for its members only. */
create function public.tree_key(tree uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  found text;
begin
  if public.my_role(tree) is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  select key into found from public.tree_keys where tree_id = tree;
  return found;
end $$;

/** Stores the key of a tree just planted. Only its owner, and only once. */
create function public.set_tree_key(tree uuid, new_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(tree)::text, '') <> 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.tree_keys (tree_id, key) values (tree, new_key) on conflict do nothing;
  if not found then
    raise exception 'key already set' using errcode = '23505';
  end if;
end $$;

revoke execute on function public.tree_key, public.set_tree_key from public, anon;
grant execute on function public.tree_key, public.set_tree_key to authenticated;

-- Tell the API about the new functions straight away.
notify pgrst, 'reload schema';
