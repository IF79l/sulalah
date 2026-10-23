'use client';

import { Chip, Icon, IconButton, Logo, Medallion, cn } from '@sulalah/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { TREE_ID, TREE_TITLE, num, useDemo } from '@/lib/demo-store';

const t = (p: string) => `/trees/${TREE_ID}${p}`;

/**
 * The frame for every page that is not the tree itself: a top bar with notifications and the
 * account, and the tree's own pages in a side rail (a scrolling tab row on phones).
 */
export function AppShell({
  title,
  subtitle,
  actions,
  back,
  children,
  wide,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
  wide?: boolean;
}) {
  const s = useDemo();
  const path = usePathname();
  const waiting = s.submissions.filter((x) => x.status === 'pending').length;
  const unread = s.notices.filter((n) => n.unread).length;

  const nav = [
    { href: '/trees', icon: 'forest', label: 'أشجاري', exact: true },
    { href: t(''), icon: 'account_tree', label: 'الشجرة', exact: true },
    { href: t('/review'), icon: 'fact_check', label: 'الإضافات الواردة', badge: waiting },
    { href: t('/reviewers'), icon: 'verified_user', label: 'المدققون' },
    { href: t('/invites'), icon: 'link', label: 'روابط الدعوة' },
    { href: t('/plan'), icon: 'workspace_premium', label: 'الباقة' },
    { href: t('/settings'), icon: 'settings', label: 'إعدادات الشجرة' },
  ];
  const isOn = (n: (typeof nav)[number]) => (n.exact ? path === n.href : path.startsWith(n.href));

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="sticky top-0 z-30 border-b border-line/30 bg-ivory/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-[max(16px,env(safe-area-inset-right,0px))] md:px-8">
          <Link href="/trees" aria-label="سُلالة، أشجاري">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              aria-label={unread ? `الإشعارات، ${unread} غير مقروءة` : 'الإشعارات'}
              className={cn(
                'relative flex size-10 items-center justify-center rounded-full text-forest hover:bg-surface',
                path === '/notifications' && 'bg-olive-soft/60',
              )}
            >
              <Icon name="notifications" />
              {unread ? (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[0.6rem] font-bold text-white ring-2 ring-ivory">
                  {unread}
                </span>
              ) : null}
            </Link>
            <span className="mx-2 h-6 w-px bg-line/40" />
            <Link href="/account" className="flex items-center gap-2 rounded-full p-0.5 pe-3 hover:bg-surface">
              <Medallion name={s.me.first} />
              <span className="hidden text-caption font-semibold text-forest sm:block">{s.me.first}</span>
            </Link>
          </div>
        </div>
        <nav
          aria-label="صفحات الشجرة"
          className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:hidden"
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isOn(n) ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium',
                isOn(n) ? 'bg-forest text-ivory' : 'bg-surface text-ink-soft',
              )}
            >
              {n.label}
              {n.badge ? <span className="rounded-full bg-pending px-1.5 text-[0.65rem] text-white">{n.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col justify-between border-e border-line/30 p-4 lg:flex">
          <div className="grid gap-5">
            <nav className="grid gap-0.5">
              <p className="mb-1 flex items-center gap-2 px-4 text-caption font-semibold text-muted">
                <Icon name="park" fill className="text-olive" />
                {TREE_TITLE}
              </p>
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isOn(n) ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-2.5 text-body transition-colors',
                    isOn(n) ? 'bg-olive-soft font-semibold text-on-olive-soft' : 'text-ink-soft hover:bg-surface-high',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name={n.icon} className={isOn(n) ? 'text-leaf' : 'text-muted'} />
                    {n.label}
                  </span>
                  {n.badge ? <Chip tone="pending">{num(n.badge)}</Chip> : null}
                </Link>
              ))}
            </nav>
          </div>
          <p className="border-t border-line/30 px-2 pt-4 text-caption leading-relaxed text-muted">
            اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.
          </p>
        </aside>

        <main className={cn('min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8', !wide && 'lg:max-w-5xl')}>
          {back ? (
            <Link
              href={back.href}
              className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-olive hover:text-forest"
            >
              <Icon name="arrow_forward" className="text-[1rem]" />
              {back.label}
            </Link>
          ) : null}
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-line/30 pb-5 md:flex-row md:items-end">
            <div className="grid gap-1">
              <h1 className="text-h1-m font-bold text-balance text-forest md:text-h1">{title}</h1>
              {subtitle ? <p className="text-body text-muted">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

/** A titled group of rows, as in settings and profile pages. */
export function Panel({
  title,
  icon,
  children,
  className,
  tone,
}: {
  title?: ReactNode;
  icon?: string;
  children: ReactNode;
  className?: string;
  tone?: 'danger';
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border bg-card',
        tone === 'danger' ? 'border-danger/30' : 'border-line/40',
        className,
      )}
    >
      {title ? (
        <h2
          className={cn(
            'flex items-center gap-2 border-b px-5 py-3.5 text-title font-semibold',
            tone === 'danger' ? 'border-danger/20 text-danger' : 'border-line/30 text-forest',
          )}
        >
          {icon ? <Icon name={icon} className={tone === 'danger' ? 'text-danger' : 'text-olive'} /> : null}
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** A friendly empty or error state with one way forward. */
export function EmptyState({
  icon = 'eco',
  title,
  body,
  action,
}: {
  icon?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-line/70 bg-card/60 px-6 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-olive-soft/60 text-on-olive-soft">
        <Icon name={icon} className="text-[2rem]" />
      </span>
      <p className="text-title font-bold text-forest">{title}</p>
      {body ? <p className="max-w-sm text-body leading-relaxed text-muted">{body}</p> : null}
      {action}
    </div>
  );
}

/** Tabs as a row of pills, with an optional count on each. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-line/50 bg-surface-low p-1 [scrollbar-width:none]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-body font-medium transition',
            tab.value === value ? 'bg-forest text-ivory shadow-sm' : 'text-ink-soft hover:text-forest',
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={cn(
                'rounded-full px-1.5 text-caption tabular-nums',
                tab.value === value ? 'bg-ivory/20' : 'bg-surface-highest',
              )}
            >
              {num(tab.count)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** A small toast at the bottom, with an optional undo. */
export function Toast({ text, undo, onDone }: { text: string; undo?: () => void; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, undo ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] animate-rise items-center gap-4 rounded-full bg-forest py-2.5 ps-5 pe-2.5 text-body text-ivory shadow-toast"
    >
      <span className="flex items-center gap-2">
        <Icon name="check_circle" className="text-olive-soft" />
        {text}
      </span>
      {undo ? (
        <button
          type="button"
          onClick={() => {
            undo();
            onDone();
          }}
          className="rounded-full bg-ivory/15 px-3 py-1 text-caption font-semibold hover:bg-ivory/25"
        >
          تراجع
        </button>
      ) : (
        <IconButton label="إغلاق" className="size-7 text-ivory hover:bg-ivory/10" onClick={onDone}>
          <Icon name="close" className="text-[1rem]" />
        </IconButton>
      )}
    </div>
  );
}
