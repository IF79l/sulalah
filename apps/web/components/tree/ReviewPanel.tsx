'use client';

import { Button, Chip, Icon, IconButton, Medallion, Sheet, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import {
  currentTreeId,
  approve,
  byId,
  num,
  sendBack,
  type Person,
  type Submission,
  when,
} from '@/lib/demo-store';
import { tellContributor } from '@/lib/live-actions';

/**
 * S17: one submission, reviewed on the tree. Every proposed person is a row; unticking a
 * parent unticks his children, since a child cannot stand without his father.
 */
export function ReviewPanel({
  submission,
  people,
  reviewer,
  outOfScope,
  paused,
  nextId,
  onDone,
  onClose,
}: {
  submission: Submission;
  people: Person[];
  reviewer: string;
  outOfScope?: boolean;
  /** The plan lapsed: nothing can be approved until the owner subscribes again. */
  paused?: boolean;
  nextId?: string;
  onDone: (text: string) => void;
  onClose: () => void;
}) {
  const m = byId(people);
  const father = m.get(submission.fatherId);
  const proposed = submission.personIds.map((id) => m.get(id)).filter((p): p is Person => !!p);
  const [keep, setKeep] = useState<Set<string>>(new Set(proposed.map((p) => p.id)));
  const [mode, setMode] = useState<'changes' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const descendants = (id: string): string[] =>
    proposed.filter((p) => p.fatherId === id).flatMap((c) => [c.id, ...descendants(c.id)]);
  const depthOf = (p: Person): number => (p.fatherId && proposed.some((x) => x.id === p.fatherId) ? 1 + depthOf(m.get(p.fatherId)!) : 0);
  const toggle = (p: Person) => {
    const next = new Set(keep);
    if (next.has(p.id)) {
      next.delete(p.id);
      descendants(p.id).forEach((d) => next.delete(d));
    } else {
      next.add(p.id);
      // Ticking a child brings his proposed father back with him.
      for (let f = p.fatherId; f && proposed.some((x) => x.id === f); f = m.get(f)?.fatherId) next.add(f);
    }
    setKeep(next);
  };

  const header = (
    <div className="flex items-center justify-between border-b border-line/25 bg-surface-low/60 px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-body font-semibold text-forest">
        <Icon name="fact_check" className="text-olive" />
        <span className="truncate">مراجعة إضافات {submission.contributor.split(' ')[0]}</span>
      </span>
      <IconButton label="إغلاق" className="size-8" onClick={onClose}>
        <Icon name="close" />
      </IconButton>
    </div>
  );

  if (outOfScope) {
    return (
      <Sheet label="خارج نطاقك">
        {header}
        <div className="grid justify-items-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-muted">
            <Icon name="lock" className="text-[1.75rem]" />
          </span>
          <p className="text-title font-bold text-forest">هذا الغصن خارج نطاق مراجعتك</p>
          <p className="text-body text-muted">يراجعه المالك أو مدقق مسؤول عن غصن {father?.name}.</p>
          <Link href={`/trees/${currentTreeId()}/review`} className="text-body font-semibold text-olive hover:underline">
            ارجع للإضافات الواردة
          </Link>
        </div>
      </Sheet>
    );
  }

  if (done) {
    return (
      <Sheet label="تمت المراجعة">
        {header}
        <div className="grid justify-items-center gap-3 p-8 text-center">
          <span className="flex size-16 animate-rise items-center justify-center rounded-full bg-success-soft text-success">
            <Icon name="eco" fill className="text-[2rem]" />
          </span>
          <p className="text-title font-bold text-forest">{done}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {nextId ? (
              <Link
                href={`/trees/${currentTreeId()}?review=${nextId}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-forest px-5 font-semibold text-ivory"
              >
                الطلب التالي
                <Icon name="arrow_back" />
              </Link>
            ) : null}
            <Link
              href={`/trees/${currentTreeId()}/review`}
              className="inline-flex h-11 items-center rounded-xl border border-line px-5 font-semibold text-forest"
            >
              كل الإضافات
            </Link>
          </div>
        </div>
      </Sheet>
    );
  }

  const finish = (text: string) => {
    setDone(text);
    onDone(text);
  };

  return (
    <Sheet label={`مراجعة إضافات ${submission.contributor}`}>
      {header}
      <div className="grid gap-4 overflow-y-auto p-5">
        <div className="grid gap-1">
          <p className="text-caption text-muted">
            أرسلها {submission.contributor} {when(submission.at)}
          </p>
          <p className="text-body text-ink">
            تحت <strong className="text-forest">{father?.name}</strong>، {num(proposed.length)}{' '}
            {proposed.length > 2 ? 'إضافات' : proposed.length === 2 ? 'إضافتان' : 'إضافة'}
          </p>
        </div>

        {submission.warnings?.map((w) => (
          <p key={w} className="flex items-start gap-2 rounded-xl border border-pending/40 bg-pending-soft p-3 text-caption text-pending">
            <Icon name="warning" className="mt-0.5" />
            {w}
          </p>
        ))}

        <ul className="grid gap-2">
          {father ? (
            <li className="flex items-center gap-2.5 rounded-xl bg-surface-low p-2.5 text-body text-muted">
              <Medallion name={father.name} size="sm" />
              {father.name}
              <span className="text-caption">الأب، معتمد</span>
            </li>
          ) : null}
          {proposed.map((p) => {
            const on = keep.has(p.id);
            return (
              <li key={p.id} style={{ marginInlineStart: `${(depthOf(p) + 1) * 1.25}rem` }}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition',
                    on ? 'border-pending/50 bg-pending-soft/70' : 'border-line/40 bg-card opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(p)}
                    className="size-5 accent-[var(--color-forest)]"
                  />
                  <span className="grid min-w-0 flex-1">
                    <span className="text-body font-semibold text-forest">
                      {p.name} {p.gender === 'female' ? 'بنت' : 'بن'} {m.get(p.fatherId ?? '')?.name}
                    </span>
                    <span className="text-caption text-muted">
                      {p.gender === 'female' ? 'ابنة' : 'ابن'}
                      {p.deceased ? '، متوفى' : ''}
                      {p.birthYear ? `، مواليد ${p.birthYear}` : ''}
                    </span>
                  </span>
                  <Chip tone={on ? 'pending' : 'neutral'}>{on ? 'يُعتمد' : 'مستبعد'}</Chip>
                </label>
              </li>
            );
          })}
        </ul>

        {mode ? (
          <div className="grid animate-rise gap-2">
            <label className="grid gap-1.5">
              <span className="text-caption font-semibold text-ink">
                {mode === 'reject' ? 'سبب الرفض (يوصل للمساهم)' : 'وش يحتاج تعديل؟'}
              </span>
              <textarea
                autoFocus
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={mode === 'reject' ? 'مثل: الاسم مكرر، سلمان مسجّل من قبل' : 'مثل: صحّح اسم البنت الثانية'}
                className="rounded-xl border border-line/70 bg-card px-4 py-3 text-body outline-none focus:border-forest"
              />
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'reject' ? 'danger' : 'primary'}
                disabled={!note.trim()}
                onClick={() => {
                  sendBack(submission.id, mode === 'reject' ? 'rejected' : 'changes', note.trim(), reviewer);
                  tellContributor(submission, mode === 'reject' ? 'rejected' : 'changes', 0);
                  finish(mode === 'reject' ? 'رفضت الإضافة، ووصل السبب للمساهم' : 'أرسلت طلب التعديل للمساهم');
                }}
              >
                {mode === 'reject' ? 'ارفض' : 'أرسل الطلب'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {paused ? (
              <p className="flex items-center gap-2 rounded-xl bg-pending-soft p-3 text-caption text-pending">
                <Icon name="pause_circle" />
                انتهت باقة الشجرة، والاعتماد متوقف حتى يجدد المالك.
              </p>
            ) : null}
            <Button
              className="rounded-xl"
              disabled={keep.size === 0 || paused}
              onClick={() => {
                approve(submission.id, [...keep], reviewer);
                tellContributor(
                  submission,
                  keep.size === proposed.length ? 'approved' : 'partly_approved',
                  keep.size,
                );
                finish(`اعتمدت ${num(keep.size)} ${keep.size > 2 ? 'إضافات' : keep.size === 2 ? 'إضافتين' : 'إضافة'}، ونبتت في الشجرة`);
              }}
            >
              <Icon name="check" />
              اعتمد المحدد ({num(keep.size)})
            </Button>
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setMode('changes')}>
                اطلب تعديل
              </Button>
              <button
                type="button"
                onClick={() => setMode('reject')}
                className="px-3 text-caption font-semibold text-danger hover:underline"
              >
                رفض
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
