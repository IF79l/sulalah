'use client';

import { Icon, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, EmptyState } from '@/components/AppShell';
import { TREE_ID, useDemo, type Action } from '@/lib/demo-store';

const actions: { value: Action | 'all'; label: string; icon: string; tone: string }[] = [
  { value: 'all', label: 'الكل', icon: 'list', tone: '' },
  { value: 'add', label: 'أضاف', icon: 'person_add', tone: 'bg-olive-soft text-on-olive-soft' },
  { value: 'edit', label: 'عدّل', icon: 'edit', tone: 'bg-surface-high text-ink-soft' },
  { value: 'approve', label: 'اعتمد', icon: 'verified', tone: 'bg-success-soft text-success' },
  { value: 'reject', label: 'رفض', icon: 'block', tone: 'bg-danger-soft text-danger' },
  { value: 'invite', label: 'دعا', icon: 'link', tone: 'bg-gold-light/40 text-[#7a6236]' },
  { value: 'delete', label: 'حذف', icon: 'delete', tone: 'bg-danger-soft text-danger' },
];

/** S19: the owner's full record of who did what. */
export function Activity() {
  const s = useDemo();
  const [action, setAction] = useState<Action | 'all'>('all');
  const [who, setWho] = useState('all');
  const people = [...new Set(s.log.map((l) => l.who))];
  const list = s.log.filter((l) => (action === 'all' || l.action === action) && (who === 'all' || l.who === who));

  return (
    <AppShell title="سجل النشاط" subtitle="كل إضافة وتعديل واعتماد في الشجرة، ومن سواه." back={{ href: `/trees/${TREE_ID}/settings`, label: 'إعدادات الشجرة' }}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAction(a.value)}
            className={cn('rounded-full border px-3 py-1.5 text-caption font-medium', action === a.value ? 'border-forest bg-forest text-ivory' : 'border-line/60 text-ink-soft hover:border-forest')}
          >
            {a.label}
          </button>
        ))}
        <select value={who} onChange={(e) => setWho(e.target.value)} className="ms-auto h-9 rounded-full border border-line/60 bg-card px-3 text-caption">
          <option value="all">كل الأشخاص</option>
          {people.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      {list.length ? (
        <ol className="relative grid gap-4 ps-6 before:absolute before:inset-y-2 before:start-[0.7rem] before:w-px before:bg-line/60">
          {list.map((l) => {
            const a = actions.find((x) => x.value === l.action)!;
            return (
              <li key={l.id} className="relative">
                <span className={cn('absolute -start-6 top-3 flex size-6 items-center justify-center rounded-full ring-4 ring-ivory', a.tone)}>
                  <Icon name={a.icon} className="text-[0.85rem]" />
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/40 bg-card p-4">
                  <div className="grid gap-0.5">
                    <p className="text-body text-ink">
                      <strong className="text-forest">{l.who}</strong> {l.text}
                    </p>
                    <p className="text-caption text-muted">{l.at}</p>
                  </div>
                  {l.personId ? (
                    <Link href={`/trees/${TREE_ID}?focus=${l.personId}`} className="text-caption font-semibold text-olive hover:underline">
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
