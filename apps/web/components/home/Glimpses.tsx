'use client';

import { Icon, Medallion, cn } from '@sulalah/ui';
import { useEffect, useState } from 'react';
import { useInView } from './InView';

/** Steps through `count` states every `ms` while on screen, so each glimpse acts itself out. */
function useCycle(count: number, ms: number) {
  const [ref, seen] = useInView<HTMLDivElement>('0px');
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % count), ms);
    return () => clearInterval(t);
  }, [seen, count, ms]);
  return [ref, i] as const;
}

const branches = [
  { name: 'متروك بن محمد', kids: 4 },
  { name: 'ضيف الله بن محمد', kids: 4 },
  { name: 'عبدالله بن محمد', kids: 6 },
];

/** An invitation arriving in the family group, then the relative picking their branch. */
export function InviteGlimpse() {
  const [ref, i] = useCycle(4, 1600);
  const picked = i === 0 ? -1 : Math.min(i - 1, 2);
  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      <div className="grid content-start gap-2">
        <p className="text-caption text-muted">قروب العائلة</p>
        <div className="max-w-[17rem] justify-self-start rounded-2xl rounded-ss-sm bg-[#e7f3e1] p-3 text-body text-ink shadow-sm">
          <p className="leading-relaxed">يا جماعة هذي شجرة آل الراشد، كل واحد يضيف عياله 🌿</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-card/80 p-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-forest text-gold-light">
              <Icon name="park" fill className="text-[1.1rem]" />
            </span>
            <span className="grid min-w-0">
              <span className="truncate text-caption font-semibold text-forest">شجرة أسرة الراشد</span>
              <span dir="ltr" className="truncate text-end text-[0.7rem] text-muted">
                sulalah.app/i/7Kq2
              </span>
            </span>
          </div>
          <p className="mt-1 text-end text-[0.65rem] text-muted">9:41 م</p>
        </div>
      </div>
      <div className="rounded-2xl border border-line/50 bg-card p-3 shadow-float">
        <p className="mb-2 px-1 text-caption font-semibold text-forest">من أي غصن أنت؟</p>
        <ul className="grid gap-1.5">
          {branches.map((b, k) => (
            <li
              key={b.name}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-body transition duration-500',
                k === picked ? 'border-forest bg-olive-soft/50' : 'border-transparent bg-surface-low',
              )}
            >
              <Medallion name={b.name} size="sm" />
              <span className="flex-1 truncate font-medium text-ink">{b.name}</span>
              <span className="text-caption text-muted">{b.kids} أبناء</span>
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full border-2 transition',
                  k === picked ? 'border-forest bg-forest' : 'border-line',
                )}
              >
                {k === picked ? <span className="size-1.5 rounded-full bg-ivory" /> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A proposed leaf waiting on the reviewer, then approved. */
export function ReviewGlimpse() {
  const [ref, i] = useCycle(2, 2600);
  const approved = i === 1;
  return (
    <div ref={ref} aria-hidden="true" className="relative rounded-2xl border border-line/50 bg-card p-4 shadow-float">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[0_60%_0_60%] border-2 transition-all duration-700',
            approved ? 'border-transparent bg-blossom text-white' : 'border-dashed border-pending bg-pending-soft text-pending',
          )}
        >
          <Icon name={approved ? 'check' : 'schedule'} className="text-[1.1rem]" />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="text-body font-semibold text-ink">العنود بنت ماجد</p>
          <p className="text-caption text-muted">أضافها سعود في غصن سالم بن متروك</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-caption font-medium transition-colors duration-700',
            approved ? 'bg-success-soft text-success' : 'bg-pending-soft text-pending',
          )}
        >
          {approved ? 'معتمدة' : 'بانتظارك'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span
          className={cn(
            'flex h-9 items-center justify-center gap-1 rounded-full text-caption font-semibold transition duration-500',
            approved ? 'bg-success text-ivory' : 'bg-forest text-ivory',
          )}
        >
          <Icon name="done" className="text-[1rem]" />
          {approved ? 'اعتُمدت' : 'اعتمد'}
        </span>
        <span className="flex h-9 items-center justify-center rounded-full border border-line text-caption font-semibold text-ink-soft">
          عدّل الاسم
        </span>
      </div>
    </div>
  );
}

/** The daughters' names setting, which the visitor can flip. */
export function DaughtersGlimpse() {
  const [hidden, setHidden] = useState(true);
  const names = ['نورة', 'حصة', 'لولوة', 'ريم'];
  return (
    <div className="grid gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={hidden}
        onClick={() => setHidden((h) => !h)}
        className="flex items-center justify-between gap-3 rounded-2xl border border-line/50 bg-card px-4 py-3 text-start shadow-sm focus-visible:outline-2 focus-visible:outline-gold"
      >
        <span className="grid">
          <span className="text-body font-semibold text-ink">إخفاء أسماء البنات عن الزوار</span>
          <span className="text-caption text-muted">جرّب المفتاح</span>
        </span>
        <span
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300',
            hidden ? 'bg-forest' : 'bg-line',
          )}
        >
          <span
            className={cn(
              'absolute top-1 size-5 rounded-full bg-card shadow transition-all duration-300 ease-(--ease-cinematic)',
              hidden ? 'start-6' : 'start-1',
            )}
          />
        </span>
      </button>
      <div className="grid grid-cols-2 gap-3 text-caption">
        {(['أهل الشجرة', 'زائر'] as const).map((who) => {
          const veil = hidden && who === 'زائر';
          return (
            <div key={who} className="rounded-2xl border border-line/40 bg-surface-low p-3">
              <p className="mb-2 flex items-center gap-1 font-semibold text-forest">
                <Icon name={who === 'زائر' ? 'person_outline' : 'family_restroom'} className="text-[1rem]" />
                يشوفها {who}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {names.map((n) => (
                  <li
                    key={n}
                    className={cn(
                      'rounded-full px-2 py-0.5 transition-all duration-500',
                      veil ? 'bg-blossom/15 text-transparent blur-[3px] select-none' : 'bg-blossom/15 text-[#a2466f]',
                    )}
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
