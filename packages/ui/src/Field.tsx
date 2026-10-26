'use client';

import { useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icon';
import { cn } from './cn';
import { latinDigits, nationalMobile } from './digits';

const inputBox =
  'rounded-xl border bg-card transition focus-within:border-forest focus-within:ring-2 focus-within:ring-gold-light/50';

/** A labelled text input; the hint and error are tied to it for screen readers. */
export function Field({
  label,
  hint,
  error,
  icon,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** A Material Symbols name shown at the end of the box. */
  icon?: string;
}) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-body font-medium text-ink">
        {label}
      </label>
      <div
        className={cn(inputBox, 'flex items-center', error ? 'border-danger' : 'border-line/70')}
      >
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          className="w-0 min-w-0 flex-1 bg-transparent px-4 py-3 text-body-lg text-ink outline-none placeholder:text-outline/70"
          {...input}
        />
        {icon ? <Icon name={icon} className="me-3 text-outline" /> : null}
      </div>
      {note ? (
        <p id={`${id}-note`} className={cn('text-caption', error ? 'text-danger' : 'text-muted')}>
          {error ? <Icon name="error" className="me-1 align-[-0.2em] text-[1.1em]" /> : null}
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** A Saudi mobile number: the +966 prefix is fixed and the digits read left to right. */
export function PhoneField({
  value,
  onChange,
  error,
  hint,
}: {
  value: string;
  onChange: (digits: string) => void;
  error?: ReactNode;
  hint?: ReactNode;
}) {
  const id = useId();
  const note = error ?? hint;
  // 5X XXX XXXX
  const shown = [value.slice(0, 2), value.slice(2, 5), value.slice(5, 9)].filter(Boolean).join(' ');
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-body font-medium text-ink">
        رقم الجوال
      </label>
      <div
        className={cn(
          inputBox,
          'flex items-center bg-ivory',
          error ? 'border-danger' : 'border-line/70',
        )}
      >
        <span className="flex items-center gap-1.5 self-stretch rounded-s-xl border-e border-line/50 bg-surface-low px-3 text-body font-semibold text-ink">
          <span aria-hidden="true">🇸🇦</span>
          <span dir="ltr">+966</span>
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          dir="ltr"
          placeholder="5X XXX XXXX"
          value={shown}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          onChange={(e) => {
            const text = e.target.value;
            let next = nationalMobile(text);
            // Backspace over one of the spaces leaves the digits as they were: take the digit
            // before it instead, or the field would never let go of it.
            if (next === value && text.length < shown.length) {
              const at = latinDigits(text.slice(0, e.target.selectionStart ?? text.length)).replace(
                /\D/g,
                '',
              ).length;
              next = at > 0 ? value.slice(0, at - 1) + value.slice(at) : value;
            }
            onChange(next);
          }}
          className="w-0 min-w-0 flex-1 bg-transparent px-4 py-3 text-end text-body-lg tracking-wider text-forest outline-none placeholder:text-outline/60"
        />
        <Icon name="phone_iphone" className="me-3 text-outline" />
      </div>
      {note ? (
        <p id={`${id}-note`} className={cn('text-caption', error ? 'text-danger' : 'text-muted')}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** Six digit boxes that advance on their own and accept a pasted code. */
export function OtpField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const set = (code: string, focus: number) => {
    onChange(code.slice(0, 6));
    boxes.current[Math.min(focus, 5)]?.focus();
  };
  return (
    <div dir="ltr" className="flex justify-center gap-2.5" role="group" aria-label="رمز التحقق">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`الرقم ${i + 1}`}
          value={value[i] ?? ''}
          autoFocus={i === 0}
          onChange={(e) => {
            const digits = latinDigits(e.target.value).replace(/\D/g, '');
            if (!digits) return;
            set(value.slice(0, i) + digits + value.slice(i + digits.length), i + digits.length);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              const at = value[i] ? i : i - 1;
              if (at >= 0) set(value.slice(0, at) + value.slice(at + 1), at);
            }
          }}
          className={cn(
            'h-14 w-11 max-[380px]:w-10 rounded-xl border bg-ivory text-center text-h2 font-medium text-forest outline-none sm:w-12',
            'focus:border-forest focus:ring-2 focus:ring-gold-light/50',
            invalid ? 'border-danger' : 'border-line',
          )}
        />
      ))}
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
      className="flex gap-1 rounded-full border border-line/60 bg-surface-low p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-full px-3 py-2 text-body font-medium transition focus-visible:outline-2 focus-visible:outline-gold',
            o.value === value ? 'bg-forest text-ivory shadow-sm' : 'text-ink-soft hover:text-forest',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
