import { Icon, cn } from '@sulalah/ui';
import type { PlanOffer } from '@sulalah/domain';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';
import { InView } from '@/components/home/InView';
import { backendOn, supabaseKey, supabaseUrl } from '@/lib/backend';
import type { BillingDatabase } from '@/lib/supabase/billing-types';
import {
  PageHead,
  PlanCards,
  PlanTable,
  SiteFooter,
  SiteHeader,
  d,
  wrap,
} from '@/components/site/Site';

/** Prices come from the plans table, so announcing them needs no deploy. */
export const revalidate = 300;

async function offers(): Promise<PlanOffer[] | undefined> {
  if (!backendOn) return undefined;
  try {
    const db = createClient<BillingDatabase>(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { data } = await db.from('plans').select('*').order('rank');
    return data?.map((p) => ({
      id: p.id,
      limits: { maxPersons: p.max_persons, maxReviewers: p.max_reviewers },
      prices: { monthly: p.price_monthly_halalas, annual: p.price_annual_halalas },
    }));
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  title: 'الباقات | سُلالة',
  description: 'باقات سُلالة لشجرة العائلة: المالك وحده يشترك، والأقارب يدخلون ويضيفون مجانًا.',
};

const rules = [
  {
    icon: 'person',
    title: 'المالك وحده يشترك',
    body: 'اللي يزرع الشجرة هو اللي يدفع. الأقارب يدخلون برقم جوالهم، يختارون أغصانهم ويضيفون، بدون أي اشتراك.',
  },
  {
    icon: 'trending_up',
    title: 'ترقّي متى ما كبرت الشجرة',
    body: 'تنقل لباقة أكبر في أي وقت، وتبقى كل الأسماء والاعتمادات مثل ما هي.',
  },
  {
    icon: 'pause_circle',
    title: 'إذا وصلت الحد، ما يضيع شي',
    body: 'تتوقف الإضافات الجديدة فقط حتى الترقية، والشجرة نفسها محفوظة وتنعرض كاملة لأهلها.',
  },
];

const questions = [
  {
    q: 'متى تُعلن الأسعار؟',
    a: 'عند الإطلاق. إلى ذاك الوقت تُفعّل الباقات يدويًا لمن يجرّب سُلالة معنا. بعده تدفع بمدى أو فيزا أو ماستركارد، شهريًا أو سنويًا، ويتجدد الاشتراك لحاله وتقدر توقفه متى ما شئت.',
  },
  {
    q: 'الأفراد يشملون البنات والزوجات؟',
    a: 'نعم. كل اسم في الشجرة فرد، ابنًا كان أو ابنة. الإضافات اللي ما اعتُمدت ما تُحسب.',
  },
  {
    q: 'وش يصير لبياناتنا لو ألغيت الاشتراك؟',
    a: 'تقدر تنزّل الشجرة كاملة ملف CSV أو نسخة مشفّرة قبل الإلغاء. الأسماء ملك العائلة، مو ملكنا.',
  },
];

export default async function PricingPage() {
  const list = await offers();
  return (
    <main className="overflow-x-clip bg-ivory text-ink">
      <SiteHeader />
      <PageHead
        title="باقة على قد عائلتكم"
        body="الباقة تحدد عدد الأفراد في الشجرة وعدد المدققين اللي يساعدونك. الأجيال بلا حد، والأقارب ما يدفعون شي."
      />

      <section className="bg-card py-16 md:py-24">
        <InView className={cn(wrap, 'grid gap-14')}>
          <PlanCards offers={list} />
          <PlanTable />
        </InView>
      </section>

      <section className="border-t border-gold-light/30 py-16 md:py-24">
        <InView className={cn(wrap, 'grid gap-10 md:grid-cols-3')}>
          {rules.map((r, i) => (
            <div key={r.title} data-reveal style={d(i)} className="grid content-start gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl border border-gold-light/60 bg-card text-olive shadow-sm">
                <Icon name={r.icon} />
              </span>
              <h2 className="text-title font-bold text-forest">{r.title}</h2>
              <p className="text-body-lg leading-[1.9] text-ink-soft">{r.body}</p>
            </div>
          ))}
        </InView>
      </section>

      <section className="border-t border-gold-light/30 bg-card py-16 md:py-24">
        <InView className={cn(wrap, 'grid max-w-3xl gap-3')}>
          {questions.map((f, i) => (
            <details
              key={f.q}
              data-reveal
              style={d(i)}
              className="faq group rounded-2xl border border-line/50 bg-ivory open:border-gold-light open:shadow-float"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-title font-semibold text-forest">
                {f.q}
                <span className="faq-mark flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-olive transition-transform duration-300">
                  <Icon name="add" />
                </span>
              </summary>
              <p className="px-6 pb-6 text-body-lg leading-[1.9] text-ink-soft">{f.a}</p>
            </details>
          ))}
          <p data-reveal className="pt-4 text-center text-body text-muted">
            عندك سؤال ثاني؟{' '}
            <Link href="/#faq" className="font-semibold text-olive hover:underline">
              شوف كل الأسئلة
            </Link>
          </p>
        </InView>
      </section>

      <SiteFooter />
    </main>
  );
}
