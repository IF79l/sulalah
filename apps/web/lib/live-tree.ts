'use client';

/**
 * Keeps an open real tree saved. Whenever the people, the trunk or the submissions change in
 * the store, the tree is sealed and saved a moment later. If someone else saved first, their
 * version is merged with this device's changes and saved again, so neither side loses work.
 */
import { mergeTreeFiles, type TreeFile } from '@sulalah/domain';
import { useSyncExternalStore } from 'react';
import { getState, liveTree, subscribe, toTreeFile, update, type Person } from '@/lib/demo-store';
import { SaveConflict, loadTreeFile, saveTreeFile } from '@/lib/tree-cloud';

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'failed' | 'readonly';

let status: SaveStatus = 'saved';
const watchers = new Set<() => void>();
const setStatus = (s: SaveStatus) => {
  status = s;
  watchers.forEach((w) => w());
};

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
  stop: () => void;
}

let session: Session | null = null;

const parts = () => {
  const s = getState();
  return [s.people, s.submissions, s.tree];
};
const changed = (a: unknown[], b: unknown[]) => a.some((x, i) => x !== b[i]);

/** Starts saving the open tree. Contributors' additions are sent as submissions instead (batch 4). */
export function startSaving(treeId: string, key: string, version: number, file: TreeFile) {
  stopSaving();
  const role = liveTree()?.role;
  const s: Session = {
    treeId,
    key,
    version,
    base: file,
    seen: parts(),
    busy: false,
    stop: () => {},
  };
  session = s;
  if (role !== 'owner' && role !== 'reviewer') {
    setStatus('readonly');
    return;
  }
  setStatus('saved');
  s.stop = subscribe(() => {
    if (session !== s || !changed(parts(), s.seen)) return;
    clearTimeout(s.timer);
    setStatus('saving');
    s.timer = setTimeout(() => void flush(s), 1200);
  });
}

export function stopSaving() {
  if (!session) return;
  clearTimeout(session.timer);
  session.stop();
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
      try {
        s.version = await saveTreeFile(s.treeId, s.version, file, s.key);
        s.base = file;
        s.seen = now;
        break;
      } catch (e) {
        if (!(e instanceof SaveConflict) || attempt === 2) throw e;
        const remote = await loadTreeFile(s.treeId, s.key);
        if (!remote) throw e;
        const merged = mergeTreeFiles(s.base, file, remote.file);
        s.base = remote.file;
        s.version = remote.version;
        update((st) => ({
          ...st,
          tree: { ...merged.tree, unions: merged.unions },
          people: merged.people as Person[],
          submissions: merged.submissions,
        }));
      }
    }
    if (session === s) setStatus(changed(parts(), s.seen) ? 'saving' : 'saved');
    if (changed(parts(), s.seen)) s.timer = setTimeout(() => void flush(s), 600);
  } catch {
    if (session === s) setStatus(navigator.onLine ? 'failed' : 'offline');
  } finally {
    s.busy = false;
  }
}

/** Tries a failed save again. */
export function retrySave() {
  if (session) void flush(session);
}

/** Whether leaving now would lose a change that has not reached the server. */
export const unsaved = () => status === 'saving' || status === 'failed' || status === 'offline';
