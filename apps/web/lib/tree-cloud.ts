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

/** The server would not take the change: outside the person's branch, or past the plan. */
export class SaveRefused extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Seals the next version and hands it to the server, which checks the change before storing
 * it and moving the tree's pointer. The pointer only moves if nobody saved in between;
 * otherwise this throws SaveConflict and nothing changes.
 */
export async function saveTreeFile(
  treeId: string,
  fromVersion: number,
  file: TreeFile,
  key: string,
): Promise<number> {
  const sealed = await sealTree({ ...file, updatedAt: new Date().toISOString() }, key);
  const res = await fetch(`/api/trees/${treeId}/file`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from: fromVersion, sealed }),
    cache: 'no-store',
  });
  if (res.ok) return ((await res.json()) as { version: number }).version;
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code: string; message: string };
  };
  if (res.status === 409) throw new SaveConflict();
  // Refused, or a file the server will never take: trying the same change again cannot help.
  if ((res.status === 403 || res.status === 400) && body.error)
    throw new SaveRefused(body.error.code, body.error.message);
  throw new Error(body.error?.code ?? `save failed (${res.status})`);
}

/** Plants a tree: a bare record and its key on the server, then its first sealed file. */
export async function plantTree(
  requested: PlanCode,
  build: (treeId: string) => TreeFile,
  key: string,
): Promise<string> {
  const db = supabase();
  const { data: treeId, error } = await db.rpc('create_tree', { requested });
  if (error || !treeId) throw error ?? new Error('no tree');
  try {
    const { error: e2 } = await db.rpc('set_tree_key', { tree: treeId, new_key: key });
    if (e2) throw e2;
    await saveTreeFile(treeId, 0, build(treeId), key);
  } catch (e) {
    // A tree that never got its first file is of no use: take the empty record back, so a
    // second try does not leave a trail of empty trees counting against the owner's ten.
    await db.from('trees').delete().eq('id', treeId);
    throw e;
  }
  return treeId;
}
