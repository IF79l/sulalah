-- Working on a tree together: invite and view links, notifications, roles and the handover.
-- Amal owns a tree, Badr reviews Saad's branch, Chadi contributes, Dana is a stranger,
-- Eid joins later.
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
    when 'eid' then '00000000-0000-4000-8000-00000000000e'
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

insert into auth.users (id) select tests.id(n) from unnest(array['amal', 'badr', 'chadi', 'dana', 'eid']) n;
update public.profiles set first_name = 'أمل', father_name = 'سعد' where id = tests.id('amal');
update public.profiles set first_name = 'بدر' where id = tests.id('badr');

set role authenticated;
select tests.as_user('amal');
insert into tests.vars values ('tree', public.create_tree()::text);
reset role;
insert into public.tree_keys (tree_id, key) values (tests.v('tree')::uuid, 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk');
set role authenticated;
insert into public.invites (tree_id, kind, token_hash, branch_person_id, expires_at, created_by, token_sealed)
values (tests.v('tree')::uuid, 'contribute', public.hash_token('tok-c'), 'p-saad', now() + interval '7 days',
  auth.uid(), 'sealed-token');
insert into public.invites (tree_id, kind, token_hash, branch_person_id, expires_at, created_by)
values (tests.v('tree')::uuid, 'review', public.hash_token('tok-r'), 'p-saad', now() + interval '7 days', auth.uid());
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
values (tests.v('tree')::uuid, 'review', public.hash_token('tok-r2'), now() + interval '7 days', auth.uid());
insert into public.invites (tree_id, kind, token_hash, expires_at, created_by)
values (tests.v('tree')::uuid, 'view', public.hash_token('tok-v'), now() + interval '7 days', auth.uid());
insert into public.invites (tree_id, kind, token_hash, expires_at, max_uses, created_by)
values (tests.v('tree')::uuid, 'contribute', public.hash_token('tok-once'), now() + interval '7 days', 1, auth.uid());
select tests.ok((select token_sealed from public.invites where token_hash = public.hash_token('tok-c')) = 'sealed-token',
  'the owner keeps the sealed token to copy the link again');

-- ---------- Invite links ----------

reset role;
set role anon;
select tests.ok((select problem from public.invite_preview('tok-c')) is null, 'a fresh link has no problem');
select tests.ok((select branch from public.invite_preview('tok-c')) = 'p-saad', 'the preview names the branch');
select tests.ok((select kind::text from public.invite_preview('tok-v')) = 'view', 'view links preview too');
reset role;

set role authenticated;
select tests.as_user('chadi');
select tests.fails($$ select public.accept_invite('tok-v') $$, 'a view link does not make a member', 'not valid');
select tests.ok(public.accept_invite('tok-c')::text = tests.v('tree'), 'a contributor joins');
select tests.ok((select branch_root from public.tree_members where user_id = auth.uid()) = 'p-saad',
  'a contributor keeps the branch their link was for');
update public.tree_members set branch_person_id = 'p-saad-son' where user_id = auth.uid();
select tests.ok((select branch_person_id from public.tree_members where user_id = auth.uid()) = 'p-saad-son',
  'and may pick their own place inside it');
select tests.fails($$ update public.tree_members set branch_root = null where user_id = auth.uid() $$,
  'but cannot lift the branch the link was for', 'permission denied');
select tests.as_user('badr');
select tests.ok(public.accept_invite('tok-r')::text = tests.v('tree'), 'a reviewer joins');
select tests.ok((select scope_person_ids from public.tree_members where user_id = auth.uid()) = '{p-saad}',
  'the reviewer covers the branch the link names');
select tests.as_user('dana');
reset role;
set role anon;
select tests.ok((select problem from public.invite_preview('tok-r2')) = 'full',
  'a reviewer link says the seats are full before anyone signs in');
reset role;
set role authenticated;
select tests.as_user('dana');
select tests.fails($$ select public.accept_invite('tok-r2') $$, 'the family plan holds one reviewer', 'reviewer limit');
select tests.ok(public.accept_invite('tok-once')::text = tests.v('tree'), 'a one-use link works once');
select tests.ok(public.accept_invite('tok-once')::text = tests.v('tree'),
  'a member opening a used link again still lands in the tree');
delete from public.tree_members where user_id = auth.uid();
select tests.fails($$ select public.accept_invite('tok-once') $$, 'and nobody new gets in on it', 'not valid');
reset role;
set role anon;
select tests.ok((select problem from public.invite_preview('tok-once')) = 'used-up', 'a used link says so');
reset role;
set role authenticated;

select tests.as_user('amal');
select tests.ok((select count(*) from public.notifications where kind = 'joined') = 3,
  'the owner hears of everyone who joined');
select tests.ok((select string_agg(actor_id::text, ',' order by created_at) from public.notifications)
  like '%' || tests.id('chadi') || '%', 'a join names who joined');

-- ---------- Notifications ----------

select tests.as_user('dana');
select tests.ok((select count(*) from public.notifications) = 0, 'a person sees only their own notifications');
select tests.fails(format($$ select public.notify_submission(%L, '{p-root,p-saad}', 2) $$, tests.v('tree')),
  'a stranger cannot notify a tree', 'not allowed');

select tests.as_user('chadi');
select public.notify_submission(tests.v('tree')::uuid, '{p-root,p-saad,p-chadi}', 2);
select tests.fails(format($$ select public.notify_submission(%L, '{p-root}', 0) $$, tests.v('tree')),
  'a submission notice counts at least one', 'bad request');
select tests.fails(format($$ select public.notify_member(%L, %L, 'approved', 2) $$, tests.v('tree'), tests.id('chadi')),
  'a contributor cannot send review results', 'not allowed');
select tests.fails($$ insert into public.notifications (user_id, tree_id, kind) select user_id, tree_id, 'approved'
  from public.tree_members limit 1 $$, 'nobody writes notifications directly');

select tests.as_user('badr');
select tests.ok((select count(*) from public.notifications where kind = 'submitted') = 1,
  'a reviewer hears of additions inside their branch');
select tests.ok((select ref from public.notifications where kind = 'submitted') = 'p-chadi',
  'the notice points at the father');
select tests.ok((select count from public.notifications where kind = 'submitted') = 2, 'and says how many');
select public.notify_member(tests.v('tree')::uuid, tests.id('chadi'), 'partly_approved', 1, 'p-chadi');
select tests.fails(format($$ select public.notify_member(%L, %L, 'owner_now', 1) $$, tests.v('tree'), tests.id('chadi')),
  'review results are only review kinds', 'bad request');

select tests.as_user('amal');
select tests.ok((select count(*) from public.notifications where kind = 'submitted') = 1, 'the owner hears of them too');
update public.notifications set read_at = now() where kind = 'submitted';
select tests.ok((select read_at is not null from public.notifications where kind = 'submitted'), 'notices are marked read');
select tests.fails($$ update public.notifications set kind = 'approved' $$, 'only the read mark changes');

-- A reviewer of another branch hears nothing about Saad's.
select tests.as_user('chadi');
select tests.ok((select kind::text from public.notifications) = 'partly_approved',
  'the contributor hears what became of their additions');

-- ---------- Roles ----------

select tests.as_user('badr');
select tests.fails(format($$ select public.set_member_role(%L, %L, 'reviewer') $$, tests.v('tree'), tests.id('chadi')),
  'only the owner changes roles', 'not allowed');

select tests.as_user('amal');
select tests.fails(format($$ select public.set_member_role(%L, %L, 'reviewer') $$, tests.v('tree'), tests.id('chadi')),
  'a full plan takes no more reviewers', 'reviewer limit');
select public.set_member_role(tests.v('tree')::uuid, tests.id('badr'), 'reviewer', '{p-saad,p-fahd}');
select tests.ok((select scope_person_ids from public.tree_members where user_id = tests.id('badr')) = '{p-saad,p-fahd}',
  'the owner widens a reviewer''s branches without using a seat');
select public.set_member_role(tests.v('tree')::uuid, tests.id('badr'), 'contributor');
select tests.ok((select role::text || array_length(scope_person_ids, 1) is null
  from public.tree_members where user_id = tests.id('badr')) = true, 'a reviewer goes back to contributing');
select public.set_member_role(tests.v('tree')::uuid, tests.id('chadi'), 'reviewer');
select tests.ok(public.my_role(tests.v('tree')::uuid) = 'owner', 'the owner stays owner');
select tests.fails(format($$ select public.set_member_role(%L, %L, 'owner') $$, tests.v('tree'), tests.id('chadi')),
  'nobody is made owner by a role change', 'transfer_ownership');
select tests.fails(format($$ select public.set_member_role(%L, %L, 'contributor') $$, tests.v('tree'), tests.id('amal')),
  'the owner cannot demote themselves', 'not allowed');
select tests.fails(format($$ select public.set_member_role(%L, %L, 'reviewer') $$, tests.v('tree'), tests.id('dana')),
  'a stranger cannot be given a role', 'not a member');

select tests.as_user('chadi');
select tests.ok((select count(*) from public.notifications where kind = 'made_reviewer') = 1,
  'a new reviewer hears of it');

-- ---------- View links ----------

-- Only the server opens view links now; it hands visitors the filtered tree, never a key.
select tests.as_user('amal');
reset role;
set role anon;
select tests.fails($$ select * from public.open_view('tok-v') $$, 'a visitor cannot ask the database for the copy directly');
reset role;
set role service_role;
select tests.ok((select problem from public.open_view('tok-v')) = 'closed', 'a closed tree answers view links with closed');
select tests.ok((select count(*) from public.open_view('nonsense')) = 0, 'a made up view link shows nothing');
reset role;
set role authenticated;
select tests.as_user('chadi');
select tests.fails(format($$ select public.set_view_open(%L, true) $$, tests.v('tree')),
  'only the owner opens the tree to links', 'not allowed');
select tests.as_user('amal');
insert into tests.vars values ('slug', public.set_view_open(tests.v('tree')::uuid, true));
select tests.ok(tests.v('slug') ~ '^[0-9a-f]{32}$', 'opening makes a random folder');
select tests.ok(public.set_view_open(tests.v('tree')::uuid, true) = tests.v('slug'), 'opening again keeps it');
reset role;
set role service_role;
select tests.ok((select problem from public.open_view('tok-v')) = 'not-ready', 'before a copy is published it says so');
reset role;
set role authenticated;

select tests.as_user('chadi');
select tests.fails(format($$ insert into storage.objects (bucket_id, name) values ('tree-views', %L) $$,
  tests.v('tree') || '/' || tests.v('slug') || '/v1.json'), 'even a reviewer cannot upload the visitors'' copy now');
select tests.fails(format($$ select public.publish_view(%L, %L) $$, tests.v('tree'), tests.v('tree') || '/' || tests.v('slug') || '/v1.json'),
  'nor point visitors at one');
select tests.fails(format($$ select * from public.claim_view_key(%L, %L, 'w', 'local:k1') $$, tests.v('tree'), tests.v('slug')),
  'nor set the copy''s key');
select tests.as_user('amal');
select tests.fails(format($$ select public.publish_view(%L, %L) $$, tests.v('tree'), tests.v('tree') || '/' || tests.v('slug') || '/v1.json'),
  'nor the owner');

reset role;
set role service_role;
insert into storage.objects (bucket_id, name) values ('tree-views', tests.v('tree') || '/' || tests.v('slug') || '/v1.json');
insert into storage.objects (bucket_id, name) values ('tree-views', tests.v('tree') || '/' || tests.v('slug') || '/v3.json');
select tests.fails(format($$ select public.publish_view(%L, %L) $$, tests.v('tree'), tests.v('tree') || '/' || tests.v('slug') || '/v2.json'),
  'only an uploaded copy is published', 'file missing');
select tests.fails(format($$ select public.publish_view(%L, %L) $$, tests.v('tree'), tests.v('tree') || '/0123456789abcdef0123456789abcdef/v1.json'),
  'a copy only goes in the current folder', 'bad path');
select tests.ok(public.publish_view(tests.v('tree')::uuid, tests.v('tree') || '/' || tests.v('slug') || '/v3.json')
  = tests.v('tree') || '/' || tests.v('slug') || '/v3.json', 'the server points visitors at the copy');
select tests.ok(public.publish_view(tests.v('tree')::uuid, tests.v('tree') || '/' || tests.v('slug') || '/v1.json')
  = tests.v('tree') || '/' || tests.v('slug') || '/v3.json', 'an older copy finishing late does not replace a newer one');
select tests.ok((select view_key_wrapped from public.claim_view_key(tests.v('tree')::uuid, tests.v('slug'), 'first', 'local:k1')) = 'first',
  'the first key claimed for a folder is kept');
select tests.ok((select view_key_wrapped from public.claim_view_key(tests.v('tree')::uuid, tests.v('slug'), 'second', 'local:k1')) = 'first',
  'a second copy built at once gets the same key');
select tests.fails(format($$ select * from public.claim_view_key(%L, 'nope', 'w', 'local:k1') $$, tests.v('tree')),
  'no key for a folder that is not current', 'closed');
select tests.ok((select path from public.open_view('tok-v')) = tests.v('tree') || '/' || tests.v('slug') || '/v3.json',
  'a visitor with the link finds the copy');
select tests.ok((select tree_id from public.open_view('tok-v')) = tests.v('tree')::uuid, 'and its tree');
reset role;
set role anon;
select tests.fails($$ select view_key_wrapped from public.tree_keys $$, 'nobody reads the keys table directly');
reset role;
set role authenticated;
select tests.fails($$ select view_key_wrapped from public.tree_keys $$, 'not even a member');
reset role;
select tests.ok((select use_count from public.invites where token_hash = public.hash_token('tok-v')) = 2,
  'each opening counts');
select tests.ok((select public from storage.buckets where id = 'tree-views') = false, 'the copies are not public');
set role authenticated;

select tests.as_user('amal');
select tests.ok(public.set_view_open(tests.v('tree')::uuid, true, true) <> tests.v('slug'),
  'stopping a link moves the copy to a new folder');
reset role;
select tests.ok((select view_key_wrapped from public.tree_keys where tree_id = tests.v('tree')::uuid) is null,
  'and forgets the old folder''s key');
set role service_role;
select tests.ok((select problem from public.open_view('tok-v')) = 'not-ready', 'and the old path is gone');
reset role;
set role authenticated;
select tests.as_user('amal');
select public.set_view_open(tests.v('tree')::uuid, false);
reset role;
set role service_role;
select tests.ok((select problem from public.open_view('tok-v')) = 'closed', 'closing the tree closes every view link');
reset role;
set role authenticated;

-- ---------- Taking additions back ----------

select tests.as_user('badr');
insert into storage.objects (bucket_id, name)
values ('tree-files', tests.v('tree') || '/submissions/' || tests.id('badr') || '/s1.json');
select tests.as_user('chadi');
delete from storage.objects where name like '%/submissions/' || tests.id('badr') || '/%';
select tests.as_user('badr');
select tests.ok((select count(*) from storage.objects where name like '%/submissions/%') = 1,
  'nobody takes back someone else''s additions');
delete from storage.objects where name like '%/submissions/' || tests.id('badr') || '/%';
select tests.ok((select count(*) from storage.objects where name like '%/submissions/%') = 0,
  'a contributor takes back their own');

-- ---------- Handing the tree over ----------

select tests.as_user('chadi');
select tests.fails(format($$ select public.transfer_ownership(%L, %L) $$, tests.v('tree'), tests.id('chadi')),
  'only the owner hands the tree over', 'not allowed');
-- Amal pays with her card; the card must not follow the tree to its new owner.
reset role;
insert into public.payment_methods (owner_id, provider, token) values (tests.id('amal'), 'sandbox', 'tok-card');
insert into public.subscriptions (tree_id, plan, status, cycle, period_start, period_end, provider, payment_method_id)
select tests.v('tree')::uuid, 'family', 'active', 'monthly', now(), now() + interval '20 days', 'sandbox', id
from public.payment_methods where token = 'tok-card';
set role authenticated;
select tests.as_user('amal');
select tests.fails(format($$ select public.transfer_ownership(%L, %L) $$, tests.v('tree'), tests.id('dana')),
  'the tree goes only to a member', 'not a member');
select public.transfer_ownership(tests.v('tree')::uuid, tests.id('badr'));
reset role;
select tests.ok((select payment_method_id from public.subscriptions where tree_id = tests.v('tree')::uuid) is null,
  'the old owner''s card no longer renews a tree that is not theirs');
select tests.ok((select status from public.subscriptions where tree_id = tests.v('tree')::uuid) = 'active',
  'the plan runs on to the end of what was paid');
set role authenticated;
select tests.as_user('amal');
select tests.ok(public.my_role(tests.v('tree')::uuid) = 'reviewer', 'the old owner stays on as a reviewer');
select tests.ok((select owner_id from public.trees) = tests.id('badr'), 'the tree records its new owner');
select tests.fails(format($$ select public.set_view_open(%L, true) $$, tests.v('tree')),
  'the old owner no longer manages the tree', 'not allowed');
select tests.as_user('badr');
select tests.ok(public.my_role(tests.v('tree')::uuid) = 'owner', 'the new owner owns it');
select tests.ok((select count(*) from public.notifications where kind = 'owner_now') = 1, 'and is told');
select tests.ok((select count(*) from public.invites) = 5, 'and sees the invite links');
