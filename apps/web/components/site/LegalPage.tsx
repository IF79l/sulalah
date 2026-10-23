import { Icon, cn } from '@sulalah/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHead, SiteFooter, SiteHeader, wrap } from '@/components/site/Site';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * A policy page: a contents list that stays beside the text on wide screens, numbered
 * sections (they are cited by number), and a short summary up front for people who will
 * read only that.
 */
export function LegalPage({
  title,
  intro,
  updated,
  summary,
  sections,
  other,
}: {
  title: string;
  intro: string;
  updated: string;
  summary: string[];
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <main className="overflow-x-clip bg-ivory text-ink">
      <SiteHeader />
      <PageHead title={title} body={intro}>
        <p className="hero-in text-caption text-muted" style={{ ['--d' as string]: 3 }}>
          آخر تحديث: {updated}، نسخة أولية قبل الإطلاق
        </p>
      </PageHead>

      <div className={cn(wrap, 'grid gap-10 py-14 md:py-20 lg:grid-cols-12 lg:gap-16')}>
        <aside className="lg:col-span-4">
          <nav aria-label="المحتويات" className="grid gap-1 lg:sticky lg:top-28">
            <p className="mb-2 text-caption font-semibold text-muted max-lg:hidden">المحتويات</p>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-baseline gap-3 rounded-lg px-3 py-2 text-body text-ink-soft transition hover:bg-surface hover:text-forest max-lg:hidden"
              >
                <span className="w-5 shrink-0 text-caption tabular-nums text-gold">{i + 1}</span>
                {s.title}
              </a>
            ))}
            <Link
              href={other.href}
              className="inline-flex items-center gap-1.5 px-3 text-caption font-semibold text-olive hover:underline lg:mt-4"
            >
              <Icon name="description" className="text-[1.1rem]" />
              {other.label}
            </Link>
          </nav>
        </aside>

        <article className="grid min-w-0 gap-12 lg:col-span-8">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-forest p-7 text-ivory md:p-9">
            <span
              aria-hidden="true"
              className="star-ground absolute inset-0 opacity-25 mix-blend-soft-light"
            />
            <h2 className="relative mb-4 font-title text-[1.75rem] text-gold-light">باختصار</h2>
            <ul className="relative grid gap-3">
              {summary.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-body-lg leading-[1.9] text-ivory/90"
                >
                  <Icon name="eco" fill className="mt-1.5 shrink-0 text-[1rem] text-olive-soft" />
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="grid scroll-mt-28 gap-4">
              <h2 className="flex items-baseline gap-3 text-h2 font-bold text-forest">
                <span className="text-title tabular-nums text-gold">{i + 1}</span>
                {s.title}
              </h2>
              <div className="grid max-w-[68ch] gap-4 text-body-lg leading-[2] text-ink-soft [&_li]:ms-5 [&_li]:list-disc [&_li]:ps-1 [&_strong]:text-ink [&_ul]:grid [&_ul]:gap-2">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </div>

      <SiteFooter cta={false} />
    </main>
  );
}
