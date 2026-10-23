import { cn } from './cn';

/** A Material Symbols glyph by name, e.g. "account_tree". Decorative unless given a label. */
export function Icon({
  name,
  fill,
  label,
  className,
}: {
  name: string;
  fill?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn('icon', fill && 'icon-fill', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}

/** The wordmark: a sprig growing from the name. A stand-in until the final logo is drawn. */
export function Logo({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <span
      className={cn('inline-flex items-center gap-2', onDark ? 'text-ivory' : 'text-forest', className)}
    >
      <svg viewBox="0 0 28 28" className="size-[1.6em] shrink-0" aria-hidden="true">
        <path d="M14 26V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M14 15c-5 0-8-3-8-8 5 0 8 3 8 8Z" fill="#687C58" />
        <path d="M14 11c4 0 7-2.5 7-7-4 0-7 2.5-7 7Z" fill="#B59A6B" />
      </svg>
      <span className="grid leading-none">
        <span className="font-title text-[1.5em] leading-[1.15]">سُلالة</span>
        <span
          className={cn(
            'text-[0.45em] tracking-[0.35em]',
            onDark ? 'text-gold-light' : 'text-muted',
          )}
        >
          SULALAH
        </span>
      </span>
    </span>
  );
}
