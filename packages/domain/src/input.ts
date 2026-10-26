/**
 * What a person's details and a whole tree file must look like, checked the same way on the
 * screens, when a submission is taken in, and on the server before any save is stored.
 */
import type { TreeFile } from './treefile';

/** Longest name a leaf holds; longer ones would not fit on it and are refused. */
export const NAME_MAX = 60;

/** Arabic-Indic (٠١٢) and Persian (۰۱۲) digits as 0-9. */
export const latinDigits = (text: string) =>
  text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/** One space between words, none at the ends. */
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim();

/** Years a family records: hijri and gregorian both sit inside this range. */
export const YEAR_MIN = 500;

/**
 * Why a person's years cannot be right, or null. A year in the future, a death before the
 * birth, or a death year for someone alive are all typing slips.
 */
export function yearsProblem(
  p: { birthYear?: number; deathYear?: number; deceased?: boolean },
  now = new Date(),
): string | null {
  const max = now.getUTCFullYear();
  for (const [y, label] of [
    [p.birthYear, 'سنة الميلاد'],
    [p.deathYear, 'سنة الوفاة'],
  ] as const) {
    if (y === undefined) continue;
    if (!Number.isInteger(y) || y < YEAR_MIN || y > max) return `${label} غير صحيحة`;
  }
  if (p.deathYear !== undefined && !p.deceased) return 'سنة الوفاة لمتوفى فقط';
  if (p.birthYear !== undefined && p.deathYear !== undefined && p.deathYear < p.birthYear)
    return 'سنة الوفاة قبل سنة الميلاد';
  return null;
}

/** Why a name cannot go on a leaf, or null. */
export function nameProblem(name: string): string | null {
  const n = cleanName(name);
  if (!n) return 'اكتب الاسم';
  if (n.length > NAME_MAX) return `الاسم أطول من ${NAME_MAX} حرفًا`;
  return null;
}

export type IntegrityProblem =
  | 'duplicate_id'
  | 'no_root'
  | 'root_has_father'
  | 'missing_father'
  | 'father_not_male'
  | 'loop'
  | 'bad_name'
  | 'bad_union';

/**
 * Whether the file still makes one tree: unique ids, the root present and fatherless, every
 * father present and a man, no one his own forefather, every name non-empty and short enough,
 * and every union between two people in the tree. Answers the first problem found, or null.
 * Years are not checked here: an old file may carry a slip that should not lock the tree.
 */
export function treeProblem(file: TreeFile): IntegrityProblem | null {
  const byId = new Map<string, TreeFile['people'][number]>();
  for (const p of file.people) {
    if (byId.has(p.id)) return 'duplicate_id';
    byId.set(p.id, p);
  }
  const root = byId.get(file.tree.rootId);
  if (!root) return 'no_root';
  if (root.fatherId) return 'root_has_father';
  for (const p of file.people) {
    if (!cleanName(p.name) || p.name.length > NAME_MAX * 2) return 'bad_name';
    if (!p.fatherId) continue;
    const f = byId.get(p.fatherId);
    if (!f) return 'missing_father';
    if (f.gender !== 'male') return 'father_not_male';
  }
  const ok = new Set<string>();
  for (const p of file.people) {
    const trail = new Set<string>();
    for (let c = p; c.fatherId && !ok.has(c.id); c = byId.get(c.fatherId)!) {
      if (trail.has(c.id)) return 'loop';
      trail.add(c.id);
    }
    trail.forEach((id) => ok.add(id));
  }
  for (const u of file.unions) if (!byId.has(u.aId) || !byId.has(u.bId)) return 'bad_union';
  return null;
}
