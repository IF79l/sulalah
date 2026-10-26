'use client';

/**
 * A person's notifications on real trees. The server keeps who did what and how many; the
 * words are put together here, with the tree's name and the branch read from the tree file.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { backendOn } from '@/lib/backend';
import { listNotices, markNoticesRead, unreadNotices, type Notice } from '@/lib/collab-cloud';
import { getState, liveTree, num } from '@/lib/demo-store';
import { loadTreeFile } from '@/lib/tree-cloud';
import { treeKey } from '@/lib/tree-keys';

interface TreeWords {
  title: string;
  names: Map<string, string>;
}

let unread = 0;
let list: Notice[] | null = null;
const words = new Map<string, TreeWords | null>();
const watchers = new Set<() => void>();
const ping = () => watchers.forEach((w) => w());

/** The open tree's words come from the store; others from their file, once per visit. */
async function wordsFor(treeId: string): Promise<TreeWords | null> {
  if (liveTree()?.treeId === treeId) {
    const s = getState();
    return { title: s.tree.title, names: new Map(s.people.map((p) => [p.id, p.name])) };
  }
  if (words.has(treeId)) return words.get(treeId)!;
  let w: TreeWords | null = null;
  try {
    const key = await treeKey(treeId);
    if (key) {
      const loaded = await loadTreeFile(treeId, key);
      if (loaded)
        w = {
          title: loaded.file.tree.title,
          names: new Map(loaded.file.people.map((p) => [p.id, p.name])),
        };
    }
  } catch {
    w = null;
  }
  words.set(treeId, w);
  return w;
}

export async function refreshUnread() {
  if (!backendOn) return;
  try {
    unread = await unreadNotices();
    ping();
  } catch {
    // The badge waits for the next look.
  }
}

export async function refreshNotices() {
  const got = await listNotices();
  await Promise.all([...new Set(got.map((n) => n.treeId))].map(wordsFor));
  list = got;
  unread = got.filter((n) => !n.read).length;
  ping();
}

export async function readNotices(ids?: string[]) {
  if (list) list = list.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n));
  unread = list ? list.filter((n) => !n.read).length : 0;
  ping();
  await markNoticesRead(ids).catch(() => {});
}

function useWatch<T>(get: () => T, server: T) {
  return useSyncExternalStore(
    (w) => {
      watchers.add(w);
      return () => watchers.delete(w);
    },
    get,
    () => server,
  );
}

/** The unread count for the bell, kept fresh when the person comes back to the tab. */
export function useUnread() {
  useEffect(() => {
    if (!backendOn) return;
    void refreshUnread();
    const back = () => document.visibilityState === 'visible' && void refreshUnread();
    document.addEventListener('visibilitychange', back);
    const every = setInterval(() => void refreshUnread(), 90_000);
    return () => {
      document.removeEventListener('visibilitychange', back);
      clearInterval(every);
    };
  }, []);
  return useWatch(() => unread, 0);
}

export function useNoticeList() {
  return useWatch(() => list, null);
}

const additions = (n: number) =>
  n === 1 ? 'إضافة' : n === 2 ? 'إضافتين' : n >= 3 && n <= 10 ? `${num(n)} إضافات` : `${num(n)} إضافة`;

/** The line, icon and link for one notification. */
export function describe(n: Notice): { text: string; icon: string; href: string } {
  const w = words.get(n.treeId);
  const open = liveTree()?.treeId === n.treeId ? getState() : null;
  const tree = open?.tree.title ?? w?.title ?? 'شجرة العائلة';
  const at = n.ref ? (open?.people.find((p) => p.id === n.ref)?.name ?? w?.names.get(n.ref)) : undefined;
  const t = (p = '') => `/trees/${n.treeId}${p}`;
  switch (n.kind) {
    case 'submitted':
      return {
        icon: 'person_add',
        text: `أرسل ${n.actor} ${additions(n.count)}${at ? ` لغصن ${at}` : ''} في ${tree}`,
        href: t('/review'),
      };
    case 'approved':
      return {
        icon: 'eco',
        text: `اعتمد ${n.actor} ${n.count === 1 ? 'إضافتك' : 'إضافاتك'} في ${tree}، ونبتت في الشجرة`,
        href: n.ref ? t(`?focus=${n.ref}`) : t(),
      };
    case 'partly_approved':
      return {
        icon: 'eco',
        text: `اعتمد ${n.actor} ${additions(n.count)} من إضافاتك في ${tree}، واستبعد الباقي`,
        href: t('/contributions'),
      };
    case 'changes':
      return {
        icon: 'edit_note',
        text: `طلب ${n.actor} تعديلًا على إضافاتك في ${tree}`,
        href: t('/contributions'),
      };
    case 'rejected':
      return {
        icon: 'block',
        text: `ما اعتمد ${n.actor} إضافاتك في ${tree}. السبب في مساهماتك`,
        href: t('/contributions'),
      };
    case 'withdrawn':
      return { icon: 'undo', text: `سحب ${n.actor} إضافاته من ${tree}`, href: t('/review') };
    case 'joined':
      return { icon: 'group_add', text: `انضم ${n.actor} إلى ${tree} عبر رابط الدعوة`, href: t('/reviewers') };
    case 'made_reviewer':
      return { icon: 'verified_user', text: `جعلك ${n.actor} مدققًا في ${tree}`, href: t('/review') };
    case 'made_contributor':
      return { icon: 'person', text: `صرت مساهمًا في ${tree} بعد ما كنت مدققًا`, href: t() };
    case 'owner_now':
      return { icon: 'key', text: `نقل لك ${n.actor} ملكية ${tree}`, href: t('/settings') };
    case 'left':
      return {
        icon: 'person_remove',
        text: n.actorGone ? `غادر أحد الأعضاء ${tree} وحذف حسابه` : `غادر ${n.actor} ${tree}`,
        href: t('/reviewers'),
      };
    case 'removed':
      // They can no longer open the tree, so the link goes to their own trees.
      return { icon: 'person_off', text: `أزالك ${n.actor} من ${tree}`, href: '/trees' };
  }
}
