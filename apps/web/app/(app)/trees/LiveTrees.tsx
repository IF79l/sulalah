'use client';

import { useEffect, useState } from 'react';
import { appEnv } from '@/lib/backend';
import { generations, type Person } from '@/lib/demo-store';
import type { TreeRole } from '@/lib/supabase/types';
import { loadTreeFile } from '@/lib/tree-cloud';
import { treeKey } from '@/lib/tree-keys';
import { TreesFrame, type TreeCard } from './MyTrees';

export interface Membership {
  treeId: string;
  role: TreeRole;
  updatedAt: string;
  invitedBy?: string;
}

const ago = new Intl.RelativeTimeFormat('ar-u-nu-latn', { numeric: 'auto' });
function since(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2592000],
  ];
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let size = 1;
  for (const [u, n] of steps) if (Math.abs(s) >= n) [unit, size] = [u, n];
  return ago.format(Math.round(s / size), unit);
}

/**
 * The person's real trees. The server lists only ids and roles; each tree's name and people
 * are read from its sealed file with the tree's key.
 */
export function LiveTrees({ me, memberships }: { me: string; memberships: Membership[] }) {
  const [cards, setCards] = useState<TreeCard[] | null>(null);

  useEffect(() => {
    let gone = false;
    void Promise.all(
      memberships.map(async (m): Promise<TreeCard> => {
        const base: TreeCard = {
          id: m.treeId,
          title: 'شجرة عائلة',
          note: 'تعذّر فتحها الآن.',
          role: m.role,
          people: 0,
          generations: 0,
          pending: 0,
          activity: `حُفظت ${since(m.updatedAt)}`,
          invitedBy: m.invitedBy,
          faces: [],
        };
        try {
          const key = await treeKey(m.treeId);
          if (!key) return { ...base, note: 'ما حُفظت بعد.' };
          const loaded = await loadTreeFile(m.treeId, key);
          if (!loaded) return { ...base, note: 'ما حُفظت بعد.' };
          const { tree, people, submissions } = loaded.file;
          const root = people.find((p) => p.id === tree.rootId);
          const approved = people.filter((p) => p.status === 'approved');
          return {
            ...base,
            title: tree.title,
            note: root ? `من الجد ${root.name}.` : '',
            people: approved.length,
            generations: generations(people as Person[], tree.rootId),
            pending:
              m.role === 'contributor'
                ? 0
                : submissions.filter((x) => x.status === 'pending').length,
            faces: approved
              .filter((p) => p.fatherId === tree.rootId)
              .slice(0, 4)
              .map((p) => p.name),
          };
        } catch (e) {
          const why = (e as { code?: string; message?: string }) ?? {};
          return appEnv === 'staging'
            ? { ...base, note: `${base.note} (${why.code ?? why.message ?? 'خطأ'})` }
            : base;
        }
      }),
    ).then((list) => {
      if (!gone) setCards(list);
    });
    return () => {
      gone = true;
    };
  }, [memberships]);

  return (
    <TreesFrame
      me={me}
      nav={[{ icon: 'account_tree', label: 'أشجاري', href: '/trees', active: true }]}
      trees={cards ?? []}
      loading={!cards}
    />
  );
}
