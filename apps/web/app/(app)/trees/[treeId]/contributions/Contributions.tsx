'use client';

import { Chip, Icon, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, EmptyState, Tabs, Toast } from '@/components/AppShell';
import {
  TREE_ID,
  byId,
  myName,
  num,
  update,
  useDemo,
  type Person,
} from '@/lib/demo-store';

type Tab = 'drafts' | 'pending' | 'approved' | 'rejected';
const t = (p = '') => `/trees/${TREE_ID}${p}`;

const leaf: Record<Tab, string> = {
  drafts: 'border-[1.5px] border-dashed border-line bg-card',
  pending: 'border-[1.5px] border-dashed border-pending bg-pending-soft',
  approved: 'bg-[#6fa65e]',
  rejected: 'bg-surface-highest',
};

/** S15: everything I added, by where it stands. */
export function Contributions() {
  const s = useDemo();
  const [tab, setTab] = useState<Tab>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const m = byId(s.people);
  const me = myName(s);

  // The demo account also shows the sample family's history as if it were its own.
  const mine = s.submissions.filter((x) => x.contributor === me || x.id === 'sub-1' || x.id === 'sub-0');
  const drafts = s.drafts.map((id) => m.get(id)).filter((p): p is Person => !!p);
  const groups = {
    pending: mine.filter((x) => x.status === 'pending' || x.status === 'changes'),
    approved: mine.filter((x) => x.status === 'approved'),
    rejected: [
      ...mine.filter((x) => x.status === 'rejected'),
      { id: 'sub-x', contributor: me, fatherId: 'bandar', personIds: [], at: 'قبل 3 أسابيع', status: 'rejected' as const, note: 'الاسم مكرر، سلمان مسجّل من قبل', names: ['سلمان'] },
    ],
  };

  const items = (subId: string, ids: string[], names?: string[]) =>
    names ?? ids.map((id) => m.get(id)?.name).filter(Boolean);

  const withdraw = (id: string) => {
    update((st) => {
      const sub = st.submissions.find((x) => x.id === id);
      return {
        ...st,
        people: st.people.filter((p) => !sub?.personIds.includes(p.id)),
        submissions: st.submissions.filter((x) => x.id !== id),
      };
    });
    setToast('سحبنا الطلب');
  };

  const list = tab === 'drafts' ? [] : groups[tab];

  return (
    <AppShell
      title="مساهماتي"
      subtitle="كل ما أضفته في الشجرة، وأين وصل."
      actions={
        <Link href={t('?as=contribute')} className={buttonClass('primary', 'sm')}>
          <Icon name="call_split" />
          اذهب لغصنك
        </Link>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'drafts', label: 'مسودات', count: drafts.length },
          { value: 'pending', label: 'بانتظار الاعتماد', count: groups.pending.length },
          { value: 'approved', label: 'معتمدة', count: groups.approved.length },
          { value: 'rejected', label: 'مرفوضة', count: groups.rejected.length },
        ]}
      />

      {tab === 'drafts' ? (
        drafts.length ? (
          <ul className="grid gap-3">
            {drafts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line/40 bg-card p-4">
                <span className={cn('size-6 shrink-0 rounded-[0_60%_0_60%]', leaf.drafts)} />
                <span className="grid flex-1">
                  <span className="text-body font-semibold text-forest">{p.name}</span>
                  <span className="text-caption text-muted">
                    {p.gender === 'female' ? 'ابنة' : 'ابن'} {m.get(p.fatherId ?? '')?.name}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-caption font-semibold text-danger hover:underline"
                  onClick={() => update((st) => ({ ...st, people: st.people.filter((x) => x.id !== p.id), drafts: st.drafts.filter((x) => x !== p.id) }))}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="edit_note" title="ما عندك مسودات" body="الإضافات اللي ما أرسلتها للاعتماد تظهر هنا." />
        )
      ) : list.length ? (
        <ul className="grid gap-3">
          {list.map((x) => {
            const names = items(x.id, x.personIds, 'names' in x ? x.names : undefined);
            const changes = x.status === 'changes';
            return (
              <li key={x.id} className="grid gap-3 rounded-2xl border border-line/40 bg-card p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={cn('mt-1 size-6 shrink-0 rounded-[0_60%_0_60%]', leaf[tab])} />
                    <div className="grid gap-0.5">
                      <p className="text-body font-semibold text-forest">{names.join('، ')}</p>
                      <p className="text-caption text-muted">
                        تحت {m.get(x.fatherId)?.name}، {x.at}
                      </p>
                    </div>
                  </div>
                  <Chip tone={tab === 'approved' ? 'success' : tab === 'rejected' ? 'danger' : changes ? 'olive' : 'pending'}>
                    {tab === 'approved' ? 'معتمدة' : tab === 'rejected' ? 'مرفوضة' : changes ? 'يحتاج تعديل' : 'بانتظار الاعتماد'}
                  </Chip>
                </div>
                {x.note ? (
                  <blockquote className="border-s-4 border-gold-light bg-surface-low px-4 py-2.5 text-body text-ink-soft">
                    «{x.note}»
                  </blockquote>
                ) : null}
                <div className="flex flex-wrap gap-3 text-caption font-semibold">
                  {tab === 'pending' ? (
                    <button type="button" onClick={() => withdraw(x.id)} className="text-danger hover:underline">
                      سحب الطلب
                    </button>
                  ) : null}
                  {tab === 'rejected' || changes ? (
                    <Link href={t('?as=contribute')} className="text-olive hover:underline">
                      عدّل وأعد الإرسال
                    </Link>
                  ) : null}
                  {tab === 'approved' ? (
                    <Link href={`${t()}?focus=${x.fatherId}`} className="text-olive hover:underline">
                      شوفها على الشجرة
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon="eco"
          title="ما أضفت أحد بعد"
          body="ابدأ من غصنك: اضغط على اسمك وأضف أبناءك وبناتك."
          action={
            <Link href={t('?as=contribute')} className={buttonClass('primary', 'sm')}>
              اذهب لغصنك
            </Link>
          }
        />
      )}
      <p className="mt-6 text-caption text-muted">{num(mine.length)} طلبات منذ انضمامك.</p>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}
