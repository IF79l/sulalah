import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'gilt' | 'onDark';
export type ButtonSize = 'md' | 'sm';

/** Shared so links that act as buttons look the same as buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition duration-200 ease-(--ease-cinematic)',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
    'disabled:pointer-events-none disabled:opacity-50',
    size === 'md' && 'rounded-(--radius-control) px-5 py-3 text-base',
    size === 'sm' && 'rounded-full px-3.5 py-1.5 text-sm',
    variant === 'primary' &&
      'bg-gold font-semibold text-on-gold hover:-translate-y-px hover:bg-gold-deep',
    variant === 'soft' &&
      'border border-line bg-gold-soft font-semibold text-gold hover:bg-gold/15',
    variant === 'ghost' && 'border border-line text-ink-soft hover:bg-card hover:text-ink',
    // For the walnut wall around the poster.
    variant === 'gilt' &&
      'bg-gilt font-semibold text-walnut hover:-translate-y-px hover:bg-parchment',
    variant === 'onDark' &&
      'border border-parchment/30 text-parchment hover:border-parchment/60 hover:bg-parchment/5',
    variant === 'danger' &&
      'border border-danger/30 bg-danger-soft font-semibold text-danger hover:bg-danger/15',
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}
