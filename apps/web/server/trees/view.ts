import 'server-only';
import { openTree, sealTree, visitorsCopy, type TreeFile } from '@sulalah/domain';
import { TREE_BUCKET, VIEW_BUCKET } from '@/lib/backend';
import { keptViewKey, treeKeyOf, viewKeyOf } from '@/server/keys/store';
import { treesAsServer, type TreesDb } from '@/server/trees/db';

/**
 * The visitors' copy, built on the server: the tree as last saved, filtered by its privacy
 * settings (visitorsCopy), sealed with a key only the server holds. Visitors get the
 * filtered tree from the server, never a key, and the bucket is private.
 */

/** Every file in the tree's view folders, old folders included. */
async function copiesOf(db: TreesDb, treeId: string) {
  const out: string[] = [];
  const { data: folders, error } = await db.storage.from(VIEW_BUCKET).list(treeId, { limit: 1000 });
  if (error) throw error;
  for (const f of folders ?? []) {
    const { data: files, error: e2 } = await db.storage
      .from(VIEW_BUCKET)
      .list(`${treeId}/${f.name}`, { limit: 1000 });
    if (e2) throw e2;
    for (const x of files ?? []) out.push(`${treeId}/${f.name}/${x.name}`);
  }
  return out;
}

async function removeCopies(db: TreesDb, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(VIEW_BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

/** Removes every visitors' copy of the tree, when it is closed to view links. */
export async function clearViewCopies(treeId: string, db: TreesDb = treesAsServer()) {
  await removeCopies(db, await copiesOf(db, treeId));
}

/**
 * Builds the visitors' copy from the tree's latest saved file and points view links at it,
 * then clears every older copy. Does nothing while the tree is closed to view links. Answers
 * the copy visitors now get.
 */
export async function publishViewCopy(treeId: string, db: TreesDb = treesAsServer()) {
  const { data: tree, error } = await db
    .from('trees')
    .select('file_path, file_version, view_slug')
    .eq('id', treeId)
    .maybeSingle();
  if (error) throw error;
  if (!tree?.view_slug || !tree.file_path) return null;
  const slug = tree.view_slug;
  const key = await treeKeyOf(treeId, db);
  if (!key) return null;
  const { data: blob, error: e2 } = await db.storage.from(TREE_BUCKET).download(tree.file_path);
  if (e2) throw e2;
  const file = await openTree(JSON.parse(await blob.text()), key);
  const sealed = await sealTree(visitorsCopy(file), await viewKeyOf(treeId, slug, db));

  const path = `${treeId}/${slug}/v${tree.file_version}.json`;
  // Overwrites a copy left in this folder from before, which may be sealed with another key.
  const { error: e3 } = await db.storage
    .from(VIEW_BUCKET)
    .upload(path, JSON.stringify(sealed), { contentType: 'application/json', upsert: true });
  if (e3) throw e3;
  const { data: current, error: e4 } = await db.rpc('publish_view', { tree: treeId, path });
  if (e4) {
    // Closed or moved while this copy was being built: the next save builds the right one.
    if (e4.code === 'P0001' || e4.code === '22023') return null;
    throw e4;
  }
  const old = (await copiesOf(db, treeId)).filter((p) => p !== current);
  if (old.length) await removeCopies(db, old);
  return current;
}

export type ViewProblem =
  'stopped' | 'expired' | 'used-up' | 'closed' | 'not-ready' | 'missing' | 'wrong-key';

/** What a visitor with a view link gets: the filtered copy, or why not. Counts as a use. */
export async function openViewCopy(
  token: string,
  db: TreesDb = treesAsServer(),
): Promise<{ file: TreeFile } | { problem: ViewProblem }> {
  const { data, error } = await db.rpc('open_view', { token });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return { problem: 'missing' };
  if (row.problem || !row.path || !row.tree_id)
    return { problem: (row.problem ?? 'not-ready') as ViewProblem };
  const slug = row.path.split('/')[1]!;
  const key = await keptViewKey(row.tree_id, slug, db);
  if (!key) return { problem: 'not-ready' };
  const { data: blob, error: e2 } = await db.storage.from(VIEW_BUCKET).download(row.path);
  if (e2) return { problem: 'not-ready' };
  try {
    return { file: await openTree(JSON.parse(await blob.text()), key) };
  } catch {
    return { problem: 'wrong-key' };
  }
}
