'use client';

import { Chip, Icon, Logo, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { StatePage } from '@/components/States';
import { meets, type Need } from '@/components/AppShell';
import { TREE_ID, canReview, generations, update, useDemo } from '@/lib/demo-store';

type Role = 'owner' | 'reviewer' | 'contributor';

interface TreeCard {
  id: string;
  title: string;
  note: string;
  role: Role;
  people: number;
  generations: number;
  pending: number;
  activity: string;
  invitedBy?: string;
  faces: string[];
}

// Sample trees until they are stored (batch 2).
const sampleTrees: TreeCard[] = [
  {
    id: 'al-sahli',
    title: 'شجرة آل السهلي',
    note: 'من الجد محمد بن عبدالله إلى أحفاد أحفاده.',
    role: 'owner',
    people: 312,
    generations: 7,
    pending: 5,
    activity: 'أضاف سلمان حفيدًا جديدًا لغصن عبدالرحمن قبل ساعتين',
    faces: ['راشد سليمان', 'فهد راشد', 'عبدالله فهد', 'محمد عبدالله'],
  },
  {
    id: 'bani-khalid',
    title: 'شجرة آل الخالدي',
    note: 'أخوالي من جهة الوالدة.',
    role: 'contributor',
    people: 128,
    generations: 4,
    pending: 0,
    activity: 'اعتُمدت آخر إضافاتك قبل أسبوع',
    invitedBy: 'تركي الخالدي',
    faces: ['تركي خالد', 'خالد سعد'],
  },
];

const roleLabel: Record<Role, string> = {
  owner: 'المالك والمدقق الرئيسي',
  reviewer: 'مدقق',
  contributor: 'مساهم',
};

const num = (n: number) => n.toLocaleString('en-US');

const allNav: {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
  need?: Need;
}[] = [
  { icon: 'account_tree', label: 'أشجاري', href: '/trees', active: true },
  {
    icon: 'fact_check',
    label: 'الإضافات الواردة',
    href: '/trees/al-sahli/review',
    need: 'review.view',
  },
  {
    icon: 'verified_user',
    label: 'المدققون',
    href: '/trees/al-sahli/reviewers',
    need: 'reviewer.invite',
  },
  { icon: 'link', label: 'روابط الدعوة', href: '/trees/al-sahli/invites', need: 'invite.manage' },
  {
    icon: 'settings',
    label: 'إعدادات الشجرة',
    href: '/trees/al-sahli/settings',
    need: 'tree.manage',
  },
];

/** The trees the person belongs to; their own tree reads live from the demo store. */
export function MyTrees() {
  const s = useDemo();
  const root = s.people.find((p) => p.id === s.tree.rootId);
  const trees = sampleTrees.map((t) =>
    t.id === TREE_ID
      ? {
          ...t,
          role: s.as === 'visitor' ? t.role : s.as,
          title: s.tree.title,
          note: `من الجد ${root?.name ?? ''} إلى أحفاد أحفاده.`,
          people: s.people.filter((p) => p.status === 'approved').length,
          generations: generations(s.people, s.tree.rootId),
          pending: s.submissions.filter((x) => x.status === 'pending' && canReview(s, x.fatherId))
            .length,
        }
      : t,
  );
  if (s.as === 'visitor')
    return (
      <StatePage
        icon="login"
        title="سجّل دخولك عشان تشوف أشجارك"
        body="دخلت برابط مشاهدة، فتقدر تتصفح الشجرة اللي وصلتك بس."
        action={<RoleSwitcher />}
      />
    );
  const pending = s.submissions.filter(
    (x) => x.status === 'pending' && canReview(s, x.fatherId),
  ).length;
  const nav = allNav
    .filter((n) => meets(s, n.need))
    .map((n) => (n.need === 'review.view' ? { ...n, badge: pending } : n));
  const total = trees.reduce((s, t) => s + t.people, 0);
  const waiting = trees.reduce((s, t) => s + t.pending, 0);
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="sticky top-0 z-30 border-b border-line/30 bg-ivory/90 shadow-xs backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-[max(16px,env(safe-area-inset-right,0px))] md:px-8">
          <Link href="/" aria-label="سُلالة، الرئيسية">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <RoleSwitcher className="me-1" />
            <Link
              href="/notifications"
              aria-label="الإشعارات"
              className="relative flex size-10 items-center justify-center rounded-full text-forest hover:bg-surface"
            >
              <Icon name="notifications" />
              <span className="absolute top-2 right-2 size-2.5 rounded-full bg-danger ring-2 ring-ivory" />
            </Link>
            <span className="mx-2 h-6 w-px bg-line/40" />
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full p-0.5 pe-3 hover:bg-surface"
            >
              <Medallion name="فيصل" />
              <span className="hidden text-caption font-semibold text-forest sm:block">فيصل</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col justify-between border-e border-line/30 p-4 lg:flex">
          <nav className="grid gap-1">
            {nav.map((n) => {
              const inner = (
                <>
                  <span className="flex items-center gap-2">
                    <Icon name={n.icon} className={n.active ? 'text-leaf' : 'text-muted'} />
                    {n.label}
                  </span>
                  {n.badge ? <Chip tone="danger">{num(n.badge)}</Chip> : null}
                </>
              );
              const cls = cn(
                'flex items-center justify-between rounded-xl px-4 py-2.5 text-body',
                n.active
                  ? 'bg-olive-soft font-semibold text-on-olive-soft'
                  : 'text-ink-soft hover:bg-surface-high',
              );
              return n.href ? (
                <Link
                  key={n.label}
                  href={n.href}
                  className={cls}
                  aria-current={n.active ? 'page' : undefined}
                >
                  {inner}
                </Link>
              ) : (
                <span key={n.label} className={cn(cls, 'cursor-default opacity-60')} title="قريبًا">
                  {inner}
                </span>
              );
            })}
          </nav>
          <p className="border-t border-line/30 px-2 pt-4 text-caption leading-relaxed text-muted">
            اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.
          </p>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-line/30 pb-6 md:flex-row md:items-center">
            <h1 className="flex items-center gap-3 text-h1-m font-bold text-forest md:text-h1">
              أشجاري
              <Chip>{num(trees.length)}</Chip>
            </h1>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold-light/40 bg-card px-5 py-2.5 shadow-xs">
              <Stat label="أفراد في أشجارك" value={`${num(total)} فردًا`} />
              <span className="h-7 w-px bg-line/30" />
              <Stat label="بانتظار مراجعتك" value={num(waiting)} warn={waiting > 0} />
              <Link href="/trees/new" className={cn(buttonClass('primary', 'sm'), 'ms-auto')}>
                <Icon name="add" />
                شجرة جديدة
              </Link>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <div className="grid content-start gap-6 xl:col-span-8">
              {trees.map((t) => (
                <TreeCardView key={t.id} tree={t} />
              ))}
            </div>

            <div className="grid content-start gap-6 xl:col-span-4">
              <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-line/60 bg-ivory-deep/60 p-6 text-center transition-colors hover:border-olive">
                <span className="mb-3 flex size-14 items-center justify-center rounded-full border border-gold-light/40 bg-card text-olive shadow-sm">
                  <Icon name="add_circle" className="text-[1.75rem]" />
                </span>
                <h2 className="mb-1 text-title font-bold text-forest">شجرة جديدة</h2>
                <p className="mb-4 max-w-xs text-body leading-relaxed text-muted">
                  ابدأ باسم الجد المؤسس، ثم ادعُ العائلة يضيفون فروعهم.
                </p>
                <Link href="/trees/new" className={cn(buttonClass('primary'), 'w-full rounded-xl')}>
                  <Icon name="forest" />
                  ازرع شجرة
                </Link>
              </div>

              {s.ignoredInvites?.includes('al-abdulaziz') ? (
                <p className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-line/60 px-4 py-3 text-caption text-muted">
                  تجاهلت دعوة شجرة آل العبدالعزيز.
                  <button
                    type="button"
                    className="font-semibold text-olive hover:underline"
                    onClick={() =>
                      update((st) => ({
                        ...st,
                        ignoredInvites: (st.ignoredInvites ?? []).filter(
                          (x) => x !== 'al-abdulaziz',
                        ),
                      }))
                    }
                  >
                    تراجع
                  </button>
                </p>
              ) : (
                <section className="rounded-2xl border border-line/30 bg-card p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between border-b border-line/20 pb-3">
                    <h2 className="flex items-center gap-1.5 text-title font-bold text-forest">
                      <Icon name="mark_email_unread" className="text-olive" />
                      دعوات وصلتك
                    </h2>
                    <Chip>1 جديدة</Chip>
                  </div>
                  <div className="grid gap-2 rounded-xl border border-gold-light/25 bg-surface-low p-3">
                    <span className="text-body font-semibold text-forest">شجرة آل العبدالعزيز</span>
                    <p className="text-caption text-muted">
                      يدعوك سلطان العبدالعزيز لتضيف فرعك في الشجرة.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href="/login?invite=al-abdulaziz"
                        className={cn(buttonClass('primary', 'sm'), 'flex-1 rounded-lg')}
                      >
                        اقبل الدعوة
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          update((st) => ({
                            ...st,
                            ignoredInvites: [...(st.ignoredInvites ?? []), 'al-abdulaziz'],
                          }))
                        }
                        className={cn(buttonClass('ghost', 'sm'), 'rounded-lg text-danger')}
                      >
                        تجاهل
                      </button>
                    </div>
                  </div>
                </section>
              )}

              <figure className="relative overflow-hidden rounded-2xl bg-forest p-5 text-ivory shadow-sm">
                <blockquote className="mb-3 text-body-lg leading-relaxed text-ivory-deep">
                  «تَعَلَّمُوا مِنْ أَنْسَابِكُمْ مَا تَصِلُونَ بِهِ أَرْحَامَكُمْ»
                </blockquote>
                <figcaption className="text-caption text-olive-soft">
                  حديث شريف، رواه الترمذي
                </figcaption>
              </figure>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className="grid">
      <span className="text-caption text-muted">{label}</span>
      <span className={cn('text-title font-bold', warn ? 'text-pending' : 'text-forest')}>
        {value}
      </span>
    </span>
  );
}

function TreeCardView({ tree: t }: { tree: TreeCard }) {
  const owner = t.role === 'owner';
  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6',
        owner ? 'border-olive/30' : 'border-line/40',
      )}
    >
      {owner ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-l from-olive via-gold-light to-forest"
        />
      ) : null}
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'flex size-16 shrink-0 items-center justify-center rounded-2xl border-2',
              owner
                ? 'border-gold-light/60 bg-ivory text-leaf'
                : 'border-line/40 bg-surface-low text-olive',
            )}
          >
            <Icon name={owner ? 'nature_people' : 'park'} className="text-[2rem]" />
          </span>
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h2 font-bold text-forest">{t.title}</h2>
              <Chip tone={owner ? 'olive' : 'neutral'} icon={owner ? 'verified_user' : 'edit_note'}>
                {roleLabel[t.role]}
              </Chip>
            </div>
            <p className="text-body text-muted">{t.note}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-line/30 bg-surface-low px-3 py-1.5 text-caption font-medium text-forest">
          <Icon name="diversity_3" className="text-olive" />
          {num(t.people)} فردًا · {num(t.generations)} أجيال
        </span>
      </div>

      <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-gold-light/25 bg-surface-low p-4 md:flex-row">
        <div className="flex w-full items-center gap-3 md:w-auto">
          <span className="flex -space-x-2 space-x-reverse">
            {t.faces.map((f) => (
              <Medallion key={f} name={f} size="sm" className="ring-2 ring-card" />
            ))}
          </span>
          <span className="grid">
            <span className="text-caption text-muted">آخر نشاط</span>
            <span className="text-body font-medium text-ink">{t.activity}</span>
          </span>
        </div>
        {t.pending ? (
          <span className="flex w-full items-center justify-between gap-3 rounded-xl border border-pending/25 bg-pending-soft px-3 py-2 md:w-auto">
            <span className="flex items-center gap-2 text-caption font-bold text-pending">
              <span className="size-2.5 rounded-full bg-pending" />
              {num(t.pending)} إضافات بانتظارك
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-body font-semibold text-success">
            <Icon name="check_circle" />
            كل الإضافات معتمدة
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/20 pt-3">
        <span className="text-caption text-muted">
          {t.invitedBy ? `دعاك ${t.invitedBy}` : 'أنت مالك هذه الشجرة'}
        </span>
        <div className="flex items-center gap-2">
          {t.pending ? (
            <Link href={`/trees/${t.id}`} className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}>
              <Icon name="pending_actions" className="text-pending" />
              راجع الإضافات ({num(t.pending)})
            </Link>
          ) : null}
          <Link
            href={`/trees/${t.id}`}
            className={cn(buttonClass(owner ? 'primary' : 'secondary', 'sm'), 'rounded-xl')}
          >
            افتح الشجرة
            <Icon name="arrow_back" />
          </Link>
        </div>
      </div>
    </article>
  );
}
