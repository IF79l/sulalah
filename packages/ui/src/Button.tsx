import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

/** Shared so links that act as buttons look the same as buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition duration-200 active:scale-[0.98]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
    'disabled:pointer-events-none disabled:opacity-50',
    size === 'md' && 'h-12 rounded-full px-7 text-body',
    size === 'sm' && 'h-9 rounded-full px-4 text-body',
    variant === 'primary' &&
      'border border-gold-light/30 bg-forest text-ivory shadow-sm hover:bg-forest-deep',
    variant === 'secondary' && 'border-[1.5px] border-olive bg-card text-olive hover:bg-surface',
    // The softer partner of a primary button: ivory with a gold rim.
    variant === 'quiet' && 'border-2 border-gold-light bg-ivory text-forest hover:bg-surface',
    variant === 'ghost' && 'text-forest hover:bg-surface-high',
    variant === 'danger' && 'border border-danger/25 bg-danger-soft text-danger hover:bg-danger/10',
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

/** A round icon-only button; the label is for screen readers and the tooltip. */
export function IconButton({
  label,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface hover:text-forest',
        'focus-visible:outline-2 focus-visible:outline-gold',
        className,
      )}
      {...props}
    />
  );
}
