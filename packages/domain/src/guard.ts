/**
 * What one save of a tree file may change. Every save goes through the server, which opens
 * the file being replaced and the one it is given, and asks `checkSave` whether the person
 * saving may make that change: the plan's cap on names, a plan that has lapsed, and the
 * branches a reviewer covers. The screens ask the same questions before offering a button,
 * but only this check decides.
 */
import { treeProblem } from './input';
import type { TreeRole } from './permissions';
import {
  defaultTreeSettings,
  type TreeFile,
  type TreeFilePerson,
  type TreeFileSubmission,
} from './treefile';

/** Names that count against the plan: the root and everyone with a father, buds included. */
export const countedNames = (people: { id: string; fatherId?: string | null }[], rootId: string) =>
  people.filter((p) => p.id === rootId || p.fatherId).length;

export interface SaveContext {
  role: TreeRole;
  /** The account saving, to tell their own proposals from other people's. */
  userId: string;
  /** A reviewer's branches; empty means the whole tree. */
  scope: string[];
  /** The plan's cap on names, from the plans table. */
  maxPersons: number;
  /** The plan expired or was canceled: the tree stays readable, nothing new goes in. */
  paused: boolean;
}

export type SaveProblem =
  | 'not_allowed'
  | 'broken_tree'
  | 'plan_paused'
  | 'plan_full'
  | 'owner_only'
  | 'outside_scope';

/** What the person saving is told, in the app's words. */
export const saveProblemText: Record<SaveProblem, string> = {
  not_allowed: 'ما عندك صلاحية تحفظ هذي الشجرة',
  broken_tree: 'هذا التعديل يكسر ترتيب الشجرة (اسم فاضي أو أب غير موجود)، فما حفظناه',
  plan_paused: 'انتهت باقة الشجرة، والإضافات والاعتماد متوقفة حتى يجدد المالك',
  plan_full: 'وصلت الشجرة لحد باقتها. يرفعها المالك من صفحة الباقة',
  owner_only: 'هذا التعديل للمالك وحده',
  outside_scope: 'هذا خارج غصنك. إضافاتك خارجه تنتظر المالك',
};

/** Equal as JSON, whatever the key order; a missing key and an undefined one are the same. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((x, i) => same(x, bb[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) if (!same(ao[k], bo[k])) return false;
  return true;
}

function byId<T extends { id: string }>(list: T[]) {
  return new Map(list.map((x) => [x.id, x]));
}

/** Whether `id` hangs from one of `scope` in `file`: through its fathers, or a wife's husband. */
function within(scope: string[], file: TreeFile, id: string): boolean {
  if (!scope.length) return true;
  const people = byId(file.people);
  const climbs = (start: string) => {
    const seen = new Set<string>();
    for (let p = people.get(start); p && !seen.has(p.id); p = p.fatherId ? people.get(p.fatherId) : undefined) {
      if (scope.includes(p.id)) return true;
      seen.add(p.id);
    }
    return false;
  };
  if (climbs(id)) return true;
  const p = people.get(id);
  if (!p || p.fatherId || p.id === file.tree.rootId) return false;
  return file.unions.some(
    (u) => (u.aId === id && climbs(u.bId)) || (u.bId === id && climbs(u.aId)),
  );
}

/**
 * Answers why `after` may not replace `before` for this person, or null when it may.
 * `before` is null only for the first file of a tree just planted.
 */
export function checkSave(
  before: TreeFile | null,
  after: TreeFile,
  ctx: SaveContext,
): SaveProblem | null {
  if (ctx.role === 'contributor') return 'not_allowed';
  if (!before && ctx.role !== 'owner') return 'not_allowed';
  // A file that no longer makes one tree is never stored, unless it was already so before
  // this change: an old slip must not lock the family out of tidying it.
  if (treeProblem(after) && (!before || !treeProblem(before))) return 'broken_tree';

  // ---------- The plan ----------
  const was = byId(before?.people ?? []);
  const added = after.people.filter((p) => !was.has(p.id));
  const approvedNow = after.people.filter(
    (p) => p.status === 'approved' && was.get(p.id)?.status === 'proposed',
  );
  const n0 = before ? countedNames(before.people, before.tree.rootId) : 0;
  const n1 = countedNames(after.people, after.tree.rootId);
  if (ctx.paused && (added.length > 0 || approvedNow.length > 0 || n1 > n0)) return 'plan_paused';
  // A tree already over a smaller plan may still be tidied; it just cannot grow.
  if (n1 > ctx.maxPersons && n1 > n0) return 'plan_full';

  if (ctx.role === 'owner' || !before) return null;

  // ---------- A reviewer ----------
  if (!same(before.tree, after.tree)) return 'owner_only';
  if (!same(before.settings ?? defaultTreeSettings, after.settings ?? defaultTreeSettings))
    return 'owner_only';

  const scope = ctx.scope;
  const inBefore = (id: string) => within(scope, before, id);
  const inAfter = (id: string) => within(scope, after, id);

  // Their own proposals outside their branch wait for the owner, as a contributor's would.
  const subsBefore = byId(before.submissions);
  const subsAfter = byId(after.submissions);
  const ownSub = (id: string | undefined) => {
    if (!id) return false;
    const b = subsBefore.get(id);
    const a = subsAfter.get(id);
    return (b ? b.by === ctx.userId : true) && (a ? a.by === ctx.userId : true) && !!(a ?? b);
  };

  const now = byId(after.people);
  for (const id of new Set([...was.keys(), ...now.keys()])) {
    const b = was.get(id);
    const a = now.get(id);
    if (b && a && same(b, a)) continue;
    // Renaming, moving or deleting an approved name is the owner's.
    if (b?.status === 'approved') return 'owner_only';
    const inside = (!b || inBefore(id)) && (!a || inAfter(id));
    if (inside) continue;
    const proposal = (p: TreeFilePerson | undefined) => !p || p.status === 'proposed';
    if (proposal(a) && ownSub(b?.submissionId ?? a?.submissionId)) continue;
    return 'outside_scope';
  }

  for (const id of new Set([...subsBefore.keys(), ...subsAfter.keys()])) {
    const b = subsBefore.get(id);
    const a = subsAfter.get(id);
    if (b && a && same(b, a)) continue;
    const inside = (!b || inBefore(b.fatherId)) && (!a || inAfter(a.fatherId));
    if (inside) continue;
    const waiting = (x: TreeFileSubmission | undefined) => !x || x.status === 'pending';
    if (ownSub(id) && waiting(a)) continue;
    return 'outside_scope';
  }

  const key = (u: { aId: string; bId: string }) => `${u.aId}+${u.bId}`;
  const unionsBefore = new Map(before.unions.map((u) => [key(u), u]));
  const unionsAfter = new Map(after.unions.map((u) => [key(u), u]));
  for (const [k, u] of unionsAfter)
    if (!unionsBefore.has(k) && !inAfter(u.aId) && !inAfter(u.bId)) return 'outside_scope';
  for (const [k, u] of unionsBefore)
    if (!unionsAfter.has(k) && !inBefore(u.aId) && !inBefore(u.bId)) return 'outside_scope';

  return null;
}
