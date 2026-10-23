'use client';

/**
 * The sample tree every screen works on until trees are stored (batch 2). It lives in the
 * browser so that the screens act on one another: a contributor's additions reach the
 * review queue, an approval greens the leaves, a setting sticks. Nothing leaves the device.
 */
import {
  can,
  defaultPlanLimits,
  type Action as PermissionAction,
  type Actor,
  type PlanId,
  type TreeFile,
  type TreeFilePerson,
  type Viewer,
} from '@sulalah/domain';
import {
  demoAncestors,
  demoFamily,
  demoSpouses,
  demoUnions,
  type LineagePerson,
  type LineageUnion,
} from '@sulalah/tree-engine';
import { useSyncExternalStore } from 'react';

export const TREE_ID = 'al-sahli';
export const TREE_TITLE = 'شجرة آل السهلي';
export const FAMILY = 'السهلي';
export const ROOT_ID = 'mohammed';
export const ANCESTORS = demoAncestors;
export const UNIONS = demoUnions;

export interface Person extends LineagePerson {
  birthYear?: number;
  deathYear?: number;
  kunya?: string;
  bio?: string;
  addedBy?: string;
  addedAt?: string;
  approvedBy?: string;
  /** The submission that proposed this person, while it waits. */
  submissionId?: string;
}

export type SubmissionStatus = 'pending' | 'changes' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  contributor: string;
  /** The father the additions hang from. */
  fatherId: string;
  personIds: string[];
  at: string;
  status: SubmissionStatus;
  note?: string;
  warnings?: string[];
}

export interface Reviewer {
  id: string;
  name: string;
  /** Root ids of the branches they may review, or everything. */
  scope: string[] | 'all';
  reviewed: number;
}

export interface Invite {
  id: string;
  kind: 'contribute' | 'view';
  scope: string | 'all';
  used: number;
  maxUses?: number;
  expiresInDays: number;
  status: 'active' | 'expired' | 'stopped';
}

export interface Notice {
  id: string;
  icon: string;
  text: string;
  at: string;
  unread: boolean;
  href?: string;
}

export type Action = 'add' | 'edit' | 'approve' | 'reject' | 'invite' | 'delete';

export interface LogEntry {
  id: string;
  who: string;
  action: Action;
  text: string;
  personId?: string;
  at: string;
}

export interface Settings {
  viewers: 'members' | 'link';
  showDaughtersToVisitors: boolean;
  showDeceased: boolean;
  showBirthYears: boolean;
}

/** What names the tree. A CSV import or a restored backup replaces it along with the people. */
export interface TreeInfo {
  title: string;
  family: string;
  rootId: string;
  /** The root's forefathers, nearest first, shown on the trunk. */
  ancestors: string[];
  unions: LineageUnion[];
}

export interface DemoState {
  tree: TreeInfo;
  /** Whose eyes the demo shows the tree through; the switcher in the top bar changes it. */
  as: Viewer;
  /** The family's key for the encrypted tree file, made on first backup. */
  treeKey?: string;
  people: Person[];
  submissions: Submission[];
  reviewers: Reviewer[];
  invites: Invite[];
  notices: Notice[];
  log: LogEntry[];
  settings: Settings;
  plan: PlanId;
  upgradeRequested?: PlanId;
  me: { first: string; father: string; phone: string; notify: 'app' | 'sms' };
  /** Invites to other trees the person chose to ignore. */
  ignoredInvites?: string[];
  /** Set once the owner hands the tree to someone else. */
  transferredTo?: string;
  /** The contributor's own place, once picked on the join screen. */
  myBranch?: string;
  drafts: string[];
}

const pendingSeed: Record<string, { sub: string; by: string }> = {
  'majed-s1': { sub: 'sub-1', by: 'ماجد بن سالم' },
  'majed-d0': { sub: 'sub-1', by: 'ماجد بن سالم' },
  'nawaf-s1': { sub: 'sub-2', by: 'نواف بن سلطان' },
  'nawaf-d0': { sub: 'sub-2', by: 'نواف بن سلطان' },
  'rakan-s1': { sub: 'sub-3', by: 'راكان بن فيصل' },
};

function seed(): DemoState {
  const years: Record<string, [number, number?]> = {
    mohammed: [1921, 1998],
    matrouk: [1946],
    daifallah: [1950],
    abdullah: [1953],
    saad: [1975, 2019],
    khaled: [1978],
    faisal: [2001],
  };
  const people: Person[] = [...demoFamily, ...demoSpouses].map((p) => {
    const y = years[p.id];
    const pend = pendingSeed[p.id];
    return {
      ...p,
      ...(y ? { birthYear: y[0], deathYear: y[1] } : {}),
      ...(p.id === 'mohammed'
        ? { kunya: 'أبو متروك', bio: 'الجد المؤسس. سكن القصيم، وكان معروفًا بالكرم وحفظ الأنساب.' }
        : {}),
      ...(pend
        ? {
            status: 'proposed' as const,
            submissionId: pend.sub,
            addedBy: pend.by,
            addedAt: 'قبل ساعتين',
          }
        : { addedBy: 'فيصل بن خالد', addedAt: 'قبل 3 أشهر', approvedBy: 'فيصل بن خالد' }),
    };
  });
  return {
    people,
    submissions: [
      {
        id: 'sub-1',
        contributor: 'ماجد بن سالم',
        fatherId: 'majed',
        personIds: ['majed-s1', 'majed-d0'],
        at: 'قبل ساعتين',
        status: 'pending',
      },
      {
        id: 'sub-2',
        contributor: 'نواف بن سلطان',
        fatherId: 'nawaf',
        personIds: ['nawaf-s1', 'nawaf-d0'],
        at: 'أمس',
        status: 'pending',
        warnings: ['اسم مشابه موجود: بدر بن نواف'],
      },
      {
        id: 'sub-3',
        contributor: 'راكان بن فيصل',
        fatherId: 'rakan',
        personIds: ['rakan-s1'],
        at: 'قبل 3 أيام',
        status: 'pending',
      },
      {
        id: 'sub-0',
        contributor: 'عمر بن تركي',
        fatherId: 'omar',
        personIds: ['omar-s0', 'omar-s1', 'omar-d0'],
        at: 'قبل أسبوع',
        status: 'approved',
      },
    ],
    reviewers: [{ id: 'r-salem', name: 'سالم بن متروك', scope: ['matrouk'], reviewed: 42 }],
    invites: [
      {
        id: 'inv-1',
        kind: 'contribute',
        scope: 'all',
        used: 7,
        maxUses: 50,
        expiresInDays: 3,
        status: 'active',
      },
      {
        id: 'inv-2',
        kind: 'contribute',
        scope: 'daifallah',
        used: 2,
        expiresInDays: 25,
        status: 'active',
      },
      { id: 'inv-3', kind: 'view', scope: 'all', used: 19, expiresInDays: 0, status: 'expired' },
    ],
    notices: [
      {
        id: 'n1',
        icon: 'person_add',
        text: 'أرسل ماجد بن سالم إضافتين لغصن ماجد',
        at: 'قبل ساعتين',
        unread: true,
        href: `/trees/${TREE_ID}/review`,
      },
      {
        id: 'n2',
        icon: 'person_add',
        text: 'أرسل نواف بن سلطان إضافتين لغصن نواف',
        at: 'أمس',
        unread: true,
        href: `/trees/${TREE_ID}/review`,
      },
      {
        id: 'n3',
        icon: 'eco',
        text: 'اعتمد سالم بن متروك 3 إضافات، ونبتت في الشجرة',
        at: 'قبل 4 أيام',
        unread: false,
        href: `/trees/${TREE_ID}`,
      },
      {
        id: 'n4',
        icon: 'link',
        text: 'انضم 3 من العائلة عبر رابط الدعوة',
        at: 'قبل أسبوع',
        unread: false,
        href: `/trees/${TREE_ID}/invites`,
      },
    ],
    log: [
      {
        id: 'l1',
        who: 'ماجد بن سالم',
        action: 'add',
        text: 'أضاف سعود والعنود تحت ماجد',
        personId: 'majed',
        at: 'قبل ساعتين',
      },
      {
        id: 'l2',
        who: 'نواف بن سلطان',
        action: 'add',
        text: 'أضاف بدر وشهد تحت نواف',
        personId: 'nawaf',
        at: 'أمس',
      },
      {
        id: 'l3',
        who: 'سالم بن متروك',
        action: 'approve',
        text: 'اعتمد 3 إضافات تحت عمر',
        personId: 'omar',
        at: 'قبل 4 أيام',
      },
      {
        id: 'l4',
        who: 'فيصل بن خالد',
        action: 'edit',
        text: 'عدّل سنة ميلاد محمد بن عبدالله',
        personId: 'mohammed',
        at: 'قبل أسبوع',
      },
      {
        id: 'l5',
        who: 'فيصل بن خالد',
        action: 'invite',
        text: 'أنشأ رابط مساهمة لغصن ضيف الله',
        at: 'قبل أسبوعين',
      },
      {
        id: 'l6',
        who: 'فيصل بن خالد',
        action: 'reject',
        text: 'رفض إضافة مكررة: سلمان بن بندر',
        personId: 'bandar',
        at: 'قبل 3 أسابيع',
      },
    ],
    as: 'owner',
    tree: {
      title: TREE_TITLE,
      family: FAMILY,
      rootId: ROOT_ID,
      ancestors: ANCESTORS,
      unions: UNIONS,
    },
    settings: {
      viewers: 'members',
      showDaughtersToVisitors: false,
      showDeceased: true,
      showBirthYears: true,
    },
    plan: 'extended',
    me: { first: 'فيصل', father: 'خالد', phone: '551234567', notify: 'app' },
    drafts: [],
  };
}

const KEY = 'sulalah-demo-v1';
let state: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as DemoState) : null;
    // A state saved before the tree had its own field carries the sample tree.
    state = saved ? { ...seed(), ...saved, tree: saved.tree ?? seed().tree } : seed();
  } catch {
    state = seed();
  }
  return state;
}

const serverState = seed();

export function update(fn: (s: DemoState) => DemoState) {
  state = fn(load());
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private windows may refuse storage; the change still holds for this visit.
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  update(() => seed());
}

export function useDemo(): DemoState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    load,
    () => serverState,
  );
}

// ---------- Reading the tree ----------

export const num = (n: number) => n.toLocaleString('en-US');

/** "اسم واحد", "اسمان", "5 أسماء", "88 اسمًا": the counted noun as Arabic grammar wants it. */
export const names = (n: number) =>
  n === 1
    ? 'اسم واحد'
    : n === 2
      ? 'اسمان'
      : n % 100 >= 3 && n % 100 <= 10
        ? `${num(n)} أسماء`
        : `${num(n)} اسمًا`;

export function byId(people: Person[]) {
  return new Map(people.map((p) => [p.id, p]));
}

/** Root → person. */
export function pathTo(people: Person[], id: string): Person[] {
  const m = byId(people);
  const out: Person[] = [];
  for (let p = m.get(id); p; p = p.fatherId ? m.get(p.fatherId) : undefined) out.unshift(p);
  return out;
}

/** "فهد بن عبدالله بن محمد السهلي". */
export function nasab(path: Person[], family?: string) {
  const words = [...path]
    .reverse()
    .map((p, i, all) =>
      i === 0 ? p.name : `${all[i - 1]!.gender === 'female' ? 'بنت' : 'بن'} ${p.name}`,
    );
  return family ? `${words.join(' ')} ${family}` : words.join(' ');
}

export const childrenOf = (people: Person[], id: string) => people.filter((p) => p.fatherId === id);

/** Whether `id` sits inside the branch that starts at `branchRoot`. */
export function inBranch(people: Person[], id: string, branchRoot: string) {
  return pathTo(people, id).some((p) => p.id === branchRoot);
}

export function lineage(people: Person[], rootId: string) {
  return people.filter((p) => p.id === rootId || p.fatherId);
}

export function generations(people: Person[], rootId: string) {
  const m = byId(people);
  const depth = (p: Person): number =>
    p.fatherId && m.has(p.fatherId) ? 1 + depth(m.get(p.fatherId)!) : 1;
  return Math.max(1, ...lineage(people, rootId).map(depth));
}

/** Arabic-aware matching: hamza forms, taa marbuta and alif maqsura fold to plain letters. */
export const fold = (s: string) =>
  s.replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();

export const planLimits = (s: DemoState) => defaultPlanLimits[s.plan];

export const planName: Record<PlanId, string> = {
  family: 'العائلة',
  extended: 'العائلة الممتدة',
  tribe: 'القبيلة',
};

let seq = 0;
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const myName = (s: DemoState) => `${s.me.first} بن ${s.me.father}`;

// ---------- Changing the tree ----------

export function approve(submissionId: string, keep: string[], by: string) {
  update((s) => {
    const sub = s.submissions.find((x) => x.id === submissionId);
    if (!sub) return s;
    const dropped = sub.personIds.filter((id) => !keep.includes(id));
    const names = s.people.filter((p) => keep.includes(p.id)).map((p) => p.name);
    return {
      ...s,
      people: s.people
        .filter((p) => !dropped.includes(p.id))
        .map((p) =>
          keep.includes(p.id)
            ? { ...p, status: 'approved', approvedBy: by, submissionId: undefined }
            : p,
        ),
      submissions: s.submissions.map((x) =>
        x.id === submissionId ? { ...x, status: 'approved', personIds: keep } : x,
      ),
      log: [
        {
          id: newId('l'),
          who: by,
          action: 'approve',
          text: `اعتمد ${names.join(' و')}`,
          personId: sub.fatherId,
          at: 'الآن',
        },
        ...s.log,
      ],
    };
  });
}

export function sendBack(
  submissionId: string,
  status: 'changes' | 'rejected',
  note: string,
  by: string,
) {
  update((s) => {
    const sub = s.submissions.find((x) => x.id === submissionId);
    if (!sub) return s;
    return {
      ...s,
      // Rejected people leave the tree; ones sent back for changes wait off it.
      people: s.people.filter((p) => !sub.personIds.includes(p.id) || status === 'changes'),
      submissions: s.submissions.map((x) => (x.id === submissionId ? { ...x, status, note } : x)),
      log: [
        {
          id: newId('l'),
          who: by,
          action: 'reject',
          text:
            status === 'rejected'
              ? `رفض إضافة ${sub.contributor}: ${note}`
              : `طلب تعديلًا من ${sub.contributor}`,
          personId: sub.fatherId,
          at: 'الآن',
        },
        ...s.log,
      ],
    };
  });
}

// ---------- The tree file ----------

/** The tree as the family's file holds it: names and relations only, no app settings. */
export function toTreeFile(s: DemoState): TreeFile {
  return {
    format: 'sulalah-tree',
    version: 1,
    tree: {
      id: TREE_ID,
      title: s.tree.title,
      family: s.tree.family,
      rootId: s.tree.rootId,
      ancestors: s.tree.ancestors,
    },
    people: s.people,
    unions: s.tree.unions,
    submissions: s.submissions,
    updatedAt: new Date().toISOString(),
  };
}

/** Puts a restored backup back in place of the tree; settings, invites and reviewers stay. */
export function restoreTreeFile(file: TreeFile) {
  update((st) => ({
    ...st,
    tree: { ...file.tree, unions: file.unions },
    people: file.people as Person[],
    submissions: file.submissions,
    drafts: [],
    log: [logEntry('edit', `استرجع نسخة احتياطية فيها ${names(file.people.length)}`), ...st.log],
  }));
}

/** Starts the tree over from imported people, as the new-tree wizard does. */
export function replaceTree(tree: Omit<TreeInfo, 'unions'>, people: TreeFilePerson[]) {
  update((st) => ({
    ...st,
    tree: { ...tree, unions: [] },
    people: people.map((p) => ({ ...p, status: 'approved' as const })) as Person[],
    submissions: [],
    reviewers: [],
    invites: [],
    drafts: [],
    myBranch: undefined,
    treeKey: undefined,
    log: [logEntry('add', `أنشأ الشجرة من ملف فيه ${names(people.length)}`)],
  }));
}

function logEntry(action: Action, text: string): LogEntry {
  return { id: newId('log'), who: myName(load()), action, text, at: 'الآن' };
}

// ---------- Who is acting ----------

/** The demo's assistant reviewer, whose scope comes from the reviewers page. */
export const demoReviewer = (s: DemoState) => s.reviewers[0];

export function actorOf(s: DemoState): Actor {
  switch (s.as) {
    case 'owner':
      return { userId: 'me', membership: { role: 'owner', scopePersonIds: [] } };
    case 'reviewer': {
      const r = demoReviewer(s);
      return {
        userId: 'reviewer',
        membership: { role: 'reviewer', scopePersonIds: !r || r.scope === 'all' ? [] : r.scope },
      };
    }
    case 'contributor':
      return {
        userId: 'me',
        membership: { role: 'contributor', scopePersonIds: [], branchPersonId: s.myBranch },
      };
    case 'visitor':
      return { userId: 'anon', viaViewLink: s.settings.viewers === 'link' };
  }
}

/** The name written in the log and on submissions for whoever is acting. */
export const actingName = (s: DemoState) =>
  s.as === 'reviewer' ? (demoReviewer(s)?.name ?? myName(s)) : myName(s);

export const allows = (s: DemoState, action: PermissionAction) => can(actorOf(s), action);

/** Whether the acting person may add under `fatherId`. */
export const canAddUnder = (s: DemoState, fatherId: string) =>
  allows(s, {
    type: 'contribution.submit',
    anchorAncestorIds: pathTo(s.people, fatherId).map((p) => p.id),
  });

/** Whether the acting person may review additions hanging from `fatherId`. */
export const canReview = (s: DemoState, fatherId: string) =>
  allows(s, {
    type: 'contribution.review',
    anchorAncestorIds: pathTo(s.people, fatherId).map((p) => p.id),
  });

export function actAs(as: Viewer) {
  update((st) => ({ ...st, as }));
}

/** Relatives who already joined through an invite; only they can review or take ownership. */
export const joinedMembers = [
  'سالم بن متروك',
  'ماجد بن سالم',
  'نواف بن سلطان',
  'راكان بن فيصل',
  'عمر بن تركي',
  'بندر بن ناصر',
  'خالد بن عبدالله',
];

/**
 * Hands the tree to another member. The old owner stays on as a reviewer of the whole tree,
 * so the demo switches to the reviewer's view.
 */
export function transferOwnership(to: string) {
  update((st) => ({
    ...st,
    as: 'reviewer',
    transferredTo: to,
    reviewers: [
      { id: 'r-me', name: myName(st), scope: 'all', reviewed: 0 },
      ...st.reviewers.filter((r) => r.name !== to),
    ],
    log: [
      {
        id: newId('l'),
        who: myName(st),
        action: 'edit',
        text: `نقل ملكية الشجرة إلى ${to}`,
        at: 'الآن',
      },
      ...st.log,
    ],
  }));
}
