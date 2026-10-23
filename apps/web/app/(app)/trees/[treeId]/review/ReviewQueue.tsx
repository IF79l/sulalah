'use client';

import { Chip, Icon, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, EmptyState, Tabs } from '@/components/AppShell';
import { TREE_ID, byId, num, useDemo, type SubmissionStatus } from '@/lib/demo-store';

const t = (p = '') => `/trees/${TREE_ID}${p}`;

/** S16: submissions waiting on me, grouped as they were sent. */
export function ReviewQueue() {
  const s = useDemo();
  const [tab, setTab] = useState<SubmissionStatus>('pending');
  const [scope, setScope] = useState<'all' | 'matrouk'>('all');
  const m = byId(s.people);
  const count = (st: SubmissionStatus) => s.submissions.filter((x) => x.status === st).length;
  const inScope = (fatherId: string) => {
    if (scope === 'all') return true;
    for (let p = m.get(fatherId); p; p = p.fatherId ? m.get(p.fatherId) : undefined) if (p.id === scope) return true;
    return false;
  };
  const list = s.submissions.filter((x) => x.status === tab && inScope(x.fatherId));

  return (
    <AppShell title="الإضافات الواردة" subtitle="راجع ما أرسلته العائلة على الشجرة نفسها، ثم اعتمده أو اطلب تعديله.">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'بانتظارك', count: count('pending') },
          { value: 'changes', label: 'يحتاج تعديل', count: count('changes') },
          { value: 'approved', label: 'معتمدة', count: count('approved') },
          { value: 'rejected', label: 'مرفوضة', count: count('rejected') },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-caption">
        <span className="text-muted">النطاق:</span>
        {(
          [
            ['all', 'الشجرة كاملة'],
            ['matrouk', 'غصن متروك (معاينة المدقق)'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setScope(v)}
            className={cn('rounded-full border px-3 py-1 font-medium', scope === v ? 'border-forest bg-olive-soft/50 text-forest' : 'border-line/60 text-ink-soft')}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length ? (
        <ul className="grid gap-4">
          {list.map((x) => {
            const people = x.personIds.map((id) => m.get(id)).filter(Boolean);
            const father = m.get(x.fatherId);
            return (
              <li key={x.id} className="grid gap-4 rounded-2xl border border-line/40 bg-card p-5 transition hover:border-gold-light md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Medallion name={x.contributor} />
                    <div className="grid">
                      <p className="text-body font-semibold text-forest">
                        {x.contributor} أرسل {num(x.personIds.length)} {x.personIds.length > 2 ? 'إضافات' : x.personIds.length === 2 ? 'إضافتين' : 'إضافة'}
                      </p>
                      <p className="text-caption text-muted">
                        تحت {father?.name}، {x.at}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {people.map((p) => (
                      <span
                        key={p!.id}
                        className={cn(
                          'rounded-[0_0.9rem_0_0.9rem] border px-3 py-1 text-caption font-semibold',
                          tab === 'pending' ? 'border-dashed border-pending bg-pending-soft text-pending' : p!.gender === 'female' ? 'border-transparent bg-blossom/15 text-[#a2466f]' : 'border-transparent bg-leaf/12 text-leaf',
                        )}
                      >
                        {p!.name}
                      </span>
                    ))}
                    {x.warnings?.map((w) => (
                      <Chip key={w} tone="pending" icon="warning">
                        {w}
                      </Chip>
                    ))}
                  </div>
                  {x.note ? <p className="text-caption text-muted">ملاحظتك: «{x.note}»</p> : null}
                </div>
                {tab === 'pending' ? (
                  <Link href={`${t()}?review=${x.id}`} className={cn(buttonClass('primary', 'sm'), 'rounded-xl')}>
                    <Icon name="account_tree" />
                    راجع على الشجرة
                  </Link>
                ) : tab === 'approved' ? (
                  <Link href={`${t()}?focus=${x.fatherId}`} className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}>
                    شوفها على الشجرة
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon="task_alt"
          title={tab === 'pending' ? 'ما فيه شي بانتظارك' : 'ما فيه شي هنا'}
          body={tab === 'pending' ? 'الشجرة محدّثة. أي إضافة جديدة من العائلة توصلك هنا وفي الإشعارات.' : undefined}
          action={
            <Link href={t()} className={buttonClass('quiet', 'sm')}>
              ارجع للشجرة
            </Link>
          }
        />
      )}
    </AppShell>
  );
}
