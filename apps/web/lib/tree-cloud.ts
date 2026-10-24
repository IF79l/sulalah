'use client';

import { openTree, sealTree, type TreeFile } from '@sulalah/domain';
import { TREE_BUCKET } from '@/lib/backend';
import { supabase } from '@/lib/supabase/client';
import type { PlanCode } from '@/lib/supabase/types';

/** Someone saved the tree after this device loaded it. */
export class SaveConflict extends Error {
  constructor() {
    super('conflict');
  }
}

const filePath = (treeId: string, version: number) => `${treeId}/tree/v${version}.json`;

/** The tree's latest sealed file, opened with the device's key. */
export async function loadTreeFile(
  treeId: string,
  key: string,
): Promise<{ file: TreeFile; version: number } | null> {
  const db = supabase();
  const { data: tree, error } = await db
    .from('trees')
    .select('file_path, file_version')
    .eq('id', treeId)
    .maybeSingle();
  if (error) throw error;
  if (!tree?.file_path) return null;
  const { data: blob, error: e2 } = await db.storage.from(TREE_BUCKET).download(tree.file_path);
  if (e2) throw e2;
  const file = await openTree(JSON.parse(await blob.text()), key);
  return { file, version: tree.file_version };
}

/**
 * Seals and uploads the next version, then moves the tree's pointer to it. The pointer only
 * moves if nobody saved in between; otherwise this throws SaveConflict and nothing changes.
 */
export async function saveTreeFile(
  treeId: string,
  fromVersion: number,
  file: TreeFile,
  key: string,
) {
  const db = supabase();
  const path = filePath(treeId, fromVersion + 1);
  const sealed = JSON.stringify(
    await sealTree({ ...file, updatedAt: new Date().toISOString() }, key),
  );
  const { error } = await db.storage
    .from(TREE_BUCKET)
    .upload(path, sealed, { contentType: 'application/json', upsert: false });
  // The same version already uploaded means another device got there first.
  if (error) throw /exist|duplicate|409/i.test(error.message) ? new SaveConflict() : error;
  const { data, error: e2 } = await db.rpc('save_tree_file', {
    tree: treeId,
    from_version: fromVersion,
    path,
  });
  if (e2) throw e2.code === '40001' || /conflict/.test(e2.message) ? new SaveConflict() : e2;
  return data;
}

/** Plants a tree: a bare record on the server, then its first sealed file. Answers its id. */
export async function plantTree(
  requested: PlanCode,
  build: (treeId: string) => TreeFile,
  key: string,
): Promise<string> {
  const db = supabase();
  const { data: treeId, error } = await db.rpc('create_tree', { requested });
  if (error || !treeId) throw error ?? new Error('no tree');
  await saveTreeFile(treeId, 0, build(treeId), key);
  return treeId;
}
