import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cn } from './cn';

/** The frosted look shared by everything that floats over the tree. */
export const floating =
  'border border-gold-light/40 bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/85';

export interface Crumb {
  id: string;
  label: string;
}

/** The lineage from the root to the chosen person; each name jumps back up the line. */
export function LineagePath({
  items,
  onPick,
  hint = 'اضغط على غصن أو ورقة',
  className,
}: {
  items: Crumb[];
  onPick: (index: number) => void;
  hint?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="مسار النسب"
      className={cn(
        floating,
        'flex min-w-0 flex-wrap items-center gap-1 rounded-full px-3 py-1 shadow-sm',
        className,
      )}
    >
      {items.length ? (
        items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <span key={c.id} className="flex items-center gap-1">
              {i > 0 ? <Icon name="arrow_back" className="text-[1rem] text-pending" /> : null}
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={last ? 'true' : undefined}
                className={cn(
                  'rounded-full px-2 py-0.5 text-body font-semibold focus-visible:outline-2 focus-visible:outline-gold',
                  last ? 'bg-olive-soft/60 text-success' : 'text-forest hover:bg-surface',
                )}
              >
                {c.label}
              </button>
            </span>
          );
        })
      ) : (
        <span className="px-1 py-0.5 text-body text-muted">{hint}</span>
      )}
    </nav>
  );
}

/**
 * The panel for whatever is chosen on the tree: a bottom sheet on phones, a floating card
 * on the right (the reading start) on wide screens, so the tree stays in view.
 */
export function Sheet({
  children,
  label,
  footer,
}: {
  children: ReactNode;
  label?: string;
  footer?: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 flex max-h-[72dvh] animate-rise flex-col overflow-hidden border border-b-0 border-gold-light/35 bg-card/95 shadow-sheet backdrop-blur-md',
        'rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)]',
        'md:start-6 md:end-auto md:top-20 md:bottom-auto md:max-h-[calc(100dvh-6.5rem)] md:w-[400px] md:rounded-2xl md:border-b md:pb-0 md:shadow-float',
      )}
    >
      <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line md:hidden" />
      {children}
      {footer}
    </section>
  );
}

/** A small rounded label: a generation, a role, a state. */
export function Chip({
  children,
  tone = 'neutral',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'olive' | 'success' | 'pending' | 'deceased' | 'danger' | 'forest';
  icon?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-surface-high text-ink-soft',
        tone === 'olive' && 'bg-olive-soft/70 text-on-olive-soft',
        tone === 'success' && 'border border-success/20 bg-success-soft text-success',
        tone === 'pending' && 'border border-pending/30 bg-pending-soft text-pending',
        tone === 'deceased' && 'bg-surface-highest text-deceased',
        tone === 'danger' && 'bg-danger text-white',
        tone === 'forest' && 'bg-forest text-ivory',
        className,
      )}
    >
      {icon ? <Icon name={icon} fill className="text-[1.1em]" /> : null}
      {children}
    </span>
  );
}

/** Initials in a gold-ringed medallion, the way fathers appear on the tree. */
export function Medallion({
  name,
  size = 'md',
  tone = 'forest',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'forest' | 'leaf' | 'blossom' | 'pending' | 'deceased';
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter((w) => w && w !== 'بن' && w !== 'بنت' && w !== 'آل')
    .slice(0, size === 'sm' ? 1 : 2)
    .map((w) => w[0])
    .join('.');
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        size === 'sm' && 'size-8 text-caption',
        size === 'md' && 'size-10 text-body',
        size === 'lg' && 'size-16 text-h2',
        tone === 'forest' && 'border-2 border-gold-light bg-forest text-gold-light',
        tone === 'leaf' && 'bg-leaf/15 text-leaf',
        tone === 'blossom' && 'bg-blossom/15 text-[#b4507e]',
        tone === 'pending' && 'border border-dashed border-pending text-pending',
        tone === 'deceased' && 'bg-surface-highest text-deceased',
        className,
      )}
    >
      {initials}
    </span>
  );
}

const swatch: Record<'son' | 'daughter' | 'father' | 'proposed' | 'deceased', string> = {
  son: 'size-3.5 rounded-[0_60%_0_60%] bg-[#6fa65e]',
  daughter: 'size-3.5 rounded-[0_60%_0_60%] bg-blossom',
  father: 'size-3.5 rounded-full border-2 border-gold bg-card',
  proposed: 'size-3.5 rounded-[0_60%_0_60%] border-[1.5px] border-dashed border-pending bg-[#fff9e6]',
  deceased: 'size-3.5 rounded-[0_60%_0_60%] bg-[#d9be84]',
};

const legendLabels: Record<keyof typeof swatch, string> = {
  son: 'ابن',
  daughter: 'ابنة',
  father: 'أب ورأس فرع',
  proposed: 'بانتظار الاعتماد',
  deceased: 'متوفى رحمه الله',
};

/** What the tree's leaves mean, in the tree's own colours, shown while nothing is chosen. */
export function TreeLegend({ className }: { className?: string }) {
  return (
    <footer
      aria-label="دليل الألوان"
      className={cn(
        floating,
        'pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-10 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-x-3.5 gap-y-1 rounded-2xl px-4 py-2 shadow-float md:rounded-full md:px-5',
        className,
      )}
    >
      {(Object.keys(swatch) as (keyof typeof swatch)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-caption font-medium text-forest">
          <i className={cn('inline-block', swatch[k])} />
          {legendLabels[k]}
        </span>
      ))}
    </footer>
  );
}
