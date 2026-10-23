import type { ReactNode } from 'react';
import { cn } from './cn';

/** The gold wordmark. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('font-title text-[1.8rem] leading-none text-gold', className)}>سُلالة</span>
  );
}

/**
 * Floats over the tree: the brand at the start, whatever the screen needs at the end.
 * Lets clicks through to the tree everywhere but on its own controls.
 */
export function TopBar({ children, end }: { children?: ReactNode; end?: ReactNode }) {
  return (
    <header
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3',
        'bg-linear-to-b from-paper to-paper/0',
        'pt-[calc(14px+env(safe-area-inset-top,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] pb-3.5 pl-[max(16px,env(safe-area-inset-left,0px))]',
      )}
    >
      <Brand />
      {children}
      {end ? <div className="pointer-events-auto flex items-center gap-2">{end}</div> : null}
    </header>
  );
}

export interface Crumb {
  id: string;
  label: string;
}

/** The lineage from the root to the chosen person; each name jumps back up the line. */
export function LineagePath({
  items,
  onPick,
  hint = 'اضغط على غصن أو ورقة',
}: {
  items: Crumb[];
  onPick: (index: number) => void;
  hint?: string;
}) {
  return (
    <nav
      aria-label="مسار النسب"
      className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-0.5 rounded-full border border-line bg-glass px-2 py-1 backdrop-blur-md"
    >
      {items.length ? (
        items.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(i)}
            className={cn(
              'rounded-full px-2 py-1 text-[0.92rem] font-medium focus-visible:outline-2 focus-visible:outline-gold',
              i === items.length - 1 ? 'text-gold' : 'text-ink',
              i > 0 && "before:me-2 before:text-gold before:content-['←']",
            )}
          >
            {c.label}
          </button>
        ))
      ) : (
        <span className="px-2 py-1 text-[0.92rem] text-ink-soft">{hint}</span>
      )}
    </nav>
  );
}

/**
 * The panel for whatever is chosen on the tree: a bottom sheet on phones, a floating card
 * at the reading start (the right, in Arabic) on wide screens, so the tree stays in view.
 */
export function Sheet({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section
      aria-label={label}
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[520px] animate-rise gap-3.5 border border-b-0 border-line bg-glass backdrop-blur-lg',
        'rounded-t-(--radius-sheet) pt-4.5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[calc(18px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]',
        'md:start-6 md:end-auto md:bottom-6 md:w-[380px] md:rounded-(--radius-sheet) md:border-b md:px-5 md:pb-5',
      )}
    >
      {children}
    </section>
  );
}

export function SheetHeader({
  eyebrow,
  title,
  meta,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[0.78rem] tracking-[0.02em] text-gold">{eyebrow}</div>
        ) : null}
        <h2 className="mt-0.5 font-display text-[1.6rem] leading-tight font-bold text-balance">
          {title}
        </h2>
        {meta ? <p className="mt-1 text-[0.9rem] text-ink-soft">{meta}</p> : null}
      </div>
      {aside}
    </div>
  );
}

const swatch: Record<'son' | 'daughter' | 'father' | 'proposed' | 'deceased', string> = {
  son: 'bg-leaf rounded-[0_60%_0_60%]',
  daughter: 'bg-blossom rounded-[0_60%_0_60%]',
  father: 'size-2.5 rounded-full border-2 border-gold bg-card',
  proposed: 'rounded-[0_60%_0_60%] border-[1.5px] border-dashed border-gold bg-sprout',
  deceased: 'rounded-[0_60%_0_60%] bg-withered',
};

const legendLabels: Record<keyof typeof swatch, string> = {
  son: 'ابن',
  daughter: 'ابنة',
  father: 'أب وأغصانه',
  proposed: 'بانتظار الاعتماد',
  deceased: 'متوفى',
};

/** What the leaf colours mean, shown while nothing is chosen. */
export function TreeLegend() {
  return (
    <footer
      aria-label="دليل الألوان"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-[520px] flex-wrap justify-center gap-x-4 gap-y-2 px-4 pt-3.5 pb-[calc(16px+env(safe-area-inset-bottom,0px))] text-[0.8rem] text-ink-soft"
    >
      {(Object.keys(swatch) as (keyof typeof swatch)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <i className={cn('inline-block size-3', swatch[k])} />
          {legendLabels[k]}
        </span>
      ))}
    </footer>
  );
}
