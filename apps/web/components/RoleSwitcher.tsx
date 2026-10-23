'use client';

import { viewerLabel, type Viewer } from '@sulalah/domain';
import { Icon, cn } from '@sulalah/ui';
import { useEffect, useRef, useState } from 'react';
import { actAs, demoReviewer, useDemo } from '@/lib/demo-store';

const roles: { as: Viewer; icon: string; body: (scope: string) => string }[] = [
  { as: 'owner', icon: 'verified_user', body: () => 'يشوف كل شي ويعتمد ويدير الشجرة والباقة.' },
  { as: 'reviewer', icon: 'fact_check', body: (scope) => `يعتمد إضافات ${scope} فقط، ويضيف.` },
  { as: 'contributor', icon: 'edit_note', body: () => 'يضيف داخل غصنه، وإضافاته تنتظر الاعتماد.' },
  {
    as: 'visitor',
    icon: 'visibility',
    body: () => 'يتصفح برابط مشاهدة فقط، حسب إعدادات الخصوصية.',
  },
];

/**
 * Until accounts exist, one person tries every role: this switch shows the tree and every
 * page through that role's permissions.
 */
export function RoleSwitcher({
  className,
  dark,
  up,
}: {
  className?: string;
  dark?: boolean;
  up?: boolean;
}) {
  const s = useDemo();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const r = demoReviewer(s);
  const scope =
    !r || r.scope === 'all'
      ? 'الشجرة كاملة'
      : r.scope.map((id) => `غصن ${s.people.find((p) => p.id === id)?.name ?? ''}`).join('، ');

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full border border-dashed px-3 text-caption font-semibold transition',
          dark
            ? 'border-gold-light/50 text-gold-light hover:bg-ivory/10'
            : cn(
                'border-gold/60 bg-card/70 text-forest hover:border-gold hover:bg-card',
                up && 'bg-card shadow-float',
              ),
        )}
      >
        <Icon name="theater_comedy" className="text-[1.1rem] text-gold" />
        <span className="max-sm:hidden">تجربة كـ</span>
        {viewerLabel[s.as]}
        <Icon name="expand_more" className={cn('text-[1rem] transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            'z-50 grid animate-rise gap-1 rounded-2xl border border-line/40 bg-card p-2 shadow-float',
            'max-sm:fixed max-sm:inset-x-4 sm:absolute sm:end-0 sm:w-80',
            up
              ? 'max-sm:bottom-[calc(150px+env(safe-area-inset-bottom,0px))] sm:bottom-11'
              : 'max-sm:top-16 sm:top-11',
          )}
        >
          <p className="px-3 pt-1 pb-2 text-caption leading-relaxed text-muted">
            شف الشجرة والصفحات بعين كل دور. الصلاحيات نفسها اللي تنطبق بعد الإطلاق.
          </p>
          {roles.map((x) => (
            <button
              key={x.as}
              type="button"
              role="menuitemradio"
              aria-checked={s.as === x.as}
              onClick={() => {
                actAs(x.as);
                setOpen(false);
              }}
              className={cn(
                'flex items-start gap-3 rounded-xl p-3 text-start transition',
                s.as === x.as ? 'bg-olive-soft/60' : 'hover:bg-surface-low',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  s.as === x.as ? 'bg-forest text-gold-light' : 'bg-surface text-forest',
                )}
              >
                <Icon name={x.icon} className="text-[1.15rem]" />
              </span>
              <span className="grid gap-0.5">
                <span className="text-body font-semibold text-forest">{viewerLabel[x.as]}</span>
                <span className="text-caption leading-relaxed text-ink-soft">{x.body(scope)}</span>
              </span>
              {s.as === x.as ? <Icon name="check" className="ms-auto text-leaf" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
