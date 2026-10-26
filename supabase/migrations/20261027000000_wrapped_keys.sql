-- Tree keys are wrapped with a key that never enters the database (envelope encryption).
-- The wrapping key lives in a key service (or, on staging, in the server's settings), so a copy
-- of the database alone opens no tree. Only the server unwraps a key, after checking who asks;
-- the browser gets it from /api/trees/<id>/key, no longer from a database function.
--
-- The visitors' copy is built, sealed and opened by the server too. Its key is random per
-- view folder, wrapped the same way, and never leaves the server: a visitor gets the filtered
-- tree, not a key, and the bucket is no longer public.

-- ---------- Tree keys ----------

alter table public.tree_keys
  -- The wrapped key, as the key service returned it.
  add column if not exists wrapped_key text,
  -- Which wrapping key sealed it, e.g. 'local:k1' or 'gcp:projects/.../cryptoKeys/trees'.
  add column if not exists kek_id text,
  add column if not exists wrapped_at timestamptz,
  -- The visitors' copy: its key, wrapped, and the view folder it belongs to.
  add column if not exists view_key_wrapped text,
  add column if not exists view_kek_id text,
  add column if not exists view_key_slug text;

-- Keys from before this change stay readable until the server wraps them (on first use, or
-- all at once from the admin page). After that the plain column is always empty.
alter table public.tree_keys alter column key drop not null;
alter table public.tree_keys drop constraint if exists tree_keys_one_form;
alter table public.tree_keys add constraint tree_keys_one_form check (
  (key is null) <> (wrapped_key is null) and (wrapped_key is null) = (kek_id is null)
);
alter table public.tree_keys drop constraint if exists tree_keys_view_whole;
alter table public.tree_keys add constraint tree_keys_view_whole check (
  (view_key_wrapped is null) = (view_kek_id is null)
  and (view_key_wrapped is null) = (view_key_slug is null)
);

-- The old copies were sealed with a key the browser derived; the server builds new ones.
alter table public.tree_keys drop column if exists view_key;
update public.trees set view_path = null where view_path is not null;

-- Nobody but the server reads or writes keys. Members and strangers alike lose the functions.
drop function if exists public.tree_key(uuid);
drop function if exists public.set_tree_key(uuid, text);
revoke all on public.tree_keys from anon, authenticated;
grant select, insert, update on public.tree_keys to service_role;

-- ---------- The visitors' copy ----------

/**
 * Opens a view link for the server: where the visitors' copy is, or why it cannot be opened
 * ('stopped', 'expired', 'used-up', 'closed', 'not-ready'). Each opening counts as a use.
 * The server then reads the copy and its wrapped key itself.
 */
drop function if exists public.open_view(text);
create function public.open_view(token text) returns table (problem text, tree_id uuid, path text)
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
  if why is not null then return query select why, null::uuid, null::text; return; end if;
  select * into tree from public.trees t where t.id = inv.tree_id;
  if tree.view_slug is null then return query select 'closed', null::uuid, null::text; return; end if;
  if tree.view_path is null or split_part(tree.view_path, '/', 2) <> tree.view_slug then
    return query select 'not-ready', null::uuid, null::text;
    return;
  end if;
  update public.invites set use_count = use_count + 1 where id = inv.id;
  return query select null::text, tree.id, tree.view_path;
end $$;

revoke execute on function public.open_view from public, anon, authenticated;
grant execute on function public.open_view to service_role;

/**
 * Opens or closes the tree to view links (the owner only). Opening again keeps the folder;
 * `fresh` moves the copy to a new folder, so anyone holding an old path loses it. Closing or
 * moving forgets the copy's key; the next copy gets a new one.
 */
create or replace function public.set_view_open(tree uuid, open boolean, fresh boolean default false)
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
  update public.tree_keys k
  set view_key_wrapped = null, view_kek_id = null, view_key_slug = null
  where k.tree_id = tree and k.view_key_slug is distinct from slug;
  return slug;
end $$;

/**
 * The key of the copy in view folder `slug`: the one already kept for that folder, or else
 * `wrapped` (made by the server just now). Two copies built at once end up with one key.
 */
create or replace function public.claim_view_key(tree uuid, slug text, wrapped text, kek text)
returns table (view_key_wrapped text, view_kek_id text)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.trees t where t.id = tree and t.view_slug = slug) then
    raise exception 'closed' using errcode = 'P0001';
  end if;
  update public.tree_keys k
  set view_key_wrapped = wrapped, view_kek_id = kek, view_key_slug = slug
  where k.tree_id = tree and k.view_key_slug is distinct from slug;
  return query
    select k.view_key_wrapped, k.view_kek_id from public.tree_keys k
    where k.tree_id = tree and k.view_key_slug = slug;
end $$;

/**
 * Points view links at a copy the server just uploaded. Only ever forward: a copy built from
 * an older version, finishing late, does not replace a newer one. Answers the copy visitors
 * now get, so the server can clear every other.
 */
drop function if exists public.publish_view(uuid, text, text);
drop function if exists public.publish_view(uuid, text);
create function public.publish_view(tree uuid, path text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  slug text;
  current text;
  version_of constant text := '^.*/v([0-9]+)\.json$';
begin
  select view_slug, view_path into slug, current from public.trees where id = tree for update;
  if slug is null then raise exception 'closed' using errcode = 'P0001'; end if;
  if path !~ ('^' || tree::text || '/' || slug || '/v[0-9]+\.json$') then
    raise exception 'bad path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'tree-views' and o.name = path) then
    raise exception 'file missing' using errcode = 'P0002';
  end if;
  if current is null
    or split_part(current, '/', 2) <> slug
    or substring(path from version_of)::integer >= substring(current from version_of)::integer
  then
    update public.trees set view_path = path where id = tree;
    current := path;
  end if;
  return current;
end $$;

revoke execute on function public.claim_view_key, public.publish_view from public, anon, authenticated;
grant execute on function public.claim_view_key, public.publish_view to service_role;

-- The bucket is private now: only the server writes copies and reads them for visitors.
-- Owners and reviewers keep seeing and clearing them, for deleting a tree.
update storage.buckets set public = false where id = 'tree-views';
drop policy if exists "owner and reviewers publish the visitors' copy" on storage.objects;

-- Tell the API about the new functions straight away.
notify pgrst, 'reload schema';
