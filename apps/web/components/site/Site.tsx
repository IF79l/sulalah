import { defaultPlanLimits, type PlanId, type PlanOffer } from '@sulalah/domain';
import { Icon, Logo, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { InView } from '@/components/home/InView';
import { PlanArt } from '@/components/home/PlanArt';

/** The public pages' shared frame: the top bar, the plans, and the closing footer. */

const num = (n: number) => n.toLocaleString('en-US');
export const wrap =
  'mx-auto w-full max-w-[76rem] px-[max(16px,env(safe-area-inset-right,0px))] md:px-8';
export const d = (n: number) => ({ ['--d' as string]: n });

export const plans: { id: PlanId; name: string; who: string }[] = [
  { id: 'family', name: 'العائلة', who: 'أب وأبناؤه وأحفاده' },
  { id: 'extended', name: 'العائلة الممتدة', who: 'جد وأبناؤه وأحفاده وأبناء العمومة' },
  { id: 'tribe', name: 'القبيلة', who: 'نسب ممتد لعدة أجداد وفروع كثيرة' },
];

/** What each plan includes beyond its limits; true means included. */
const features: [label: string, family: boolean, extended: boolean, tribe: boolean][] = [
  ['روابط دعوة للأقارب', true, true, true],
  ['بحث عربي في الشجرة', true, true, true],
  ['الأقارب يدخلون مجانًا', true, true, true],
  ['نسخة احتياطية مشفّرة وتصدير CSV', true, true, true],
  ['مدققون لأغصان محددة', false, true, true],
  ['سجل بكل إضافة ومن اعتمدها', false, true, true],
];

/** On the home page the section links scroll; elsewhere they lead back to it. */
export function SiteHeader({ home }: { home?: boolean }) {
  const base = home ? '' : '/';
  return (
    <header className="sticky top-0 z-50 border-b border-gold-light/25 bg-ivory/85 backdrop-blur-md">
      <div className={cn(wrap, 'flex h-16 items-center justify-between md:h-20')}>
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="سُلالة">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-body md:flex">
            {[
              [`${base}#how`, 'كيف تعمل'],
              [`${base}#roles`, 'الأدوار والخصوصية'],
              ['/pricing', 'الباقات'],
              [`${base}#faq`, 'أسئلة'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-ink-soft transition-colors hover:text-forest"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonClass('ghost', 'sm')}>
            دخول
          </Link>
          <Link href="/trees/new" className={cn(buttonClass('primary', 'sm'), 'max-sm:hidden')}>
            ابدأ شجرة عائلتك
          </Link>
        </div>
      </div>
    </header>
  );
}

/** "49 ر.س" from halalas. */
const sar = (h: number) => `${(h / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`;

/** The plan cards; with `offers` from the plans table they show its limits and prices. */
export function PlanCards({ offers }: { offers?: PlanOffer[] } = {}) {
  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      {plans.map((p, i) => {
        const featured = p.id === 'extended';
        const offer = offers?.find((o) => o.id === p.id);
        const l = offer?.limits ?? defaultPlanLimits[p.id];
        const price = offer?.prices;
        return (
          <InView
            as="article"
            key={p.id}
            className={cn(
              'relative flex flex-col gap-7 rounded-[1.75rem] p-7 md:p-8',
              featured
                ? 'plan-dark bg-forest text-ivory shadow-[0_40px_80px_-30px_rgb(22_56_47/0.6)] lg:-my-4 lg:py-11'
                : 'border border-line/60 bg-ivory',
            )}
          >
            <div data-reveal style={d(i)} className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <h3 className={cn('text-h2 font-bold', featured ? 'text-ivory' : 'text-forest')}>
                  {p.name}
                </h3>
                <p className={cn('text-body', featured ? 'text-ivory/70' : 'text-muted')}>
                  {p.who}
                </p>
              </div>
              {featured ? (
                <span className="shrink-0 rounded-full bg-gold-light px-3 py-1 text-caption font-bold text-forest">
                  الأنسب لأغلب العوائل
                </span>
              ) : null}
            </div>
            <PlanArt plan={p.id} />
            <div
              className={cn(
                'grid gap-1 border-y py-5',
                featured ? 'border-gold-light/25' : 'border-line/50',
              )}
            >
              <p className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-[2.75rem]/none font-bold tabular-nums',
                    featured ? 'text-gold-light' : 'text-forest',
                  )}
                >
                  {num(l.maxPersons)}
                </span>
                <span className={cn('text-body', featured ? 'text-ivory/80' : 'text-ink-soft')}>
                  فردًا في الشجرة
                </span>
              </p>
              <p className={cn('text-body', featured ? 'text-ivory/80' : 'text-ink-soft')}>
                مع{' '}
                {l.maxReviewers === 1 ? 'مدقق مساعد واحد' : `${num(l.maxReviewers)} مدققين مساعدين`}
              </p>
            </div>
            <p
              className={cn(
                'text-body font-semibold',
                featured ? 'text-gold-light' : 'text-forest',
              )}
            >
              {price?.monthly ? (
                <>
                  {sar(price.monthly)} شهريًا
                  {price.annual ? (
                    <span className="block text-caption font-normal opacity-80">
                      أو {sar(price.annual)} سنويًا
                    </span>
                  ) : null}
                </>
              ) : (
                'السعر يُعلن عند الإطلاق'
              )}
            </p>
            <Link
              href="/trees/new"
              className={cn(
                featured
                  ? 'inline-flex h-12 items-center justify-center rounded-full bg-gold-light px-7 font-semibold text-forest transition hover:bg-ivory'
                  : buttonClass('secondary'),
                'mt-auto w-full',
              )}
            >
              ابدأ بباقة {p.name}
            </Link>
          </InView>
        );
      })}
    </div>
  );
}

export function PlanTable() {
  return (
    <div data-reveal className="overflow-x-auto rounded-[1.75rem] border border-line/50">
      <table className="w-full min-w-[34rem] text-body">
        <caption className="sr-only">مقارنة الباقات</caption>
        <thead>
          <tr className="bg-surface-low text-start">
            <th scope="col" className="px-6 py-4 text-start font-semibold text-ink">
              في كل باقة
            </th>
            {plans.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="px-4 py-4 text-center font-semibold text-forest"
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          <tr>
            <th scope="row" className="px-6 py-3.5 text-start font-normal text-ink-soft">
              عدد الأفراد
            </th>
            {plans.map((p) => (
              <td
                key={p.id}
                className="px-4 py-3.5 text-center font-semibold tabular-nums text-ink"
              >
                {num(defaultPlanLimits[p.id].maxPersons)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="px-6 py-3.5 text-start font-normal text-ink-soft">
              مدققون مساعدون
            </th>
            {plans.map((p) => (
              <td
                key={p.id}
                className="px-4 py-3.5 text-center font-semibold tabular-nums text-ink"
              >
                {num(defaultPlanLimits[p.id].maxReviewers)}
              </td>
            ))}
          </tr>
          {features.map(([label, ...has]) => (
            <tr key={label}>
              <th scope="row" className="px-6 py-3.5 text-start font-normal text-ink-soft">
                {label}
              </th>
              {has.map((yes, k) => (
                <td key={k} className="px-4 py-3.5 text-center">
                  {yes ? (
                    <Icon name="check" label="متاح" className="text-success" />
                  ) : (
                    <span aria-label="غير متاح" className="text-line">
                      —
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SiteFooter({ home, cta = true }: { home?: boolean; cta?: boolean }) {
  const base = home ? '' : '/';
  return (
    <footer className="relative isolate overflow-hidden bg-forest-deep text-ivory">
      <div
        aria-hidden="true"
        className="star-ground absolute inset-0 -z-10 opacity-30 mix-blend-soft-light"
      />
      {cta ? (
        <InView
          className={cn(
            wrap,
            'grid justify-items-center gap-8 border-b border-gold-light/15 py-20 text-center md:py-28',
          )}
        >
          <p
            data-reveal
            className="font-title text-[2.5rem]/[1.4] text-gold-light md:text-[4rem]/[1.3]"
          >
            ازرعوا شجرتكم اليوم
          </p>
          <p data-reveal style={d(1)} className="max-w-xl text-body-lg leading-[1.9] text-ivory/80">
            تبدأ بالجد واسمين، وتكمّلها العائلة معك. وتبقى لأحفادكم يقرؤون فيها نسبهم.
          </p>
          <div data-reveal style={d(2)} className="flex flex-wrap justify-center gap-3">
            <Link
              href="/trees/new"
              className="inline-flex h-13 items-center gap-2 rounded-full bg-gold-light px-8 font-semibold text-forest transition hover:bg-ivory"
            >
              ابدأ شجرة عائلتك
              <Icon name="arrow_back" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-13 items-center gap-2 rounded-full border border-gold-light/40 px-7 font-semibold text-ivory transition hover:bg-ivory/10"
            >
              جرّب شجرة حقيقية
            </Link>
          </div>
        </InView>
      ) : null}
      <div className={cn(wrap, 'grid gap-8 py-10 md:grid-cols-12 md:items-center')}>
        <div className="grid justify-items-start gap-3 md:col-span-4">
          <Logo onDark />
          <p className="text-caption text-ivory/60">© 2026 سُلالة</p>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-3 text-body text-ivory/75 md:col-span-4 md:justify-center">
          <a href={`${base}#how`} className="hover:text-ivory">
            كيف تعمل
          </a>
          <Link href="/pricing" className="hover:text-ivory">
            الباقات
          </Link>
          <Link href="/privacy" className="hover:text-ivory">
            الخصوصية
          </Link>
          <Link href="/terms" className="hover:text-ivory">
            الشروط
          </Link>
          <Link href="/demo" className="hover:text-ivory">
            جرّب الشجرة
          </Link>
          <Link href="/login" className="hover:text-ivory">
            دخول
          </Link>
        </nav>
        <p className="flex items-start gap-2 text-caption leading-relaxed text-gold-light/90 md:col-span-4 md:justify-end">
          <Icon name="info" className="mt-0.5 shrink-0" />
          اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.
        </p>
      </div>
    </footer>
  );
}

/** The opening of a public page that is not the home page: its title over the star ground. */
export function PageHead({
  title,
  body,
  children,
}: {
  title: string;
  body: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="star-ground relative isolate border-b border-gold-light/30">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(50%_70%_at_50%_0%,rgb(211_234_190/0.5),transparent_70%),linear-gradient(to_bottom,transparent_60%,var(--color-ivory))]"
      />
      <div className={cn(wrap, 'grid justify-items-center gap-5 py-16 text-center md:py-24')}>
        <span aria-hidden="true" className="hero-in h-[3px] w-10 rounded-full bg-gold" />
        <h1
          className="hero-in text-[2rem]/[1.35] font-bold text-balance text-forest md:text-[3rem]/[1.25]"
          style={d(1)}
        >
          {title}
        </h1>
        <div
          className="hero-in max-w-2xl text-body-lg leading-[1.9] text-ink-soft md:text-[1.0625rem]"
          style={d(2)}
        >
          {body}
        </div>
        {children}
      </div>
    </section>
  );
}
