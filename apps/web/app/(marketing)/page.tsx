import { defaultPlanLimits, type PlanId } from '@sulalah/domain';
import { Brand, buttonClass } from '@sulalah/ui';
import Link from 'next/link';
import { DemoPoster } from '@/components/DemoTree';

const steps = [
  {
    title: 'ازرع الجذع',
    body: 'اكتب اسم الجد والأجداد فوقه، فيقوم جذع شجرتكم وعليه نسبكم.',
  },
  {
    title: 'ادعُ العائلة',
    body: 'أرسل رابطًا في قروب العائلة. كل واحد يختار غصنه ويضيف أبناءه وأحفاده.',
  },
  {
    title: 'اعتمد ما يصل',
    body: 'كل إضافة تنتظر موافقتك أو موافقة مدقق تختاره، ثم تنبت في الشجرة.',
  },
];

const plans: { id: PlanId; name: string; who: string }[] = [
  { id: 'family', name: 'العائلة', who: 'أب وأم وأبناؤهم' },
  { id: 'extended', name: 'العائلة الممتدة', who: 'جد وأبناؤه وأحفاده' },
  { id: 'tribe', name: 'القبيلة', who: 'نسب ممتد لعدة أجداد' },
];

const num = (n: number) => n.toLocaleString('en-US');

export default function HomePage() {
  return (
    <main>
      <section className="relative grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[minmax(340px,5fr)_7fr] md:grid-rows-1">
        <div className="z-10 flex flex-col gap-6 px-[max(20px,env(safe-area-inset-right,0px))] pt-[calc(20px+env(safe-area-inset-top,0px))] pb-4 md:justify-center md:py-16 md:ps-16 md:pe-4">
          <div className="flex items-center justify-between">
            <Brand className="text-2xl" />
            <Link href="/login" className={buttonClass('ghost', 'sm')}>
              دخول
            </Link>
          </div>
          <div className="grid gap-4 md:mt-auto">
            <h1 className="font-display text-[clamp(1.9rem,4.6vw,3.4rem)] leading-[1.25] font-bold text-balance text-ink">
              كل عائلة لها جذور، وكل غصن يحمل حكاية.
            </h1>
            <p className="max-w-[46ch] text-lg leading-relaxed text-ink-soft">
              أنشئ شجرة عائلتك، وشاركها مع أفرادها، ودع أغصانكم تنمو جيلًا بعد جيل.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/trees/new" className={buttonClass('primary')}>
              ابدأ شجرة عائلتك
            </Link>
            <Link href="/demo" className={buttonClass('soft')}>
              جرّب الشجرة التفاعلية
            </Link>
          </div>
          <p className="text-sm text-ink-faint md:mb-auto">
            بدون بطاقة. الشجرة خاصة بعائلتك حتى تقرر مشاركتها.
          </p>
        </div>
        <div className="relative min-h-[62dvh] md:min-h-0">
          <DemoPoster />
        </div>
      </section>

      <section className="border-t border-line bg-card/60 px-[max(20px,env(safe-area-inset-right,0px))] py-16 md:px-16">
        <div className="mx-auto grid max-w-5xl gap-10">
          <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">كيف تنمو شجرتكم</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="grid content-start gap-2">
                <span className="font-title text-4xl text-gold">{num(i + 1)}</span>
                <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
                <p className="leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-[max(20px,env(safe-area-inset-right,0px))] py-16 md:px-16">
        <div className="mx-auto grid max-w-5xl gap-8">
          <div className="grid gap-2">
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">الباقات</h2>
            <p className="text-ink-soft">
              مالك الشجرة وحده يشترك. المدققون والمساهمون يدخلون مجانًا.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const limits = defaultPlanLimits[p.id];
              return (
                <article
                  key={p.id}
                  className="grid gap-4 rounded-(--radius-sheet) border border-line bg-card p-6"
                >
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink">{p.name}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{p.who}</p>
                  </div>
                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-4 border-b border-line/60 pb-2">
                      <dt className="text-ink-soft">الأفراد</dt>
                      <dd className="font-semibold text-ink">حتى {num(limits.maxPersons)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-soft">مدققون مساعدون</dt>
                      <dd className="font-semibold text-ink">{num(limits.maxReviewers)}</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-gold">السعر يُعلن عند الإطلاق</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-[max(20px,env(safe-area-inset-right,0px))] py-8 text-sm text-ink-faint md:px-16">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4">
          <span>سُلالة، شجرة عائلة حيّة</span>
          <span>اعتماد مالك الشجرة لا يُعد إثباتًا رسميًا للنسب.</span>
        </div>
      </footer>
    </main>
  );
}
