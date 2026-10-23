'use client';

import { Button, Chip, Icon, IconButton, Medallion, Sheet, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, Toast } from '@/components/AppShell';
import {
  TREE_ID,
  byId,
  childrenOf,
  myName,
  newId,
  num,
  planLimits,
  update,
  useDemo,
  type Reviewer,
} from '@/lib/demo-store';

// Relatives who already joined through an invite; only they can become reviewers.
const members = ['سالم بن متروك', 'ماجد بن سالم', 'نواف بن سلطان', 'راكان بن فيصل', 'عمر بن تركي', 'بندر بن ناصر', 'خالد بن عبدالله'];

/** S18: who reviews what, within the plan's seats. */
export function Reviewers() {
  const s = useDemo();
  const [editing, setEditing] = useState<Reviewer | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const m = byId(s.people);
  const seats = planLimits(s).maxReviewers;
  const used = s.reviewers.length;
  const full = used >= seats;

  return (
    <AppShell
      title="المدققون"
      subtitle="المدقق يعتمد الإضافات في الأغصان اللي تحددها له فقط. وأنت المدقق الرئيسي على الشجرة كاملة."
      actions={
        full ? (
          <Link href={`/trees/${TREE_ID}/plan`} className={buttonClass('quiet', 'sm')}>
            رقِّ الباقة لإضافة مدققين
          </Link>
        ) : (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Icon name="person_add" />
            أضف مدققًا
          </Button>
        )
      }
    >
      <div className="mb-6 grid gap-2 rounded-2xl border border-line/40 bg-card p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-body font-semibold text-forest">المقاعد المستخدمة</span>
          <span className="text-title font-bold tabular-nums text-forest">
            {num(used)} <span className="text-body font-normal text-muted">من {num(seats)}</span>
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-high">
          <div className="h-full rounded-full bg-olive transition-all" style={{ width: `${(used / seats) * 100}%` }} />
        </div>
      </div>

      <ul className="grid gap-3">
        <li className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold-light/60 bg-ivory-deep/60 p-4">
          <Medallion name={s.me.first} />
          <div className="grid flex-1">
            <span className="text-body font-semibold text-forest">أنت، {myName(s)}</span>
            <span className="text-caption text-muted">المدقق الرئيسي، ولا يمكن إزالته</span>
          </div>
          <Chip tone="forest">الشجرة كاملة</Chip>
        </li>
        {s.reviewers.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line/40 bg-card p-4">
            <Medallion name={r.name} />
            <div className="grid min-w-0 flex-1 gap-1">
              <span className="text-body font-semibold text-forest">{r.name}</span>
              <span className="flex flex-wrap gap-1.5">
                {r.scope === 'all' ? (
                  <Chip tone="olive">الشجرة كاملة</Chip>
                ) : (
                  r.scope.map((id) => (
                    <Chip key={id} tone="olive">
                      غصن {m.get(id)?.name}
                    </Chip>
                  ))
                )}
                <span className="text-caption text-muted">راجع {num(r.reviewed)} إضافة</span>
              </span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="quiet" onClick={() => setEditing(r)}>
                تعديل النطاق
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onClick={() => {
                  update((st) => ({ ...st, reviewers: st.reviewers.filter((x) => x.id !== r.id) }));
                  setToast(`ألغينا صلاحية ${r.name}`);
                }}
              >
                إلغاء الصلاحية
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <ReviewerSheet
          reviewer={editing === 'new' ? undefined : editing}
          taken={s.reviewers.map((r) => r.name)}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            update((st) => ({
              ...st,
              reviewers: st.reviewers.some((x) => x.id === r.id) ? st.reviewers.map((x) => (x.id === r.id ? r : x)) : [...st.reviewers, r],
            }));
            setEditing(null);
            setToast(editing === 'new' ? `صار ${r.name} مدققًا` : 'حفظنا النطاق');
          }}
          branchName={(id) => m.get(id)?.name ?? ''}
          branches={childrenOf(s.people, s.tree.rootId)
            .filter((p) => p.gender === 'male')
            .map((p) => ({ id: p.id, name: p.name, sons: childrenOf(s.people, p.id).filter((c) => c.gender === 'male').map((c) => ({ id: c.id, name: c.name })) }))}
        />
      ) : null}
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}

function ReviewerSheet({
  reviewer,
  taken,
  branches,
  branchName,
  onSave,
  onClose,
}: {
  reviewer?: Reviewer;
  taken: string[];
  branches: { id: string; name: string; sons: { id: string; name: string }[] }[];
  branchName: (id: string) => string;
  onSave: (r: Reviewer) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(reviewer?.name ?? '');
  const [all, setAll] = useState(reviewer?.scope === 'all');
  const [picked, setPicked] = useState<Set<string>>(new Set(reviewer && reviewer.scope !== 'all' ? reviewer.scope : []));
  const toggle = (id: string) => {
    const n = new Set(picked);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setPicked(n);
  };
  const free = members.filter((x) => !taken.includes(x) || x === reviewer?.name);
  return (
    <Sheet label={reviewer ? 'تعديل النطاق' : 'أضف مدققًا'}>
      <div className="flex items-center justify-between border-b border-line/25 bg-surface-low/60 px-4 py-2.5">
        <span className="text-body font-semibold text-forest">{reviewer ? `نطاق ${reviewer.name}` : 'أضف مدققًا'}</span>
        <IconButton label="إغلاق" className="size-8" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>
      <div className="grid gap-4 overflow-y-auto p-5">
        {!reviewer ? (
          <label className="grid gap-1.5">
            <span className="text-body font-medium text-ink">من أهل الشجرة</span>
            <select value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl border border-line/70 bg-card px-3 text-body">
              <option value="">اختر شخصًا انضم للشجرة</option>
              {free.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <span className="text-caption text-muted">يظهر هنا فقط من انضم عبر رابط دعوة.</span>
          </label>
        ) : null}

        <label className="flex items-center justify-between gap-3 rounded-xl border border-line/40 p-3">
          <span className="grid">
            <span className="text-body font-semibold text-forest">الشجرة كاملة</span>
            <span className="text-caption text-muted">يراجع أي إضافة في أي غصن</span>
          </span>
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="size-5 accent-[var(--color-forest)]" />
        </label>

        {!all ? (
          <div className="grid gap-2">
            <span className="text-body font-medium text-ink">أو اختر أغصانًا</span>
            <div className="grid gap-3 rounded-2xl bg-ivory-deep/60 p-4">
              {branches.map((b) => (
                <div key={b.id} className="grid gap-2">
                  <button
                    type="button"
                    aria-pressed={picked.has(b.id)}
                    onClick={() => toggle(b.id)}
                    className={cn(
                      'flex items-center gap-2 justify-self-start rounded-full border-2 px-3 py-1.5 text-body font-semibold transition',
                      picked.has(b.id) ? 'border-forest bg-forest text-gold-light' : 'border-gold-light bg-card text-forest',
                    )}
                  >
                    <Icon name={picked.has(b.id) ? 'check_circle' : 'radio_button_unchecked'} className="text-[1.1rem]" />
                    غصن {b.name}
                  </button>
                  <div className="flex flex-wrap gap-1.5 border-s-2 border-[#7a5a3a]/40 ps-3">
                    {b.sons.map((c) => {
                      const on = picked.has(c.id) || picked.has(b.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={picked.has(b.id)}
                          aria-pressed={on}
                          onClick={() => toggle(c.id)}
                          className={cn(
                            'rounded-[0_0.9rem_0_0.9rem] px-3 py-1 text-caption font-semibold transition',
                            on ? 'bg-[#6fa65e] text-white' : 'bg-card text-ink-soft hover:bg-olive-soft/50',
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {picked.size ? (
              <p className="text-caption text-muted">
                يراجع: {[...picked].map((id) => `غصن ${branchName(id)}`).join('، ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          className="rounded-xl"
          disabled={(!reviewer && !name) || (!all && picked.size === 0)}
          onClick={() =>
            onSave({
              id: reviewer?.id ?? newId('r'),
              name: reviewer?.name ?? name,
              scope: all ? 'all' : [...picked],
              reviewed: reviewer?.reviewed ?? 0,
            })
          }
        >
          {reviewer ? 'حفظ النطاق' : 'أضفه مدققًا'}
        </Button>
      </div>
    </Sheet>
  );
}
