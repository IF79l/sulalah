import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

/** A labelled text input; the hint and error are tied to it for screen readers. */
export function Field({
  label,
  hint,
  error,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={cn(
          'w-full rounded-(--radius-control) border bg-card px-4 py-3 text-base text-ink placeholder:text-ink-faint',
          'transition outline-none focus:border-gold focus:ring-2 focus:ring-gold/25',
          error ? 'border-danger' : 'border-line',
        )}
        {...input}
      />
      {note ? (
        <p
          id={`${id}-note`}
          className={cn('text-[0.82rem]', error ? 'text-danger' : 'text-ink-soft')}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** A choice among a few options, as one row of pills. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-full border border-line bg-card p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-gold',
            o.value === value ? 'bg-gold text-on-gold' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
