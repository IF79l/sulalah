/**
 * Working on a sealed tree together. A contributor cannot write the tree file, so their
 * additions travel as a sealed submission file of their own; the owner or a reviewer takes it
 * into the tree file, where it waits as dashed buds until it is approved. Visitors on a view
 * link get a filtered copy sealed with a key of its own.
 */
import { z } from 'zod';
import { normalizeArabic } from './arabic';
import { countedNames } from './guard';
import { cleanName, nameProblem, yearsProblem } from './input';
import {
  TreeFileError,
  defaultTreeSettings,
  fromB64url,
  importKey,
  personSchema,
  toB64url,
  type TreeFile,
  type TreeFilePerson,
} from './treefile';

const subtle = () => globalThis.crypto.subtle;
const utf8 = (s: string) => new TextEncoder().encode(s);

// ---------- Small sealed values ----------

/** A random link token. Only its hash reaches the database. */
export function randomToken(): string {
  return toB64url(globalThis.crypto.getRandomValues(new Uint8Array(24)));
}

export async function sha256Hex(text: string): Promise<string> {
  const hash = new Uint8Array(await subtle().digest('SHA-256', utf8(text)));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Seals a short text with the tree key, bound to `context` so it cannot be moved elsewhere. */
export async function sealText(text: string, key: string, context: string): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle().encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8(context) },
    await importKey(key),
    utf8(text),
  );
  return `${toB64url(iv)}.${toB64url(new Uint8Array(data))}`;
}

export async function openText(sealed: string, key: string, context: string): Promise<string> {
  const [iv, data] = sealed.split('.');
  if (!iv || !data) throw new TreeFileError('not-a-tree');
  try {
    const plain = await subtle().decrypt(
      { name: 'AES-GCM', iv: fromB64url(iv), additionalData: utf8(context) },
      await importKey(key),
      fromB64url(data),
    );
    return new TextDecoder().decode(plain);
  } catch (e) {
    if (e instanceof TreeFileError) throw e;
    throw new TreeFileError('wrong-key');
  }
}

// ---------- The visitors' copy ----------

/**
 * The key the visitors' copy is sealed with. It is derived from the tree key, so every owner
 * and reviewer seals with the same one; the server hands it to view links, and nobody can get
 * from it back to the tree key.
 */
export async function viewKeyFor(key: string, treeId: string): Promise<string> {
  const base = await subtle().importKey('raw', fromB64url(key), 'HKDF', false, ['deriveBits']);
  const bits = await subtle().deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8(treeId), info: utf8('sulalah-view-v1') },
    base,
    256,
  );
  return toB64url(new Uint8Array(bits));
}

/**
 * What a visitor may see, following the tree's settings: approved people only, daughters as
 * "ابنة" and wives as "زوجة" unless shown, the departed without children left out if hidden, and nothing about
 * who added or reviewed whom.
 */
export function visitorsCopy(file: TreeFile): TreeFile {
  const settings = file.settings ?? defaultTreeSettings;
  const approved = file.people.filter((p) => p.status === 'approved');
  const fathers = new Set(approved.map((p) => p.fatherId));
  const people = approved
    .filter((p) => settings.showDeceased || !p.deceased || fathers.has(p.id))
    .map((p): TreeFilePerson => {
      const hideName = p.gender === 'female' && !settings.showDaughtersToVisitors;
      return {
        id: p.id,
        // A wife has no father in the tree; she is hidden the same way as the daughters.
        name: hideName ? (p.fatherId ? 'ابنة' : 'زوجة') : p.name,
        gender: p.gender,
        fatherId: p.fatherId,
        status: 'approved',
        deceased: p.deceased,
        ...(settings.showBirthYears && !hideName
          ? { birthYear: p.birthYear, deathYear: p.deathYear }
          : {}),
        ...(hideName ? {} : { kunya: p.kunya }),
      };
    });
  const kept = new Set(people.map((p) => p.id));
  return {
    format: 'sulalah-tree',
    version: 1,
    tree: file.tree,
    people,
    unions: file.unions.filter((u) => kept.has(u.aId) && kept.has(u.bId)),
    submissions: [],
    settings,
    updatedAt: file.updatedAt,
  };
}

// ---------- Submission files ----------

export const submissionFileSchema = z.object({
  format: z.literal('sulalah-submission'),
  version: z.literal(1),
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  treeId: z.string(),
  /** The sender's name as their profile has it, shown to reviewers. */
  contributor: z.string().max(120),
  fatherId: z.string(),
  people: z.array(personSchema).min(1).max(200),
  at: z.string(),
  replaces: z.string().optional(),
});

export type SubmissionFile = z.infer<typeof submissionFileSchema>;

/** Where a member's submission lives in the bucket; the folder is their account id. */
export const submissionPath = (treeId: string, userId: string, id: string) =>
  `${treeId}/submissions/${userId}/${id}.json`;

/** Sealed with the tree key and bound to its path, so a file cannot pose as someone else's. */
export async function sealSubmission(sub: SubmissionFile, key: string, userId: string) {
  return sealText(JSON.stringify(sub), key, submissionPath(sub.treeId, userId, sub.id));
}

export async function openSubmission(
  sealed: string,
  key: string,
  treeId: string,
  userId: string,
  id: string,
): Promise<SubmissionFile> {
  const text = await openText(sealed, key, submissionPath(treeId, userId, id));
  const sub = submissionFileSchema.safeParse(JSON.parse(text));
  if (!sub.success || sub.data.id !== id || sub.data.treeId !== treeId)
    throw new TreeFileError('not-a-tree');
  return sub.data;
}

export type IntakeProblem =
  | 'known'
  | 'no-father'
  | 'outside-branch'
  | 'bad-person'
  | 'taken-id'
  | 'too-many';

/**
 * Takes a submission into the tree file, where its people wait as proposed. Anything that
 * would break the tree is refused: a father who is not an approved man in the tree, a person
 * outside the sender's branch, ids that clash, or a chain that does not hang from the father.
 * `branch` is the sender's own branch when they are a contributor; reviewers and the owner may
 * add anywhere. `limit` is the plan's cap on people.
 */
export function takeIn(
  file: TreeFile,
  sub: SubmissionFile,
  by: string,
  opts: { branch?: string | null; branchRoot?: string | null; limit?: number } = {},
): { file: TreeFile; problem?: undefined } | { problem: IntakeProblem; file?: undefined } {
  if (file.submissions.some((x) => x.id === sub.id)) return { problem: 'known' };
  const byId = new Map(file.people.map((p) => [p.id, p]));
  const father = byId.get(sub.fatherId);
  if (!father || father.status !== 'approved' || father.gender !== 'male')
    return { problem: 'no-father' };
  const under = (branch: string) => {
    for (let p: TreeFilePerson | undefined = father; p; p = p.fatherId ? byId.get(p.fatherId) : undefined)
      if (p.id === branch) return true;
    return false;
  };
  if (opts.branch !== undefined) {
    if (!opts.branch || !under(opts.branch)) return { problem: 'outside-branch' };
  }
  // The branch the sender's invite link was for: their own pick must stay inside it.
  if (opts.branchRoot && !under(opts.branchRoot)) return { problem: 'outside-branch' };

  // A correction replaces the earlier submission still waiting or sent back.
  const old = sub.replaces
    ? file.submissions.find(
        (x) =>
          x.id === sub.replaces && x.by === by && (x.status === 'changes' || x.status === 'pending'),
      )
    : undefined;
  const freed = new Set(old?.personIds ?? []);

  const ours = new Map(sub.people.map((p) => [p.id, p]));
  if (ours.size !== sub.people.length) return { problem: 'taken-id' };
  for (const p of sub.people) {
    if (byId.has(p.id) && !freed.has(p.id)) return { problem: 'taken-id' };
    // A death year left over on someone marked alive is dropped below, not held against them.
    const years = { ...p, deathYear: p.deceased ? p.deathYear : undefined };
    if (!p.fatherId || nameProblem(p.name) || yearsProblem(years)) return { problem: 'bad-person' };
    const f = p.fatherId === sub.fatherId ? father : ours.get(p.fatherId);
    if (!f || f.gender !== 'male') return { problem: 'bad-person' };
  }
  // Every chain must reach the father without looping.
  for (const p of sub.people) {
    const seen = new Set<string>();
    let c: TreeFilePerson | undefined = p;
    while (c && c.fatherId !== sub.fatherId) {
      if (seen.has(c.id)) return { problem: 'bad-person' };
      seen.add(c.id);
      c = ours.get(c.fatherId ?? '');
    }
    if (!c) return { problem: 'bad-person' };
  }

  const kept = file.people.filter((p) => !freed.has(p.id));
  if (opts.limit !== undefined && countedNames(kept, file.tree.rootId) + sub.people.length > opts.limit)
    return { problem: 'too-many' };

  const siblings = kept.filter((p) => p.fatherId === sub.fatherId);
  const warnings = sub.people
    .filter((p) => p.fatherId === sub.fatherId)
    .flatMap((p) => {
      const twin = siblings.find(
        (s) => s.gender === p.gender && normalizeArabic(s.name) === normalizeArabic(p.name),
      );
      return twin ? [`اسم مشابه موجود: ${twin.name} ${twin.gender === 'female' ? 'بنت' : 'بن'} ${father.name}`] : [];
    });

  return {
    file: {
      ...file,
      people: [
        ...kept,
        ...sub.people.map(
          (p): TreeFilePerson => ({
            id: p.id,
            name: cleanName(p.name),
            gender: p.gender,
            fatherId: p.fatherId,
            status: 'proposed',
            deceased: p.deceased,
            birthYear: p.birthYear,
            deathYear: p.deceased ? p.deathYear : undefined,
            kunya: p.kunya?.slice(0, 60),
            bio: p.bio?.slice(0, 2000),
            addedBy: sub.contributor,
            addedAt: sub.at,
            submissionId: sub.id,
          }),
        ),
      ],
      submissions: [
        {
          id: sub.id,
          contributor: sub.contributor,
          by,
          fatherId: sub.fatherId,
          personIds: sub.people.map((p) => p.id),
          at: sub.at,
          status: 'pending',
          ...(warnings.length ? { warnings } : {}),
          ...(old ? { replaces: old.id } : {}),
        },
        ...file.submissions.filter((x) => x.id !== old?.id),
      ],
    },
  };
}

/** Takes a submission nobody has reviewed yet back out of the tree file. */
export function takeOut(file: TreeFile, submissionId: string): TreeFile {
  const sub = file.submissions.find((x) => x.id === submissionId);
  if (!sub || sub.status !== 'pending') return file;
  const gone = new Set(sub.personIds);
  return {
    ...file,
    people: file.people.filter((p) => !(gone.has(p.id) && p.status === 'proposed')),
    submissions: file.submissions.filter((x) => x.id !== submissionId),
  };
}
