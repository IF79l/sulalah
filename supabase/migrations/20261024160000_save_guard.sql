-- Every save of a tree file now goes through the app's server, which opens the file being
-- replaced and the one it is given and checks the change before anything is stored: the
-- plan's cap on names (from `plans`), a plan that lapsed, and the branches a reviewer covers
-- (packages/domain/src/guard.ts). The browser can no longer write the tree file or move its
-- pointer itself. Contributors still send their additions straight to storage, unless the
-- tree's plan has lapsed.
--
-- Safe to run more than once.

-- ---------- Whether a tree's plan lapsed ----------

/**
 * A tree whose subscription expired or was canceled. It stays readable; nothing new goes in
 * until the owner subscribes again. A tree that never had a subscription is not paused: until
 * payments open, plans are given by hand.
 */
create or replace function public.tree_paused(tree uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.tree_id = tree and s.status in ('expired', 'canceled')
  )
$$;

/** Same, for a storage path whose first folder is the tree id. Bad paths answer false. */
create or replace function public.tree_paused_at(path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  head text := split_part(path, '/', 1);
begin
  if head !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.tree_paused(head::uuid);
end $$;

revoke execute on function public.tree_paused, public.tree_paused_at from public, anon;
grant execute on function public.tree_paused, public.tree_paused_at to authenticated, service_role;

-- ---------- Saving goes through the server ----------

/**
 * Points the tree at a file the server just checked and uploaded, if the tree is still on the
 * version the change was made from. Answers the new version, or raises 'conflict'. Only the
 * server, with the secret key, may call it.
 */
create or replace function public.commit_tree_file(tree uuid, from_version integer, path text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  new_version integer;
  size integer;
begin
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

revoke execute on function public.commit_tree_file from public, anon, authenticated;
grant execute on function public.commit_tree_file to service_role;

-- The old way in, straight from the browser, is closed.
revoke execute on function public.save_tree_file from public, anon, authenticated;
drop policy if exists "owner and reviewers save the tree" on storage.objects;

-- ---------- Contributors' additions ----------

drop policy if exists "members send additions" on storage.objects;
create policy "members send additions" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'tree-files'
    and split_part(name, '/', 2) = 'submissions'
    and split_part(name, '/', 3) = auth.uid()::text
    and split_part(name, '/', 4) ~ '^[A-Za-z0-9_-]{1,64}\.json$'
    and public.my_role_at(name) is not null
    and not public.tree_paused_at(name)
  );

-- Tell the API about the new functions straight away.
notify pgrst, 'reload schema';
