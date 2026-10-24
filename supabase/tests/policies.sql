-- Who may do what, checked against the real policies. Run with supabase/tests/run.sh.
-- Four people: Amal owns a tree, Badr reviews it, Chadi contributes, Dana is a stranger.
\set ON_ERROR_STOP 1
\set QUIET 1

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

/** Passes when the statement fails, optionally with a message containing `expect`. */
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

create function tests.as_user(name text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', case name
    when 'amal' then '00000000-0000-4000-8000-00000000000a'
    when 'badr' then '00000000-0000-4000-8000-00000000000b'
    when 'chadi' then '00000000-0000-4000-8000-00000000000c'
    when 'dana' then '00000000-0000-4000-8000-00000000000d'
    else '' end, false)
$$;
grant execute on all functions in schema tests to anon, authenticated;

create table tests.vars (k text primary key, v text);
grant all on tests.vars to anon, authenticated;

insert into auth.users (id, phone) values
  ('00000000-0000-4000-8000-00000000000a', '966500000001'),
  ('00000000-0000-4000-8000-00000000000b', '966500000002'),
  ('00000000-0000-4000-8000-00000000000c', '966500000003'),
  ('00000000-0000-4000-8000-00000000000d', '966500000004');

select tests.ok((select count(*) from public.profiles) = 4, 'every new account gets a profile');

-- ---------- Planting ----------

set role authenticated;
select tests.as_user('amal');
update public.profiles set first_name = 'أمل', father_name = 'سعد' where id = auth.uid();
select tests.fails($$ update public.profiles set is_platform_admin = true where id = auth.uid() $$,
  'nobody makes themselves a platform admin');
select tests.fails($$ insert into public.trees (owner_id) values (auth.uid()) $$,
  'trees are only planted through create_tree');

insert into tests.vars values ('tree', public.create_tree('extended')::text);
select tests.ok((select count(*) from public.trees) = 1, 'the owner sees the new tree');
select tests.ok((select plan from public.trees) = 'family', 'a chosen plan waits, the tree starts on family');
select tests.ok(public.my_role((select v from tests.vars where k = 'tree')::uuid) = 'owner',
  'the planter is the owner');

-- ---------- Saving the file ----------

insert into storage.objects (bucket_id, name, metadata)
select 'tree-files', v || '/tree/v1.json', '{"size": 1200}' from tests.vars where k = 'tree';
select tests.ok(public.save_tree_file(v::uuid, 0, v || '/tree/v1.json') = 1, 'the owner saves the first file')
from tests.vars where k = 'tree';
select tests.fails(format($$ select public.save_tree_file(%L, 0, %L) $$, v, v || '/tree/v1.json'),
  'a save made from an old version is refused', 'conflict')
from tests.vars where k = 'tree';
select tests.fails(format($$ select public.save_tree_file(%L, 1, %L) $$, v, v || '/tree/v9.json'),
  'the pointer must name the next version', 'bad path')
from tests.vars where k = 'tree';
select tests.fails(format($$ select public.save_tree_file(%L, 1, %L) $$, v, v || '/tree/v2.json'),
  'the pointer cannot name a file that was never uploaded', 'file missing')
from tests.vars where k = 'tree';
select tests.ok((select file_size from public.trees) = 1200, 'the tree records the file size');

-- Invites: one for a contributor under a branch, two for reviewers, one already expired.
insert into public.invites (tree_id, kind, token_hash, branch_person_id, expires_at, created_by)
select v::uuid, 'contribute', public.hash_token('tok-contribute'), 'p-saad', now() + interval '7 days', auth.uid()
from tests.vars where k = 'tree';
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
select v::uuid, 'review', public.hash_token('tok-review'), now() + interval '7 days', auth.uid()
from tests.vars where k = 'tree';
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
select v::uuid, 'contribute', public.hash_token('tok-old'), now() - interval '1 day', auth.uid()
from tests.vars where k = 'tree';
select tests.fails(format($$ insert into public.invites (tree_id, kind, token_hash, expires_at, created_by, use_count)
  values (%L, 'review', %L, now() + interval '1 day', auth.uid(), -5) $$, v, public.hash_token('x')),
  'an invite starts unused')
from tests.vars where k = 'tree';

-- ---------- A stranger ----------

select tests.as_user('dana');
select tests.ok((select count(*) from public.trees) = 0, 'a stranger sees no trees');
select tests.ok((select count(*) from public.tree_members) = 0, 'a stranger sees no members');
select tests.ok((select count(*) from public.invites) = 0, 'a stranger sees no invites');
select tests.ok((select count(*) from storage.objects) = 0, 'a stranger reads no tree files');
select tests.ok((select count(*) from public.profiles) = 1, 'a stranger sees only their own profile');
select tests.fails(format($$ insert into storage.objects (bucket_id, name) values ('tree-files', %L) $$,
  v || '/tree/v2.json'), 'a stranger cannot write the tree file')
from tests.vars where k = 'tree';
select tests.fails(format($$ select public.save_tree_file(%L, 1, %L) $$, v, v || '/tree/v2.json'),
  'a stranger cannot move the file pointer', 'not allowed')
from tests.vars where k = 'tree';
select tests.fails(format($$ insert into storage.objects (bucket_id, name) values ('tree-files', %L) $$,
  v || '/submissions/00000000-0000-4000-8000-00000000000d/s1.json'),
  'a stranger cannot send additions')
from tests.vars where k = 'tree';

-- ---------- Invite links ----------

reset role;
set role anon;
select tests.ok((select inviter from public.invite_preview('tok-contribute')) = 'أمل بن سعد',
  'an invite link shows who sent it before signing in');
select tests.ok((select valid from public.invite_preview('tok-old')) = false, 'an expired link says so');
select tests.ok((select count(*) from public.invite_preview('nonsense')) = 0, 'a made up link shows nothing');
select tests.fails($$ select public.accept_invite('tok-contribute') $$, 'joining needs an account');
reset role;

set role authenticated;
select tests.as_user('chadi');
select tests.fails($$ select public.accept_invite('tok-old') $$, 'an expired invite cannot be used', 'not valid');
select tests.ok(public.accept_invite('tok-contribute')::text = v, 'a contributor joins with the link')
from tests.vars where k = 'tree';
select tests.ok(public.accept_invite('tok-contribute')::text = v, 'joining twice is harmless')
from tests.vars where k = 'tree';
select tests.ok((select role from public.tree_members where user_id = auth.uid()) = 'contributor',
  'the contributor link makes a contributor');
select tests.ok((select branch_person_id from public.tree_members where user_id = auth.uid()) = 'p-saad',
  'the contributor lands on the branch the link names');
select tests.ok((select count(*) from storage.objects where name like '%/tree/%') = 1,
  'a contributor reads the tree file');
select tests.ok((select first_name from public.profiles where id = '00000000-0000-4000-8000-00000000000a') = 'أمل',
  'members see each other''s names');
select tests.ok((select count(*) from public.invites) = 0, 'a contributor does not see invite links');
select tests.fails($$ update public.tree_members set role = 'owner' where user_id = auth.uid() $$,
  'a contributor cannot promote themselves');
select tests.fails(format($$ insert into storage.objects (bucket_id, name) values ('tree-files', %L) $$,
  v || '/tree/v2.json'), 'a contributor cannot overwrite the tree')
from tests.vars where k = 'tree';
select tests.fails(format($$ select public.save_tree_file(%L, 1, %L) $$, v, v || '/tree/v2.json'),
  'a contributor cannot move the file pointer', 'not allowed')
from tests.vars where k = 'tree';
insert into storage.objects (bucket_id, name)
select 'tree-files', v || '/submissions/00000000-0000-4000-8000-00000000000c/s1.json' from tests.vars where k = 'tree';
select tests.ok(true, 'a contributor sends additions to their own folder');
select tests.fails(format($$ insert into storage.objects (bucket_id, name) values ('tree-files', %L) $$,
  v || '/submissions/00000000-0000-4000-8000-00000000000a/s1.json'),
  'a contributor cannot write in someone else''s folder')
from tests.vars where k = 'tree';

select tests.as_user('badr');
select tests.ok(public.accept_invite('tok-review')::text = v, 'a reviewer joins with the link')
from tests.vars where k = 'tree';
select tests.ok((select count(*) from storage.objects where name like '%/submissions/%') = 1,
  'a reviewer reads the additions waiting on review');
insert into storage.objects (bucket_id, name, metadata)
select 'tree-files', v || '/tree/v2.json', '{"size": 1300}' from tests.vars where k = 'tree';
select tests.ok(public.save_tree_file(v::uuid, 1, v || '/tree/v2.json') = 2, 'a reviewer saves approvals')
from tests.vars where k = 'tree';
select tests.ok((select count(*) from public.invites) = 0, 'a reviewer does not see invite links');

select tests.as_user('dana');
select tests.fails($$ select public.accept_invite('tok-review') $$,
  'the family plan holds one assistant reviewer', 'reviewer limit');

-- ---------- Membership changes ----------

select tests.as_user('amal');
update public.tree_members set scope_person_ids = '{p-saad}' where role = 'reviewer';
select tests.ok((select scope_person_ids from public.tree_members where role = 'reviewer') = '{p-saad}',
  'the owner narrows a reviewer to a branch');
delete from public.tree_members where role = 'owner';
select tests.ok((select count(*) from public.tree_members where role = 'owner') = 1, 'the owner cannot be removed');
update public.invites set revoked_at = now() where token_hash = public.hash_token('tok-contribute');
select tests.ok((select count(*) from public.invites where revoked_at is not null) = 1, 'the owner stops a link');
select tests.fails($$ insert into public.subscriptions (tree_id, plan, cycle, provider)
  select id, 'tribe', 'annual', 'me' from public.trees $$, 'nobody grants themselves a plan');
select tests.fails($$ update public.trees set plan = 'tribe' $$, 'the plan only changes through payment');
select tests.fails($$ update public.trees set file_version = 0 $$, 'the file pointer only moves through save_tree_file');

select tests.as_user('chadi');
update public.tree_members set scope_person_ids = '{}' where role = 'reviewer';
select tests.ok((select scope_person_ids from public.tree_members where role = 'reviewer') = '{p-saad}',
  'a contributor cannot change a reviewer''s scope');
delete from public.tree_members where user_id = auth.uid();
select tests.ok((select count(*) from public.trees) = 0, 'a contributor can leave, and then sees nothing');

select tests.as_user('amal');
delete from public.trees;
select tests.ok((select count(*) from public.trees) = 0, 'the owner deletes the tree');
reset role;
select tests.ok((select count(*) from public.tree_members) = 0, 'deleting a tree removes its members');

-- ---------- Tree keys ----------

reset role;
set role authenticated;
select tests.as_user('amal');
insert into tests.vars values ('tree2', public.create_tree()::text);
select public.set_tree_key(v::uuid, repeat('k', 43)) from tests.vars where k = 'tree2';
select tests.ok(public.tree_key(v::uuid) = repeat('k', 43), 'the owner gets the tree key back')
  from tests.vars where k = 'tree2';
select tests.fails(format($$ select public.set_tree_key(%L, %L) $$, v, repeat('x', 43)),
  'a tree key is set once', 'already set') from tests.vars where k = 'tree2';
select tests.fails($$ select key from public.tree_keys $$, 'nobody reads the keys table directly');

reset role;
insert into public.tree_members (tree_id, user_id, role)
select v::uuid, '00000000-0000-4000-8000-00000000000c', 'contributor' from tests.vars where k = 'tree2';
set role authenticated;
select tests.as_user('chadi');
select tests.ok(public.tree_key(v::uuid) = repeat('k', 43), 'a contributor gets the key after signing in')
  from tests.vars where k = 'tree2';

select tests.as_user('dana');
select tests.fails(format($$ select public.tree_key(%L) $$, v), 'a stranger gets no key', 'not a member')
  from tests.vars where k = 'tree2';
select tests.fails(format($$ select public.set_tree_key(%L, %L) $$, v, repeat('x', 43)),
  'a stranger cannot set a key', 'not allowed') from tests.vars where k = 'tree2';
