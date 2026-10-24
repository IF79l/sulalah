'use client';

import { Chip, Icon, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, EmptyState, Tabs } from '@/components/AppShell';
import { BranchGlimpse } from '@/components/Botanical';
import {
  currentTreeId,
  byId,
  canReview,
  demoReviewer,
  num,
  useDemo,
  type SubmissionStatus,
} from '@/lib/demo-store';

const t = (p = '') => `/trees/${currentTreeId()}${p}`;

/** S16: submissions waiting on me, grouped as they were sent. */
export function ReviewQueue() {
  const s = useDemo();
  const [tab, setTab] = useState<SubmissionStatus>('pending');
  const m = byId(s.people);
  // A reviewer sees only what hangs from their branches; the rest is the owner's.
  const mine = s.submissions.filter((x) => canReview(s, x.fatherId));
  const outside =
    s.submissions.filter((x) => x.status === 'pending').length -
    mine.filter((x) => x.status === 'pending').length;
  const count = (st: SubmissionStatus) => mine.filter((x) => x.status === st).length;
  const list = mine.filter((x) => x.status === tab);
  const r = demoReviewer(s);
  const scopeName =
    s.as === 'reviewer' && r && r.scope !== 'all'
      ? r.scope.map((id) => `غصن ${m.get(id)?.name ?? ''}`).join('، ')
      : null;

  return (
    <AppShell
      need="review.view"
      title="الإضافات الواردة"
      subtitle="راجع ما أرسلته العائلة على الشجرة نفسها، ثم اعتمده أو اطلب تعديله."
    >
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
      {scopeName ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line/40 bg-surface-low px-4 py-2.5 text-caption text-ink-soft">
          <Icon name="call_split" className="text-[1.1rem] text-olive" />
          تشوف إضافات {scopeName} فقط، لأنه نطاقك كمدقق.
          {outside > 0 ? (
            <span className="text-muted">({num(outside)} خارج نطاقك يعتمدها المالك)</span>
          ) : null}
        </p>
      ) : null}

      {list.length ? (
        <ul className="grid gap-4">
          {list.map((x) => {
            const people = x.personIds.map((id) => m.get(id)).filter(Boolean);
            const father = m.get(x.fatherId);
            return (
              <li
                key={x.id}
                className="grid gap-4 overflow-hidden rounded-2xl border border-line/40 bg-card p-5 transition hover:border-gold-light hover:shadow-float md:grid-cols-[minmax(0,1fr)_17rem] md:items-center"
              >
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Medallion name={x.contributor} />
                    <div className="grid">
                      <p className="text-body font-semibold text-forest">
                        {x.contributor} أرسل {num(x.personIds.length)}{' '}
                        {x.personIds.length > 2
                          ? 'إضافات'
                          : x.personIds.length === 2
                            ? 'إضافتين'
                            : 'إضافة'}
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
                          tab === 'pending'
                            ? 'border-dashed border-pending bg-pending-soft text-pending'
                            : p!.gender === 'female'
                              ? 'border-transparent bg-blossom/15 text-[#a2466f]'
                              : 'border-transparent bg-leaf/12 text-leaf',
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
                  {x.note ? <p className="text-caption text-muted">ملاحظتك: "{x.note}"</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tab === 'pending' ? (
                      <Link
                        href={`${t()}?review=${x.id}`}
                        className={cn(buttonClass('primary', 'sm'), 'rounded-xl')}
                      >
                        <Icon name="account_tree" />
                        راجع على الشجرة
                      </Link>
                    ) : tab === 'approved' ? (
                      <Link
                        href={`${t()}?focus=${x.fatherId}`}
                        className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}
                      >
                        شوفها على الشجرة
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="star-ground rounded-xl border border-gold-light/30 bg-ivory px-2 pt-1 max-md:order-first">
                  <BranchGlimpse
                    father={father?.name ?? ''}
                    leaves={people.map((p) => ({
                      id: p!.id,
                      name: p!.name,
                      gender: p!.gender,
                      pending: tab !== 'approved',
                    }))}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon="task_alt"
          title={tab === 'pending' ? 'ما فيه شي بانتظارك' : 'ما فيه شي هنا'}
          body={
            tab === 'pending'
              ? 'الشجرة محدّثة. أي إضافة جديدة من العائلة توصلك هنا وفي الإشعارات.'
              : undefined
          }
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
