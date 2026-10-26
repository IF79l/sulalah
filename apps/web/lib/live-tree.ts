'use client';

/**
 * Keeps an open real tree saved. Whenever the people, the trunk, the submissions, the
 * settings or the log change in the store, the tree is sealed and saved a moment later. If
 * someone else saved first, their version is merged with this device's changes and saved
 * again, so neither side loses work.
 *
 * The owner and reviewers also take contributors' submission files into the tree file as they
 * arrive. A contributor never writes the tree file: their unsent additions are kept sealed on
 * this device, and sent ones travel as submission files (lib/collab-cloud.ts).
 */
import {
  mergeTreeFiles,
  openText,
  sealText,
  takeIn,
  takeOut,
  type TreeFile,
} from '@sulalah/domain';
import { useSyncExternalStore } from 'react';
import {
  clearSubmissionFiles,
  listMembers,
  loadSubmissions,
  publishView,
} from '@/lib/collab-cloud';
import {
  canReview,
  getState,
  liveTree,
  planLimits,
  subscribe,
  toTreeFile,
  update,
  type DemoState,
  type Person,
} from '@/lib/demo-store';
import { SaveConflict, SaveRefused, loadTreeFile, saveTreeFile } from '@/lib/tree-cloud';

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'failed' | 'refused' | 'readonly';

let status: SaveStatus = 'saved';
/** Why the server turned the last change down, while the status is 'refused'. */
let refusal = '';
const watchers = new Set<() => void>();
const setStatus = (s: SaveStatus, why = '') => {
  status = s;
  refusal = why;
  watchers.forEach((w) => w());
};

/** The server's reason for the last refused change. */
export const refusalText = () => refusal;

export function useSaveStatus() {
  return useSyncExternalStore(
    (w) => {
      watchers.add(w);
      return () => watchers.delete(w);
    },
    () => status,
    () => 'saved' as SaveStatus,
  );
}

/**
 * Work that may only happen once the server took the change just made, such as telling a
 * contributor their additions were approved. Dropped if the server refuses the change.
 */
let waiting: (() => void)[] = [];
export function afterSave(fn: () => void) {
  if (!session) return fn();
  waiting.push(fn);
}

interface Session {
  treeId: string;
  key: string;
  version: number;
  /** The file as last loaded or saved: the base for merging. */
  base: TreeFile;
  /** What the store held when it last matched the server. */
  seen: unknown[];
  timer?: ReturnType<typeof setTimeout>;
  busy: boolean;
  stops: (() => void)[];
}

let session: Session | null = null;
/** Set while the store is put back to the server's copy, which is not a change to save. */
let quiet = false;

const parts = () => {
  const s = getState();
  return [s.people, s.submissions, s.tree, s.settings, s.log];
};
const changed = (a: unknown[], b: unknown[]) => a.some((x, i) => x !== b[i]);
const reviewing = () => {
  const role = liveTree()?.role;
  return role === 'owner' || role === 'reviewer';
};

/** Starts saving the open tree, or, for a contributor, keeping their drafts. */
export function startSaving(treeId: string, key: string, version: number, file: TreeFile) {
  stopSaving();
  const s: Session = { treeId, key, version, base: file, seen: parts(), busy: false, stops: [] };
  session = s;
  if (!reviewing()) {
    setStatus('readonly');
    void startContributing(s);
    return;
  }
  setStatus('saved');
  s.stops.push(
    subscribe(() => {
      if (quiet || session !== s || !changed(parts(), s.seen)) return;
      clearTimeout(s.timer);
      setStatus('saving');
      s.timer = setTimeout(() => void flush(s), 1200);
    }),
  );

  // New submissions arrive while the tree is open: look when it opens, every minute, and
  // whenever the person comes back to the tab.
  const look = () => void syncIncoming(s);
  look();
  const every = setInterval(look, 60_000);
  const back = () => document.visibilityState === 'visible' && look();
  document.addEventListener('visibilitychange', back);
  s.stops.push(() => {
    clearInterval(every);
    document.removeEventListener('visibilitychange', back);
  });
}

export function stopSaving() {
  if (!session) return;
  waiting = [];
  clearTimeout(session.timer);
  session.stops.forEach((stop) => stop());
  session = null;
}

async function flush(s: Session) {
  if (s.busy) {
    s.timer = setTimeout(() => void flush(s), 600);
    return;
  }
  if (!changed(parts(), s.seen)) {
    if (session === s) setStatus('saved');
    return;
  }
  s.busy = true;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const now = parts();
      const file = toTreeFile(getState());
      // What waits on this save: anything queued before the file was taken from the store.
      const due = waiting;
      waiting = [];
      try {
        s.version = await saveTreeFile(s.treeId, s.version, file, s.key);
        s.base = file;
        s.seen = now;
        due.forEach((fn) => fn());
        break;
      } catch (e) {
        if (!(e instanceof SaveRefused)) waiting = [...due, ...waiting];
        if (e instanceof SaveRefused) {
          // The change is not allowed: go back to the tree as the server has it.
          const remote = await loadTreeFile(s.treeId, s.key);
          if (remote) {
            s.base = remote.file;
            s.version = remote.version;
            quiet = true;
            try {
              update((st) => fromFile(st, remote.file));
            } finally {
              quiet = false;
            }
            s.seen = parts();
          }
          if (session === s) setStatus('refused', e.message);
          return;
        }
        if (!(e instanceof SaveConflict) || attempt === 2) throw e;
        const remote = await loadTreeFile(s.treeId, s.key);
        if (!remote) throw e;
        const merged = mergeTreeFiles(s.base, file, remote.file);
        s.base = remote.file;
        s.version = remote.version;
        update((st) => fromFile(st, merged));
      }
    }
    if (session === s) setStatus(changed(parts(), s.seen) ? 'saving' : 'saved');
    if (changed(parts(), s.seen)) s.timer = setTimeout(() => void flush(s), 600);
    else if (getState().settings.viewers === 'link') void republishView();
  } catch {
    if (session === s) setStatus(navigator.onLine ? 'failed' : 'offline');
  } finally {
    s.busy = false;
  }
}

/** The store with the tree parts of `file` in place, and this device's unsent drafts kept. */
function fromFile(st: DemoState, file: TreeFile): DemoState {
  const drafts = st.people.filter((p) => st.drafts.includes(p.id));
  return {
    ...st,
    tree: { ...file.tree, unions: file.unions },
    people: [...(file.people as Person[]), ...drafts],
    submissions: file.submissions,
    settings: file.settings ? { ...st.settings, ...file.settings } : st.settings,
    log: (file.log ?? st.log) as DemoState['log'],
  };
}

/** The store with the people and submissions of `file`, and the unsent drafts kept. */
function withFile(st: DemoState, file: TreeFile): DemoState {
  const drafts = st.people.filter((p) => st.drafts.includes(p.id));
  return { ...st, people: [...(file.people as Person[]), ...drafts], submissions: file.submissions };
}

/** Tries a failed save again. */
export function retrySave() {
  if (session) void flush(session);
}

/** Whether leaving now would lose a change that has not reached the server. */
export const unsaved = () => status === 'saving' || status === 'failed' || status === 'offline';

/**
 * Seals the visitors' copy of the tree as last saved and points view links at it. Called
 * after every save while the tree is open to view links, and when a view link is stopped.
 */
export async function republishView() {
  const s = session;
  if (!s || !reviewing()) return;
  try {
    await publishView(s.treeId, s.key, s.base, s.version);
  } catch {
    // The copy catches up on the next save.
  }
}

// ---------- Taking submissions in ----------

/** Submissions refused once are not tried again this visit. */
const refused = new Set<string>();
let syncing = false;

/** Looks for new submission files and takes them into the tree file. Answers how many. */
export async function syncIncoming(s: Session | null = session): Promise<number> {
  if (!s || !reviewing() || syncing) return 0;
  syncing = true;
  try {
    const known = new Set([...getState().submissions.map((x) => x.id), ...refused]);
    const [{ incoming, present }, members] = await Promise.all([
      loadSubmissions(s.treeId, s.key, known),
      listMembers(s.treeId),
    ]);
    if (session !== s) return 0;
    let took = 0;
    update((st) => {
      const start = toTreeFile(st);
      let file = start;
      // A paused tree takes nothing in; a reviewer takes in only what hangs in their branch,
      // and leaves the rest for the owner. The server refuses anything else.
      const mine = (fatherId: string) => canReview(st, fatherId);
      for (const { by, sub } of st.paused ? [] : incoming) {
        const m = members.find((x) => x.userId === by);
        if (!m || !mine(sub.fatherId)) continue;
        const r = takeIn(file, sub, by, {
          branch: m.role === 'contributor' ? m.branch : undefined,
          branchRoot: m.role === 'contributor' ? m.branchRoot : undefined,
          limit: planLimits(st).maxPersons,
        });
        if (r.file) {
          file = r.file;
          took++;
        } else if (r.problem !== 'known') refused.add(sub.id);
      }
      // Ones the contributor took back before anyone reviewed them.
      for (const x of file.submissions)
        if (x.status === 'pending' && x.by && !present.has(x.id) && mine(x.fatherId))
          file = takeOut(file, x.id);
      // Only touch the tree when something came in, so a quiet look saves nothing.
      const next = file === start ? st : withFile(st, file);
      return {
        ...next,
        members: members.map((m) => ({ ...m })),
        reviewers: members
          .filter((m) => m.role === 'reviewer')
          .map((m) => ({
            id: m.userId,
            name: m.name,
            scope: m.scope.length ? m.scope : 'all',
            reviewed: st.submissions.filter((x) => x.reviewedBy === m.name).length,
          })),
      };
    });
    // The owner clears files whose fate is already written in the tree file.
    if (liveTree()?.role === 'owner') {
      const done = getState().submissions.filter(
        (x) => x.status === 'approved' || x.status === 'rejected',
      );
      const paths = done.map((x) => present.get(x.id)).filter((p): p is string => !!p);
      void clearSubmissionFiles(paths).catch(() => {});
    }
    return took;
  } catch {
    return 0;
  } finally {
    syncing = false;
  }
}

// ---------- A contributor's side ----------

const draftSlot = (treeId: string, userId: string) => `sulalah-drafts:${treeId}:${userId}`;

interface DraftBox {
  people: Person[];
  drafts: string[];
  replaces?: string;
}

/**
 * Shows a contributor what they sent but nobody took in yet, and brings back the additions
 * they had not sent, kept sealed on this device.
 */
async function startContributing(s: Session) {
  const me = liveTree()?.userId;
  if (!me) return;
  const slot = draftSlot(s.treeId, me);

  try {
    const raw = localStorage.getItem(slot);
    if (raw) {
      const box = JSON.parse(await openText(raw, s.key, slot)) as DraftBox;
      update((st) => {
        const have = new Set(st.people.map((p) => p.id));
        const people = box.people.filter((p) => !have.has(p.id));
        return {
          ...st,
          people: [...st.people, ...people],
          drafts: box.drafts.filter((id) => people.some((p) => p.id === id) || have.has(id)),
          draftReplaces: box.replaces,
        };
      });
    }
  } catch {
    // Drafts from another key or a broken box are dropped.
  }

  try {
    const known = new Set(getState().submissions.map((x) => x.id));
    const { incoming } = await loadSubmissions(s.treeId, s.key, known, true);
    if (session !== s || !incoming.length) return;
    update((st) => {
      let file = toTreeFile(st);
      for (const { by, sub } of incoming) file = takeIn(file, sub, by).file ?? file;
      return withFile(st, file);
    });
  } catch {
    // Their own submissions show once the reviewers take them in.
  } finally {
    if (session === s) keepDrafts(s, slot);
  }
}

function keepDrafts(s: Session, slot: string) {
  let last = '';
  const save = async () => {
    const st = getState();
    const box: DraftBox = {
      people: st.people.filter((p) => st.drafts.includes(p.id)),
      drafts: st.drafts,
      replaces: st.draftReplaces,
    };
    const text = JSON.stringify(box);
    if (text === last) return;
    last = text;
    try {
      if (!box.drafts.length) localStorage.removeItem(slot);
      else localStorage.setItem(slot, await sealText(text, s.key, slot));
    } catch {
      // A private window may refuse; the drafts last for this visit.
    }
  };
  void save();
  s.stops.push(subscribe(() => void save()));
}
