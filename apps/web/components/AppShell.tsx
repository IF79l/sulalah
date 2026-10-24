'use client';

import { viewerLabel, type ActionType } from '@sulalah/domain';
import { Button, Chip, Icon, IconButton, Logo, Medallion, cn } from '@sulalah/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { DrawIn, Sapling, Sprig } from '@/components/Botanical';
import { PlanArt } from '@/components/home/PlanArt';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { backendOn } from '@/lib/backend';
import { useMyFirstName } from '@/lib/me';
import { useUnread } from '@/lib/notices';
import {
  currentTreeId,
  actAs,
  allows,
  canReview,
  generations,
  liveTree,
  num,
  useDemo,
  type DemoState,
} from '@/lib/demo-store';

/** What a page needs: a permission, or just being signed in (not a visitor on a link). */
export type Need = ActionType | 'member';

export const meets = (s: DemoState, need?: Need) =>
  !need ||
  (need === 'member'
    ? s.as !== 'visitor'
    : allows(s, { type: need } as Parameters<typeof allows>[1]));

const t = (p: string) => `/trees/${currentTreeId()}${p}`;

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
  need,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
  wide?: boolean;
  /** The permission this page needs; without it the page shows why, instead of its content. */
  need?: Need;
}) {
  const s = useDemo();
  const path = usePathname();
  const waiting = s.submissions.filter(
    (x) => x.status === 'pending' && canReview(s, x.fatherId),
  ).length;
  const liveUnread = useUnread();
  // With accounts on, a page outside any tree (notifications, account) has no tree to show:
  // the sample family in the store is not this person's.
  const away = backendOn && !liveTree() && !path.startsWith('/trees/');
  const myFirst = useMyFirstName();
  const first = away ? (myFirst ?? '') : s.me.first;
  const allowed = away || meets(s, need);
  const unread = backendOn ? liveUnread : s.notices.filter((n) => n.unread).length;

  const nav = (
    [
      { href: '/trees', icon: 'forest', label: 'أشجاري', exact: true, need: 'member' },
      { href: t(''), icon: 'account_tree', label: 'الشجرة', exact: true },
      {
        href: t('/review'),
        icon: 'fact_check',
        label: 'الإضافات الواردة',
        badge: waiting,
        need: 'review.view',
      },
      { href: t('/print'), icon: 'print', label: 'اطبع الشجرة', need: 'member' },
      {
        href: t('/contributions'),
        icon: 'inventory_2',
        label: 'مساهماتي',
        need: 'member',
        hideFor: 'owner',
      },
      {
        href: t('/activity'),
        icon: 'history',
        label: 'سجل النشاط',
        need: 'activity.view',
        hideFor: 'owner',
      },
      { href: t('/reviewers'), icon: 'verified_user', label: 'المدققون', need: 'reviewer.invite' },
      { href: t('/invites'), icon: 'link', label: 'روابط الدعوة', need: 'invite.manage' },
      { href: t('/plan'), icon: 'workspace_premium', label: 'الباقة', need: 'billing.manage' },
      { href: t('/settings'), icon: 'settings', label: 'إعدادات الشجرة', need: 'tree.manage' },
    ] as {
      href: string;
      icon: string;
      label: string;
      exact?: boolean;
      badge?: number;
      need?: Need;
      hideFor?: string;
    }[]
  ).filter((n) => (away ? n.href === '/trees' : meets(s, n.need) && n.hideFor !== s.as));
  const isOn = (n: (typeof nav)[number]) => (n.exact ? path === n.href : path.startsWith(n.href));

  // On phones the page pills scroll sideways; bring the current one into view.
  const pills = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = pills.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!on || !pills.current) return;
    const a = on.getBoundingClientRect();
    const b = pills.current.getBoundingClientRect();
    if (a.left < b.left || a.right > b.right)
      pills.current.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2);
  }, [path]);

  return (
    <div className="flex min-h-dvh flex-col bg-ivory print:min-h-0">
      <header className="sticky top-0 z-30 border-b border-line/30 bg-ivory/90 backdrop-blur-md print:hidden">
        <div className="flex h-16 items-center justify-between gap-4 px-[max(16px,env(safe-area-inset-right,0px))] md:px-8">
          <Link href="/trees" aria-label="سُلالة، أشجاري">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {away ? null : <RoleSwitcher className="me-1" />}
            {s.as === 'visitor' && !away ? (
              <Link
                href="/login"
                className="rounded-full bg-forest px-4 py-2 text-caption font-semibold text-ivory"
              >
                سجّل دخولك
              </Link>
            ) : (
              <>
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
                <Link
                  href="/account"
                  className="flex items-center gap-2 rounded-full p-0.5 pe-3 hover:bg-surface"
                >
                  <Medallion name={first || 'أنا'} />
                  <span className="hidden text-caption font-semibold text-forest sm:block">
                    {first}
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
        <nav
          ref={pills}
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
              {n.badge ? (
                <span className="rounded-full bg-pending px-1.5 text-[0.65rem] text-white">
                  {n.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col justify-between border-e border-line/30 p-4 lg:flex print:hidden">
          <div className="grid gap-5">
            {away ? null : <TreeCard />}
            <nav className="grid gap-0.5">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isOn(n) ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-2.5 text-body transition-colors',
                    isOn(n)
                      ? 'bg-olive-soft font-semibold text-on-olive-soft'
                      : 'text-ink-soft hover:bg-surface-high',
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

        <main className={cn('min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 print:p-0', !wide && 'lg:max-w-5xl')}>
          {back ? (
            <Link
              href={back.href}
              className="mb-3 inline-flex print:hidden items-center gap-1 text-caption font-semibold text-olive hover:text-forest"
            >
              <Icon name="arrow_forward" className="text-[1rem]" />
              {back.label}
            </Link>
          ) : null}
          <div className="page-in mb-7 print:hidden">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="flex items-end gap-3">
                <Sprig className="mb-1 size-10 shrink-0 max-md:hidden" />
                <div className="grid gap-1">
                  <h1 className="text-h1-m font-bold text-balance text-forest md:text-h1">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="max-w-[60ch] text-body text-muted">{subtitle}</p>
                  ) : null}
                </div>
              </div>
              {actions && allowed ? (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              ) : null}
            </div>
            <div aria-hidden="true" className="mt-5 flex items-center gap-2">
              <span className="size-1.5 rotate-45 bg-gold" />
              <span className="h-px flex-1 bg-linear-to-l from-gold/60 via-gold-light/30 to-transparent" />
            </div>
          </div>
          <div className="page-in" style={{ ['--d' as string]: 2 }}>
            {allowed ? children : <Locked need={need!} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/** The tree itself at the head of the side rail: its name as on the poster, and its size. */
function TreeCard() {
  const s = useDemo();
  const count = s.people.filter((p) => p.status === 'approved').length;
  return (
    <Link
      href={t('')}
      className="group relative overflow-hidden rounded-2xl bg-forest px-4 pt-3 pb-4 text-ivory shadow-sm transition hover:shadow-float"
    >
      <span
        aria-hidden="true"
        className="star-ground absolute inset-0 opacity-25 mix-blend-soft-light"
      />
      <DrawIn className="plan-dark relative -mb-1 flex justify-center [&_svg]:h-20">
        <PlanArt plan="extended" />
      </DrawIn>
      <span className="relative block text-center font-title text-h2 leading-snug text-gold-light">
        {s.tree.title}
      </span>
      <span className="relative mt-1 flex justify-center gap-3 text-caption text-on-forest-soft">
        <span>{num(count)} فردًا</span>
        <span aria-hidden="true">·</span>
        <span>{num(generations(s.people, s.tree.rootId))} أجيال</span>
      </span>
    </Link>
  );
}

const whoMay: Partial<Record<Need, string>> = {
  'review.view': 'المالك والمدققين',
  'activity.view': 'المالك والمدققين',
  member: 'أهل الشجرة المسجّلين',
};

/** In place of a page the acting role may not open: why, and the way back. */
function Locked({ need }: { need: Need }) {
  const s = useDemo();
  return (
    <div className="grid justify-items-center gap-4 rounded-3xl border border-line/40 bg-card px-6 py-14 text-center">
      <span className="relative flex size-20 items-center justify-center rounded-full border border-gold-light/60 bg-ivory text-olive">
        <Icon name="lock" className="text-[2.25rem]" />
        <span className="absolute -bottom-1 rounded-full bg-forest px-2.5 py-0.5 text-[0.7rem] font-semibold text-gold-light">
          {viewerLabel[s.as]}
        </span>
      </span>
      <h2 className="text-h2 font-bold text-forest">
        هذي الصفحة لـ{whoMay[need] ?? 'مالك الشجرة'} فقط
      </h2>
      <p className="max-w-md text-body leading-relaxed text-muted">
        {s.as === 'visitor'
          ? 'دخلت برابط مشاهدة، فتقدر تتصفح الشجرة بس. للإضافة اطلب من المالك رابط مساهمة.'
          : s.as === 'contributor'
            ? 'كمساهم، تضيف داخل غصنك وتتابع إضافاتك. الاعتماد والإدارة عند المالك والمدققين.'
            : 'كمدقق، تعتمد إضافات غصنك وتشوف السجل. الإدارة والباقة عند المالك.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={t('')}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-forest px-4 text-body font-semibold text-ivory"
        >
          <Icon name="account_tree" />
          ارجع للشجرة
        </Link>
        <Button variant="ghost" className="rounded-xl" onClick={() => actAs('owner')}>
          جرّب كمالك
        </Button>
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
          {icon ? (
            <Icon name={icon} className={tone === 'danger' ? 'text-danger' : 'text-olive'} />
          ) : null}
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
      <span className="relative">
        <Sapling className="h-24 w-32" />
        <span className="absolute -bottom-1 end-1 flex size-8 items-center justify-center rounded-full border border-gold-light/60 bg-card text-olive shadow-sm">
          <Icon name={icon} className="text-[1.1rem]" />
        </span>
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
    <div
      role="tablist"
      className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-line/50 bg-surface-low p-1 [scrollbar-width:none]"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-body font-medium transition',
            tab.value === value
              ? 'bg-forest text-ivory shadow-sm'
              : 'text-ink-soft hover:text-forest',
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
export function Toast({
  text,
  undo,
  onDone,
}: {
  text: string;
  undo?: () => void;
  onDone: () => void;
}) {
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
