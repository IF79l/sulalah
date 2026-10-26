import 'server-only';
import {
  checkSave,
  defaultPlanLimits,
  openTree,
  saveProblemText,
  sealedSchema,
  type SaveProblem,
  type TreeFile,
} from '@sulalah/domain';
import { TREE_BUCKET } from '@/lib/backend';
import { treeKeyOf } from '@/server/keys/store';
import { treesAsServer } from '@/server/trees/db';

export type SaveResult =
  | { ok: true; version: number }
  | {
      ok: false;
      status: number;
      code: SaveProblem | 'conflict' | 'bad_file' | 'no_tree';
      message: string;
    };

const refuse = (status: number, code: Exclude<SaveResult, { ok: true }>['code'], message: string) =>
  ({ ok: false, status, code, message }) as const;

/**
 * Saves the next version of a tree for `userId`, after checking the change against the file
 * it replaces: who they are in the tree, the plan's cap on names, whether the plan lapsed, and
 * a reviewer's branches. The sealed file is stored as it came; the server opens it only to
 * check it, with the tree's key unwrapped by server/keys/store.ts.
 */
export async function saveChecked(
  treeId: string,
  userId: string,
  fromVersion: number,
  sealed: unknown,
): Promise<SaveResult> {
  const db = treesAsServer();
  const [member, tree, sub] = await Promise.all([
    db
      .from('tree_members')
      .select('role, scope_person_ids')
      .eq('tree_id', treeId)
      .eq('user_id', userId)
      .maybeSingle(),
    db.from('trees').select('plan, file_version, file_path').eq('id', treeId).maybeSingle(),
    db.from('subscriptions').select('status').eq('tree_id', treeId).maybeSingle(),
  ]);
  for (const r of [member, tree, sub]) if (r.error) throw r.error;
  if (!tree.data) return refuse(404, 'no_tree', 'الشجرة غير موجودة');
  if (!member.data || member.data.role === 'contributor')
    return refuse(403, 'not_allowed', saveProblemText.not_allowed);
  if (tree.data.file_version !== fromVersion) return refuse(409, 'conflict', 'أحد حفظ الشجرة قبلك');
  // Unwrapped only for members, so strangers cannot run up calls to the key service.
  const key = await treeKeyOf(treeId, db);
  if (!key) return refuse(404, 'no_tree', 'الشجرة غير موجودة');

  const parsed = sealedSchema.safeParse(sealed);
  if (!parsed.success || parsed.data.treeId !== treeId)
    return refuse(400, 'bad_file', 'ملف الشجرة غير صالح');
  let after: TreeFile;
  try {
    after = await openTree(parsed.data, key);
  } catch {
    return refuse(400, 'bad_file', 'ملف الشجرة غير صالح');
  }
  if (after.tree.id !== treeId) return refuse(400, 'bad_file', 'ملف الشجرة غير صالح');

  let before: TreeFile | null = null;
  if (tree.data.file_path) {
    const { data: blob, error } = await db.storage.from(TREE_BUCKET).download(tree.data.file_path);
    if (error) throw error;
    before = await openTree(JSON.parse(await blob.text()), key);
  }

  const { data: plan, error: planError } = await db
    .from('plans')
    .select('max_persons')
    .eq('id', tree.data.plan)
    .maybeSingle();
  if (planError) throw planError;
  const problem = checkSave(before, after, {
    role: member.data.role,
    userId,
    scope: member.data.scope_person_ids ?? [],
    maxPersons: plan?.max_persons ?? defaultPlanLimits[tree.data.plan].maxPersons,
    paused: sub.data?.status === 'expired' || sub.data?.status === 'canceled',
  });
  if (problem) return refuse(403, problem, saveProblemText[problem]);

  const path = `${treeId}/tree/v${fromVersion + 1}.json`;
  const { error: upError } = await db.storage
    .from(TREE_BUCKET)
    .upload(path, JSON.stringify(parsed.data), { contentType: 'application/json', upsert: false });
  if (upError) {
    if (/exist|duplicate|409/i.test(upError.message))
      return refuse(409, 'conflict', 'أحد حفظ الشجرة قبلك');
    throw upError;
  }
  const { data: version, error: e2 } = await db.rpc('commit_tree_file', {
    tree: treeId,
    from_version: fromVersion,
    path,
  });
  if (e2) {
    if (e2.code === '40001' || /conflict/.test(e2.message))
      return refuse(409, 'conflict', 'أحد حفظ الشجرة قبلك');
    throw e2;
  }
  return { ok: true, version: version as number };
}
