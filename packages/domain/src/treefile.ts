/**
 * The tree file: everything a family's tree holds, kept out of the database (decided
 * 2026-10-23). It is encrypted on the family's devices with a key the server never sees, so
 * storage holds only a sealed file. The same people can be exported to and read from CSV.
 */
import { z } from 'zod';

// ---------- The file ----------

export const personSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  gender: z.enum(['male', 'female']),
  fatherId: z.string().nullable().optional(),
  status: z.enum(['approved', 'proposed']),
  deceased: z.boolean().optional(),
  birthYear: z.number().int().optional(),
  deathYear: z.number().int().optional(),
  kunya: z.string().optional(),
  bio: z.string().optional(),
  addedBy: z.string().optional(),
  addedAt: z.string().optional(),
  approvedBy: z.string().optional(),
  submissionId: z.string().optional(),
});

const settingsSchema = z.object({
  showDaughtersToVisitors: z.boolean(),
  showDeceased: z.boolean(),
  showBirthYears: z.boolean(),
});

const logSchema = z.object({
  id: z.string(),
  who: z.string(),
  action: z.enum(['add', 'edit', 'approve', 'reject', 'invite', 'delete']),
  text: z.string(),
  personId: z.string().optional(),
  at: z.string(),
});

export const treeFileSchema = z.object({
  format: z.literal('sulalah-tree'),
  version: z.literal(1),
  tree: z.object({
    id: z.string(),
    title: z.string(),
    family: z.string(),
    rootId: z.string(),
    ancestors: z.array(z.string()),
  }),
  people: z.array(personSchema),
  unions: z.array(z.object({ aId: z.string(), bId: z.string() })),
  /** Additions waiting on review, as they were sent, and what became of them. */
  submissions: z.array(
    z.object({
      id: z.string(),
      contributor: z.string(),
      /** The sender's account id, so the result can be sent back to them. */
      by: z.string().optional(),
      fatherId: z.string(),
      personIds: z.array(z.string()),
      at: z.string(),
      status: z.enum(['pending', 'changes', 'approved', 'rejected']),
      note: z.string().optional(),
      warnings: z.array(z.string()).optional(),
      /** The earlier submission this one corrects, after a request for changes. */
      replaces: z.string().optional(),
      reviewedBy: z.string().optional(),
    }),
  ),
  /** What visitors on a view link may see. Members always see everything. */
  settings: settingsSchema.optional(),
  /** Who did what, newest first, capped at LOG_LIMIT entries. */
  log: z.array(logSchema).optional(),
  updatedAt: z.string(),
});

export type TreeFile = z.infer<typeof treeFileSchema>;
export type TreeFilePerson = z.infer<typeof personSchema>;
export type TreeFileSubmission = TreeFile['submissions'][number];
export type TreeSettings = z.infer<typeof settingsSchema>;
export type TreeLogEntry = z.infer<typeof logSchema>;

export const defaultTreeSettings: TreeSettings = {
  showDaughtersToVisitors: false,
  showDeceased: true,
  showBirthYears: true,
};

export const LOG_LIMIT = 500;

// ---------- Encryption ----------

const subtle = () => globalThis.crypto.subtle;

export function toB64url(bytes: Uint8Array) {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(text: string) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** A fresh 256-bit key for one tree. It travels in invite links after the `#`, never to the server. */
export function generateTreeKey(): string {
  return toB64url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

export async function importKey(key: string) {
  const raw = fromB64url(key);
  if (raw.length !== 32) throw new TreeFileError('bad-key');
  return subtle().importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export const sealedSchema = z.object({
  format: z.literal('sulalah-tree-sealed'),
  version: z.literal(1),
  treeId: z.string(),
  iv: z.string(),
  data: z.string(),
});
export type SealedTree = z.infer<typeof sealedSchema>;

export class TreeFileError extends Error {
  constructor(readonly code: 'bad-key' | 'wrong-key' | 'not-a-tree' | 'bad-recovery-code') {
    super(code);
  }
}

/**
 * Seals the tree with AES-GCM. The tree id is bound in as associated data, so a sealed file
 * cannot be passed off as another tree's.
 */
export async function sealTree(file: TreeFile, key: string): Promise<SealedTree> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(file));
  const data = await subtle().encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(file.tree.id) },
    await importKey(key),
    plain,
  );
  return {
    format: 'sulalah-tree-sealed',
    version: 1,
    treeId: file.tree.id,
    iv: toB64url(iv),
    data: toB64url(new Uint8Array(data)),
  };
}

export async function openTree(sealed: unknown, key: string): Promise<TreeFile> {
  const s = sealedSchema.safeParse(sealed);
  if (!s.success) throw new TreeFileError('not-a-tree');
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt(
      {
        name: 'AES-GCM',
        iv: fromB64url(s.data.iv),
        additionalData: new TextEncoder().encode(s.data.treeId),
      },
      await importKey(key),
      fromB64url(s.data.data),
    );
  } catch (e) {
    if (e instanceof TreeFileError) throw e;
    throw new TreeFileError('wrong-key');
  }
  const file = treeFileSchema.safeParse(JSON.parse(new TextDecoder().decode(plain)));
  if (!file.success) throw new TreeFileError('not-a-tree');
  return file.data;
}

// ---------- Two saves at once ----------

/**
 * Three-way merge for when someone saved the tree after this device last loaded it. `base` is
 * the file this device last loaded or saved; whatever this device changed since wins, and
 * everything else comes from `remote`. Nobody's new people are lost.
 */
export function mergeTreeFiles(base: TreeFile, local: TreeFile, remote: TreeFile): TreeFile {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  function byKey<T>(key: (x: T) => string, b: T[], l: T[], r: T[]): T[] {
    const bm = new Map(b.map((x) => [key(x), x]));
    const lm = new Map(l.map((x) => [key(x), x]));
    const out: T[] = [];
    for (const x of r) {
      const k = key(x);
      const mine = lm.get(k);
      const was = bm.get(k);
      if (!mine) {
        // Gone here: deleted on this device if it was there before, else simply new remotely.
        if (!was || !same(was, x)) out.push(x);
        continue;
      }
      out.push(was && same(was, mine) ? x : mine);
    }
    const rk = new Set(r.map(key));
    // Added here, or still here after the other device deleted it while this one changed it.
    for (const x of l)
      if (!rk.has(key(x)) && (!bm.has(key(x)) || !same(bm.get(key(x)), x))) out.push(x);
    return out;
  }
  const field = <K extends keyof TreeFile['tree']>(k: K) =>
    same(local.tree[k], base.tree[k]) ? remote.tree[k] : local.tree[k];
  return {
    ...remote,
    tree: {
      id: remote.tree.id,
      title: field('title'),
      family: field('family'),
      rootId: field('rootId'),
      ancestors: field('ancestors'),
    },
    people: byKey((p) => p.id, base.people, local.people, remote.people),
    unions: byKey((u) => `${u.aId}+${u.bId}`, base.unions, local.unions, remote.unions),
    submissions: byKey((x) => x.id, base.submissions, local.submissions, remote.submissions),
    settings: same(local.settings, base.settings) ? remote.settings : local.settings,
    // The log only grows: keep every entry either side has, newest first.
    log: mergeLogs(local.log, remote.log),
    updatedAt: new Date().toISOString(),
  };
}

function mergeLogs(a: TreeLogEntry[] = [], b: TreeLogEntry[] = []): TreeLogEntry[] | undefined {
  if (!a.length && !b.length) return undefined;
  const all = new Map([...b, ...a].map((x) => [x.id, x]));
  return [...all.values()].sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0)).slice(0, LOG_LIMIT);
}

// ---------- Recovery code ----------

// Crockford base32: no I, L, O or U, so a code read aloud or copied by hand survives.
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** The tree key as 13 groups of four letters and digits, for the owner to keep somewhere safe. */
export function recoveryCode(key: string): string {
  const bytes = fromB64url(key);
  let bits = '';
  bytes.forEach((b) => (bits += b.toString(2).padStart(8, '0')));
  bits = bits.padEnd(Math.ceil(bits.length / 5) * 5, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out.match(/.{1,4}/g)!.join('-');
}

export function keyFromRecoveryCode(code: string): string {
  const clean = code.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (clean.length !== 52 || [...clean].some((c) => !B32.includes(c)))
    throw new TreeFileError('bad-recovery-code');
  const bits = [...clean].map((c) => B32.indexOf(c).toString(2).padStart(5, '0')).join('');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return toB64url(bytes);
}

// ---------- CSV ----------

/** Column order in exported files; headers are Arabic so the file opens readably in Excel. */
const columns = [
  ['id', 'المعرف'],
  ['name', 'الاسم'],
  ['gender', 'الجنس'],
  ['fatherId', 'معرف الأب'],
  ['deceased', 'متوفى'],
  ['birthYear', 'سنة الميلاد'],
  ['deathYear', 'سنة الوفاة'],
  ['kunya', 'الكنية'],
  ['bio', 'نبذة'],
] as const;
type Column = (typeof columns)[number][0];

const quote = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Approved people only: what is waiting on review is not yet part of the family's record. */
export function toCsv(people: TreeFilePerson[]): string {
  const rows = people
    .filter((p) => p.status === 'approved')
    .map((p) =>
      [
        p.id,
        p.name,
        p.gender === 'female' ? 'أنثى' : 'ذكر',
        p.fatherId ?? '',
        p.deceased ? 'نعم' : '',
        p.birthYear?.toString() ?? '',
        p.deathYear?.toString() ?? '',
        p.kunya ?? '',
        p.bio ?? '',
      ]
        .map(quote)
        .join(','),
    );
  // The byte-order mark makes Excel read the file as UTF-8 instead of garbling the Arabic.
  return '﻿' + [columns.map((c) => c[1]).join(','), ...rows].join('\r\n') + '\r\n';
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === '\t' || c === '؛') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const headerAliases: Record<string, Column> = Object.fromEntries(
  columns.flatMap(([key, ar]) => [
    [key.toLowerCase(), key],
    [ar, key],
  ]),
);
Object.assign(headerAliases, {
  father_id: 'fatherId',
  father: 'fatherId',
  الأب: 'fatherId',
  birth_year: 'birthYear',
  death_year: 'deathYear',
  الميلاد: 'birthYear',
  الوفاة: 'deathYear',
  رقم: 'id',
});

const female = new Set(['أنثى', 'انثى', 'ابنة', 'بنت', 'female', 'f', 'ف']);
const yes = new Set(['نعم', 'yes', 'true', '1', 'متوفى', 'متوفية', 'x', '✓']);

export interface CsvIssue {
  /** 1-based line in the file, counting the header. */
  line: number;
  message: string;
}

/**
 * Reads people from CSV (comma, tab or Arabic semicolon). Rows that cannot be placed are
 * reported with their line instead of being dropped quietly.
 */
export function fromCsv(text: string): {
  people: TreeFilePerson[];
  rootId?: string;
  issues: CsvIssue[];
} {
  const rows = parseRows(text.replace(/^﻿/, ''));
  const issues: CsvIssue[] = [];
  if (!rows.length) return { people: [], issues: [{ line: 1, message: 'الملف فاضي' }] };

  const header = rows[0]!.map(
    (h) => headerAliases[h.trim().toLowerCase()] ?? headerAliases[h.trim()],
  );
  if (!header.includes('name'))
    return { people: [], issues: [{ line: 1, message: 'ما لقينا عمود "الاسم"' }] };
  const at = (row: string[], col: Column) => {
    const i = header.indexOf(col);
    return i >= 0 ? (row[i] ?? '').trim() : '';
  };
  const year = (v: string, line: number, label: string) => {
    if (!v) return undefined;
    const n = Number(v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
    if (!Number.isInteger(n) || n < 1 || n > 3000) {
      issues.push({ line, message: `${label} غير صحيحة: ${v}` });
      return undefined;
    }
    return n;
  };

  const people: TreeFilePerson[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((row, k) => {
    const line = k + 2;
    const name = at(row, 'name');
    if (!name) {
      issues.push({ line, message: 'صف بدون اسم' });
      return;
    }
    const id = at(row, 'id') || `row-${line}`;
    if (seen.has(id)) {
      issues.push({ line, message: `المعرف ${id} مكرر` });
      return;
    }
    seen.add(id);
    people.push({
      id,
      name,
      gender: female.has(at(row, 'gender').toLowerCase()) ? 'female' : 'male',
      fatherId: at(row, 'fatherId') || null,
      status: 'approved',
      deceased: yes.has(at(row, 'deceased').toLowerCase()) || undefined,
      birthYear: year(at(row, 'birthYear'), line, 'سنة الميلاد'),
      deathYear: year(at(row, 'deathYear'), line, 'سنة الوفاة'),
      kunya: at(row, 'kunya') || undefined,
      bio: at(row, 'bio') || undefined,
    });
  });

  // Every father must exist and be a man, and nobody may be his own forefather.
  const byId = new Map(people.map((p) => [p.id, p]));
  const lineOf = (id: string) =>
    rows.findIndex((r, i) => i > 0 && (at(r, 'id') || `row-${i + 1}`) === id) + 1;
  for (const p of people) {
    if (!p.fatherId) continue;
    const f = byId.get(p.fatherId);
    if (!f) {
      issues.push({
        line: lineOf(p.id),
        message: `أب ${p.name} (${p.fatherId}) غير موجود في الملف`,
      });
      p.fatherId = null;
    } else if (f.gender === 'female') {
      issues.push({
        line: lineOf(p.id),
        message: `${f.name} مسجّلة أنثى ولا تكون أبًا لـ ${p.name}`,
      });
      p.fatherId = null;
    }
  }
  for (const p of people) {
    const trail = new Set<string>();
    for (let c: TreeFilePerson | undefined = p; c?.fatherId; c = byId.get(c.fatherId)) {
      if (trail.has(c.id)) {
        issues.push({ line: lineOf(p.id), message: `${p.name} يرجع لنفسه في سلسلة النسب` });
        p.fatherId = null;
        break;
      }
      trail.add(c.id);
    }
  }

  const roots = people.filter((p) => !p.fatherId);
  if (roots.length > 1) {
    issues.push({
      line: 1,
      message: `فيه ${roots.length} أشخاص بدون أب: ${roots
        .slice(0, 4)
        .map((r) => r.name)
        .join('، ')}. الشجرة لها جد مؤسس واحد.`,
    });
  }
  // The root is whoever has the most descendants among those without a father.
  const size = (id: string): number =>
    1 + people.filter((p) => p.fatherId === id).reduce((s, c) => s + size(c.id), 0);
  const rootId = roots.sort((a, b) => size(b.id) - size(a.id))[0]?.id;
  return { people, rootId, issues };
}
