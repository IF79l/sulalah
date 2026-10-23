import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'quiet';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'rounded-full px-6 py-3 text-base font-medium transition duration-300 ease-(--ease-cinematic) focus-visible:outline-2 focus-visible:outline-offset-2',
        variant === 'primary' && 'bg-forest text-ivory hover:bg-bark',
        variant === 'quiet' && 'bg-ivory/70 text-forest backdrop-blur hover:bg-ivory',
        className,
      )}
      {...props}
    />
  );
}
