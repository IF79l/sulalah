'use client';

import { Icon, Logo, buttonClass } from '@sulalah/ui';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

/** A whole-page message with one way out: not found, no access, and the like. */
export function StatePage({ icon, title, body, action }: { icon: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <main className="star-ground flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory px-6 text-center">
      <Logo />
      <span className="mt-6 flex size-20 items-center justify-center rounded-full border border-gold-light/60 bg-card text-olive shadow-float">
        <Icon name={icon} className="text-[2.5rem]" />
      </span>
      <h1 className="text-h1-m font-bold text-forest md:text-h1">{title}</h1>
      {body ? <p className="max-w-sm text-body-lg leading-relaxed text-ink-soft">{body}</p> : null}
      {action}
    </main>
  );
}

export function NoAccess() {
  return (
    <StatePage
      icon="lock"
      title="ما عندك صلاحية لهذا الجزء من الشجرة"
      body="اطلب من مالك الشجرة رابط دعوة، أو ارجع لأشجارك."
      action={
        <Link href="/trees" className={buttonClass('primary')}>
          ارجع لشجرتي
        </Link>
      }
    />
  );
}

/** A sprout that grows while the tree loads. */
export function Sprouting({ label = 'تنبت الشجرة…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ivory" aria-live="polite">
      <svg viewBox="0 0 80 80" className="size-24" aria-hidden="true">
        <path d="M10 70H70" stroke="var(--color-line)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
        <path d="M40 70C39 58 42 48 40 34" className="sprout-stem" />
        <path d="M40 46C34 40 26 40 22 44C27 49 35 50 40 46Z" className="sprout-leaf" style={{ animationDelay: '0.7s' }} />
        <path d="M40 36C46 28 55 28 59 32C54 38 46 39 40 36Z" className="sprout-leaf" style={{ animationDelay: '1s' }} />
      </svg>
      <p className="text-body font-semibold text-forest">{label}</p>
    </div>
  );
}

/** A quiet bar at the top when the connection drops; additions wait and go out later. */
export function OfflineBar() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <p role="status" className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-ink px-4 py-2 pt-[calc(8px+env(safe-area-inset-top,0px))] text-caption text-ivory">
      <Icon name="cloud_off" className="text-[1rem]" />
      انقطع الاتصال. إضافاتك محفوظة وتنرسل أول ما يرجع.
    </p>
  );
}
