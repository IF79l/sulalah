'use client';

import { Icon, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, EmptyState } from '@/components/AppShell';
import { VineLeaf } from '@/components/Botanical';
import { TREE_ID, allows, useDemo, type Action } from '@/lib/demo-store';

// Each kind of change is a leaf colour on the vine: new growth green, approval deep green,
// edits and invites gold, removals withered.
const actions: {
  value: Action | 'all';
  label: string;
  icon: string;
  tone: string;
  leaf: string;
}[] = [
  { value: 'all', label: 'الكل', icon: 'list', tone: '', leaf: '' },
  { value: 'add', label: 'أضاف', icon: 'person_add', tone: 'text-olive', leaf: '#6fa65e' },
  { value: 'edit', label: 'عدّل', icon: 'edit', tone: 'text-[#7a6236]', leaf: '#c9ad78' },
  { value: 'approve', label: 'اعتمد', icon: 'verified', tone: 'text-success', leaf: '#2d6a4f' },
  { value: 'reject', label: 'رفض', icon: 'block', tone: 'text-danger', leaf: '#b98a7a' },
  { value: 'invite', label: 'دعا', icon: 'link', tone: 'text-[#7a6236]', leaf: '#dfc9a1' },
  { value: 'delete', label: 'حذف', icon: 'delete', tone: 'text-danger', leaf: '#a8a08f' },
];

/** S19: the owner's full record of who did what. */
export function Activity() {
  const s = useDemo();
  const [action, setAction] = useState<Action | 'all'>('all');
  const [who, setWho] = useState('all');
  const people = [...new Set(s.log.map((l) => l.who))];
  const list = s.log.filter(
    (l) => (action === 'all' || l.action === action) && (who === 'all' || l.who === who),
  );

  return (
    <AppShell
      need="activity.view"
      title="سجل النشاط"
      subtitle="كل إضافة وتعديل واعتماد في الشجرة، ومن سواه."
      back={
        allows(s, { type: 'tree.manage' })
          ? { href: `/trees/${TREE_ID}/settings`, label: 'إعدادات الشجرة' }
          : undefined
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAction(a.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-caption font-medium',
              action === a.value
                ? 'border-forest bg-forest text-ivory'
                : 'border-line/60 text-ink-soft hover:border-forest',
            )}
          >
            {a.label}
          </button>
        ))}
        <select
          value={who}
          onChange={(e) => setWho(e.target.value)}
          className="ms-auto h-9 rounded-full border border-line/60 bg-card px-3 text-caption"
        >
          <option value="all">كل الأشخاص</option>
          {people.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      {list.length ? (
        <ol className="relative grid gap-4 ps-8 before:absolute before:inset-y-3 before:start-[0.6rem] before:w-[3px] before:rounded-full before:bg-linear-to-b before:from-[#8f7b56] before:to-[#6b4329]">
          {list.map((l) => {
            const a = actions.find((x) => x.value === l.action)!;
            return (
              <li key={l.id} className="relative">
                <VineLeaf
                  tone={a.leaf}
                  className="absolute -start-[1.6rem] top-4 size-6 -scale-x-100 drop-shadow-sm"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/40 bg-card p-4">
                  <div className="grid gap-0.5">
                    <p className="text-body text-ink">
                      <Icon
                        name={a.icon}
                        className={cn('me-1.5 align-[-0.2em] text-[1.05rem]', a.tone)}
                      />
                      <strong className="text-forest">{l.who}</strong> {l.text}
                    </p>
                    <p className="text-caption text-muted">{l.at}</p>
                  </div>
                  {l.personId ? (
                    <Link
                      href={`/trees/${TREE_ID}?focus=${l.personId}`}
                      className="text-caption font-semibold text-olive hover:underline"
                    >
                      على الشجرة
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon="history" title="ما فيه نشاط بهذا الفلتر" />
      )}
    </AppShell>
  );
}
