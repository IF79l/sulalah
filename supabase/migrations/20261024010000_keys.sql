-- Unlocking trees without codes. A person's account key is sealed by their passkey (WebAuthn
-- PRF) and each tree key is sealed by the account key, all on their device. The server keeps
-- only the sealed copies, so it still cannot read a family's names.

/** One row per passkey a person has set up. */
create table public.user_keys (
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null check (char_length(credential_id) <= 512),
  /** The account key sealed with this passkey's PRF secret. */
  wrapped_account_key text not null check (char_length(wrapped_account_key) <= 512),
  created_at timestamptz not null default now(),
  primary key (user_id, credential_id)
);

/** A member's copy of a tree key, sealed with their account key. Gone when they leave. */
create table public.member_keys (
  tree_id uuid not null,
  user_id uuid not null,
  wrapped_key text not null check (char_length(wrapped_key) <= 512),
  updated_at timestamptz not null default now(),
  primary key (tree_id, user_id),
  foreign key (tree_id, user_id) references public.tree_members (tree_id, user_id) on delete cascade
);

alter table public.user_keys enable row level security;
alter table public.member_keys enable row level security;

create policy "own passkeys" on public.user_keys for all
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tree keys" on public.member_keys for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.my_role(tree_id) is not null);

revoke all on public.user_keys, public.member_keys from anon;
revoke update on public.user_keys from authenticated;
