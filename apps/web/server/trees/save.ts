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
import { createClient } from '@supabase/supabase-js';
import { TREE_BUCKET, supabaseUrl } from '@/lib/backend';
import type { PlanCode, TreeRole } from '@/lib/supabase/types';

type Rel = never[];
type ReadOnly<Row> = { Row: Row; Insert: never; Update: never; Relationships: Rel };

/** The few tables and functions a save touches, as the server sees them with the secret key. */
type SaveDatabase = {
  public: {
    Tables: {
      trees: ReadOnly<{ id: string; plan: PlanCode; file_version: number; file_path: string | null }>;
      tree_members: ReadOnly<{
        tree_id: string;
        user_id: string;
        role: TreeRole;
        scope_person_ids: string[];
      }>;
      tree_keys: ReadOnly<{ tree_id: string; key: string }>;
      plans: ReadOnly<{ id: PlanCode; max_persons: number }>;
      subscriptions: ReadOnly<{ tree_id: string; status: string }>;
    };
    Views: Record<never, never>;
    Functions: {
      commit_tree_file: {
        Args: { tree: string; from_version: number; path: string };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

function asServer() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return createClient<SaveDatabase>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; status: number; code: SaveProblem | 'conflict' | 'bad_file' | 'no_tree'; message: string };

const refuse = (status: number, code: Exclude<SaveResult, { ok: true }>['code'], message: string) =>
  ({ ok: false, status, code, message }) as const;

/**
 * Saves the next version of a tree for `userId`, after checking the change against the file
 * it replaces: who they are in the tree, the plan's cap on names, whether the plan lapsed, and
 * a reviewer's branches. The sealed file is stored as it came; the server opens it only to
 * check it, with the key it keeps for the tree.
 */
export async function saveChecked(
  treeId: string,
  userId: string,
  fromVersion: number,
  sealed: unknown,
): Promise<SaveResult> {
  const db = asServer();
  const [member, tree, keyRow, sub] = await Promise.all([
    db
      .from('tree_members')
      .select('role, scope_person_ids')
      .eq('tree_id', treeId)
      .eq('user_id', userId)
      .maybeSingle(),
    db.from('trees').select('plan, file_version, file_path').eq('id', treeId).maybeSingle(),
    db.from('tree_keys').select('key').eq('tree_id', treeId).maybeSingle(),
    db.from('subscriptions').select('status').eq('tree_id', treeId).maybeSingle(),
  ]);
  for (const r of [member, tree, keyRow, sub]) if (r.error) throw r.error;
  if (!tree.data || !keyRow.data) return refuse(404, 'no_tree', 'الشجرة غير موجودة');
  if (!member.data || member.data.role === 'contributor')
    return refuse(403, 'not_allowed', saveProblemText.not_allowed);
  if (tree.data.file_version !== fromVersion)
    return refuse(409, 'conflict', 'أحد حفظ الشجرة قبلك');

  const parsed = sealedSchema.safeParse(sealed);
  if (!parsed.success || parsed.data.treeId !== treeId)
    return refuse(400, 'bad_file', 'ملف الشجرة غير صالح');
  const key = keyRow.data.key;
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
