'use client';

/**
 * Everything a real tree shares between its members beyond the tree file itself: invite and
 * view links, members and their roles, contributors' submission files, notifications and the
 * visitors' copy. The server sees ids, counts and ciphertext; names stay sealed.
 */
import {
  openSubmission,
  openText,
  openTree,
  randomToken,
  sealSubmission,
  sealText,
  sealTree,
  sha256Hex,
  submissionPath,
  viewKeyFor,
  visitorsCopy,
  type SubmissionFile,
  type TreeFile,
} from '@sulalah/domain';
import { TREE_BUCKET, VIEW_BUCKET, supabaseUrl } from '@/lib/backend';
import { supabase } from '@/lib/supabase/client';
import type { InviteKind, NoticeKind, TreeRole } from '@/lib/supabase/types';

const fullName = (p?: { first_name: string; father_name: string } | null) =>
  p ? [p.first_name, p.father_name && `بن ${p.father_name}`].filter(Boolean).join(' ') : '';

/** The signed in account's id, or null. */
export async function myUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase().auth.getSession();
  return session?.user.id ?? null;
}

// ---------- Links ----------

export type LinkStatus = 'active' | 'expired' | 'stopped' | 'used-up';

export interface Link {
  id: string;
  kind: InviteKind;
  /** The branch a contributor joins under or a reviewer covers; null means the whole tree. */
  branch: string | null;
  used: number;
  maxUses?: number;
  expiresAt: string;
  status: LinkStatus;
  /** The full link, rebuilt from its sealed token; missing if this device cannot open it. */
  url?: string;
}

const tokenContext = (treeId: string) => `invite-token:${treeId}`;

async function linkUrl(treeId: string, key: string, kind: InviteKind, token: string) {
  const origin = window.location.origin;
  return kind === 'view'
    ? `${origin}/view/${token}#${await viewKeyFor(key, treeId)}`
    : `${origin}/invite/${token}#${key}`;
}

export async function listLinks(treeId: string, key: string): Promise<Link[]> {
  const { data, error } = await supabase()
    .from('invites')
    .select('*')
    .eq('tree_id', treeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return Promise.all(
    data.map(async (r): Promise<Link> => {
      let url: string | undefined;
      if (r.token_sealed)
        try {
          url = await linkUrl(treeId, key, r.kind, await openText(r.token_sealed, key, tokenContext(treeId)));
        } catch {
          url = undefined;
        }
      return {
        id: r.id,
        kind: r.kind,
        branch: r.branch_person_id,
        used: r.use_count,
        maxUses: r.max_uses ?? undefined,
        expiresAt: r.expires_at,
        status: r.revoked_at
          ? 'stopped'
          : Date.parse(r.expires_at) <= now
            ? 'expired'
            : r.max_uses && r.use_count >= r.max_uses
              ? 'used-up'
              : 'active',
        url,
      };
    }),
  );
}

/**
 * Makes a link. The token goes in the link and, sealed with the tree key, in the database so
 * the owner can copy the link again; the database matches visitors by the token's hash.
 */
export async function makeLink(
  treeId: string,
  key: string,
  opts: { kind: InviteKind; branch?: string | null; maxUses?: number; days: number },
): Promise<Link> {
  const db = supabase();
  const me = await myUserId();
  if (!me) throw new Error('signed out');
  if (opts.kind === 'view') {
    const { error } = await db.rpc('set_view_open', { tree: treeId, open: true });
    if (error) throw error;
  }
  const token = randomToken();
  const expiresAt = new Date(Date.now() + opts.days * 86_400_000).toISOString();
  const { data, error } = await db
    .from('invites')
    .insert({
      tree_id: treeId,
      kind: opts.kind,
      token_hash: await sha256Hex(token),
      token_sealed: await sealText(token, key, tokenContext(treeId)),
      branch_person_id: opts.branch ?? null,
      max_uses: opts.maxUses ?? null,
      expires_at: expiresAt,
      created_by: me,
    })
    .select('id')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    kind: opts.kind,
    branch: opts.branch ?? null,
    used: 0,
    maxUses: opts.maxUses,
    expiresAt,
    status: 'active',
    url: await linkUrl(treeId, key, opts.kind, token),
  };
}

/**
 * Stops a link at once. Stopping a view link also moves the visitors' copy to a new folder,
 * so whoever opened it before cannot keep reading it; the next save publishes it there.
 */
export async function stopLink(treeId: string, link: Link) {
  const db = supabase();
  const { error } = await db
    .from('invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', link.id);
  if (error) throw error;
  if (link.kind === 'view') {
    const { error: e2 } = await db.rpc('set_view_open', { tree: treeId, open: true, fresh: true });
    if (e2) throw e2;
  }
}

/** What an invite link says before joining. */
export async function previewInvite(token: string) {
  const { data, error } = await supabase().rpc('invite_preview', { token });
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Joins with an invite and keeps nothing but the membership; answers the tree id. */
export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase().rpc('accept_invite', { token });
  if (error) throw error;
  return data;
}

// ---------- Members ----------

export interface Member {
  userId: string;
  name: string;
  role: TreeRole;
  branch: string | null;
  scope: string[];
  joinedAt: string;
}

export async function listMembers(treeId: string): Promise<Member[]> {
  const { data, error } = await supabase()
    .from('tree_members')
    .select(
      'user_id, role, branch_person_id, scope_person_ids, created_at, profile:profiles!tree_members_user_id_fkey(first_name, father_name)',
    )
    .eq('tree_id', treeId)
    .order('created_at');
  if (error) throw error;
  type Row = {
    user_id: string;
    role: TreeRole;
    branch_person_id: string | null;
    scope_person_ids: string[];
    created_at: string;
    profile: { first_name: string; father_name: string } | null;
  };
  return (data as unknown as Row[]).map((r) => ({
    userId: r.user_id,
    name: fullName(r.profile) || 'فرد من العائلة',
    role: r.role,
    branch: r.branch_person_id,
    scope: r.scope_person_ids,
    joinedAt: r.created_at,
  }));
}

export async function setMemberRole(
  treeId: string,
  userId: string,
  role: Exclude<TreeRole, 'owner'>,
  scope: string[] = [],
) {
  const { error } = await supabase().rpc('set_member_role', {
    tree: treeId,
    member: userId,
    new_role: role,
    scope,
  });
  if (error) throw error;
}

export async function removeMember(treeId: string, userId: string) {
  const { error } = await supabase()
    .from('tree_members')
    .delete()
    .eq('tree_id', treeId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function transferTree(treeId: string, userId: string) {
  const { error } = await supabase().rpc('transfer_ownership', { tree: treeId, member: userId });
  if (error) throw error;
}

/** A contributor's own place in the tree. */
export async function setMyBranch(treeId: string, personId: string) {
  const me = await myUserId();
  if (!me) throw new Error('signed out');
  const { error } = await supabase()
    .from('tree_members')
    .update({ branch_person_id: personId })
    .eq('tree_id', treeId)
    .eq('user_id', me);
  if (error) throw error;
}

async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const store = supabase().storage.from(bucket);
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await store.list(dir, { limit: 1000, offset });
      if (error) throw error;
      for (const e of data) {
        // Folders come back without an id.
        if (e.id) out.push(`${dir}/${e.name}`);
        else await walk(`${dir}/${e.name}`);
      }
      if (data.length < 1000) break;
    }
  };
  await walk(prefix);
  return out;
}

async function removeAll(bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase().storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

/** Deletes the tree for good: every file and copy first, then the record and its members. */
export async function deleteTree(treeId: string) {
  await removeAll(TREE_BUCKET, await listAll(TREE_BUCKET, treeId));
  await removeAll(VIEW_BUCKET, await listAll(VIEW_BUCKET, treeId));
  const { error } = await supabase().from('trees').delete().eq('id', treeId);
  if (error) throw error;
}

export async function leaveTree(treeId: string) {
  const me = await myUserId();
  if (!me) throw new Error('signed out');
  await removeMember(treeId, me);
}

// ---------- Submissions ----------

const wrap = (sealed: string) =>
  JSON.stringify({ format: 'sulalah-submission-sealed', version: 1, data: sealed });
const unwrap = (text: string) => {
  const v = JSON.parse(text) as { format?: string; data?: string };
  if (v.format !== 'sulalah-submission-sealed' || typeof v.data !== 'string')
    throw new Error('not a submission');
  return v.data;
};

/** Sends a contributor's additions as a sealed file in their own folder. */
export async function sendSubmission(treeId: string, key: string, sub: SubmissionFile) {
  const me = await myUserId();
  if (!me) throw new Error('signed out');
  const { error } = await supabase()
    .storage.from(TREE_BUCKET)
    .upload(submissionPath(treeId, me, sub.id), wrap(await sealSubmission(sub, key, me)), {
      contentType: 'application/json',
      upsert: false,
    });
  if (error) throw error;
}

/** Takes back additions nobody has reviewed yet. */
export async function withdrawSubmission(treeId: string, id: string) {
  const me = await myUserId();
  if (!me) throw new Error('signed out');
  await removeAll(TREE_BUCKET, [submissionPath(treeId, me, id)]);
}

export interface Incoming {
  by: string;
  sub: SubmissionFile;
}

const fileId = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');

/**
 * Submission files waiting in the tree's folder. Files whose ids are in `known` are not
 * downloaded again. `present` lists every submission id that still has a file, so ones a
 * contributor took back can be taken out of the tree file. With `onlyMine`, reads just the
 * signed in person's folder.
 */
export async function loadSubmissions(
  treeId: string,
  key: string,
  known: Set<string>,
  onlyMine?: boolean,
): Promise<{ incoming: Incoming[]; present: Map<string, string>; unreadable: number }> {
  const me = onlyMine ? await myUserId() : null;
  const paths = await listAll(
    TREE_BUCKET,
    onlyMine ? `${treeId}/submissions/${me}` : `${treeId}/submissions`,
  );
  const present = new Map<string, string>();
  const incoming: Incoming[] = [];
  let unreadable = 0;
  for (const path of paths) {
    const by = path.split('/')[2]!;
    const id = fileId(path);
    present.set(id, path);
    if (known.has(id)) continue;
    try {
      const { data, error } = await supabase().storage.from(TREE_BUCKET).download(path);
      if (error) throw error;
      incoming.push({ by, sub: await openSubmission(unwrap(await data.text()), key, treeId, by, id) });
    } catch {
      unreadable++;
    }
  }
  return { incoming, present, unreadable };
}

/** Clears submission files whose fate is already written in the tree file (owner only). */
export async function clearSubmissionFiles(paths: string[]) {
  if (paths.length) await removeAll(TREE_BUCKET, paths);
}

// ---------- Notifications ----------

export interface Notice {
  id: string;
  treeId: string;
  kind: NoticeKind;
  actor: string;
  count: number;
  ref: string | null;
  read: boolean;
  at: string;
}

export async function listNotices(limit = 50): Promise<Notice[]> {
  const { data, error } = await supabase()
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(first_name, father_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  type Row = {
    id: string;
    tree_id: string;
    kind: NoticeKind;
    count: number;
    ref: string | null;
    read_at: string | null;
    created_at: string;
    actor: { first_name: string; father_name: string } | null;
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    treeId: r.tree_id,
    kind: r.kind,
    actor: fullName(r.actor) || 'فرد من العائلة',
    count: r.count,
    ref: r.ref,
    read: !!r.read_at,
    at: r.created_at,
  }));
}

export async function unreadNotices(): Promise<number> {
  const { count, error } = await supabase()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNoticesRead(ids?: string[]) {
  let q = supabase().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids) q = q.in('id', ids);
  const { error } = await q;
  if (error) throw error;
}

/** Tells the owner and the reviewers covering `path` (root → father) that additions arrived. */
export async function notifySubmission(treeId: string, path: string[], n: number) {
  const { error } = await supabase().rpc('notify_submission', { tree: treeId, anchor_path: path, n });
  if (error) throw error;
}

export async function notifyMember(
  treeId: string,
  member: string,
  what: Extract<NoticeKind, 'approved' | 'partly_approved' | 'changes' | 'rejected'>,
  n: number,
  at?: string,
) {
  const { error } = await supabase().rpc('notify_member', {
    tree: treeId,
    member,
    what,
    n,
    at: at ?? null,
  });
  if (error) throw error;
}

// ---------- The visitors' copy ----------

/** Opens or closes the tree to view links; answers the copy's folder, or null when closed. */
export async function setViewOpen(treeId: string, open: boolean): Promise<string | null> {
  const db = supabase();
  if (!open) {
    await removeAll(VIEW_BUCKET, await listAll(VIEW_BUCKET, treeId));
  }
  const { data, error } = await db.rpc('set_view_open', { tree: treeId, open });
  if (error) throw error;
  return data;
}

export async function viewFolder(treeId: string): Promise<string | null> {
  const { data, error } = await supabase()
    .from('trees')
    .select('view_slug')
    .eq('id', treeId)
    .maybeSingle();
  if (error) throw error;
  return data?.view_slug ?? null;
}

/**
 * Seals the visitors' copy of `file` with the view key and points view links at it, then
 * clears older copies. Does nothing while the tree is closed to view links.
 */
export async function publishView(treeId: string, key: string, file: TreeFile, version: number) {
  const slug = await viewFolder(treeId);
  if (!slug) return;
  const db = supabase();
  const path = `${treeId}/${slug}/v${version}.json`;
  const sealed = JSON.stringify(await sealTree(visitorsCopy(file), await viewKeyFor(key, treeId)));
  const { error } = await db.storage
    .from(VIEW_BUCKET)
    .upload(path, sealed, { contentType: 'application/json', upsert: false, cacheControl: '60' });
  if (error && !/exist|duplicate|409/i.test(error.message)) throw error;
  const { error: e2 } = await db.rpc('publish_view', { tree: treeId, path });
  if (e2) throw e2;
  const old = (await listAll(VIEW_BUCKET, treeId)).filter((p) => p !== path);
  if (old.length) await removeAll(VIEW_BUCKET, old);
}

export type ViewProblem = 'stopped' | 'expired' | 'used-up' | 'closed' | 'not-ready' | 'missing' | 'wrong-key';

/** What a visitor with a view link gets: the filtered copy, or why not. */
export async function openViewLink(
  token: string,
  viewKey: string,
): Promise<{ file: TreeFile } | { problem: ViewProblem }> {
  const { data, error } = await supabase().rpc('open_view', { token });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return { problem: 'missing' };
  if (row.problem || !row.path) return { problem: (row.problem ?? 'not-ready') as ViewProblem };
  const res = await fetch(`${supabaseUrl}/storage/v1/object/public/${VIEW_BUCKET}/${row.path}`);
  if (!res.ok) return { problem: 'not-ready' };
  try {
    return { file: await openTree(await res.json(), viewKey) };
  } catch {
    return { problem: 'wrong-key' };
  }
}
