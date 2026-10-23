import { Icon, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { DemoPoster } from '@/components/DemoTree';
import { DaughtersGlimpse, InviteGlimpse, ReviewGlimpse } from '@/components/home/Glimpses';
import { GrowthStory } from '@/components/home/GrowthStory';
import { InView } from '@/components/home/InView';
import { PlanCards, PlanTable, SiteFooter, SiteHeader, d, wrap } from '@/components/site/Site';

/** The demo family's own line, from a grandson's leaf down to the family name on the trunk. */
const nasab = ['فيصل', 'بن خالد', 'بن عبدالله', 'بن محمد', 'بن سليمان', 'بن حمد', 'السهلي'];

const roles = [
  {
    name: 'المالك',
    scope: 'يشرف على الشجرة كلها، ويختار المدققين ويحدد أغصانهم.',
    person: 'فهد السهلي',
  },
  {
    name: 'المدقق',
    scope: 'يعتمد الإضافات في الأغصان اللي حددها له المالك فقط.',
    person: 'سالم متروك',
  },
  {
    name: 'المساهم',
    scope: 'يضيف أبناءه وبناته وأحفاده في غصنه، وإضافته تنتظر الاعتماد.',
    person: 'سعود سالم',
  },
];

const faq = [
  {
    q: 'هل الشجرة إثبات رسمي للنسب؟',
    a: 'لا. اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب. سُلالة تحفظ ما تتفق عليه العائلة وتعرضه بشكل جميل.',
  },
  {
    q: 'من يقدر يشوف شجرتنا؟',
    a: 'فقط من تدعوه أنت برابط. الشجرة لا تظهر في محركات البحث، وتقدر توقف أي رابط دعوة متى ما بغيت.',
  },
  {
    q: 'هل يدفع الأقارب؟',
    a: 'لا. المالك وحده يشترك، والأقارب يدخلون برقم جوالهم ويضيفون في أغصانهم مجانًا.',
  },
  {
    q: 'وش يصير لو أحد أضاف اسمًا غلط؟',
    a: 'ما يثبت شيء في الشجرة بدون اعتماد. الإضافة تبقى بحدود منقطة حتى يعتمدها المالك أو المدقق، أو يعدّلها، أو يرفضها.',
  },
  {
    q: 'كيف أدخل؟ هل أحتاج كلمة مرور؟',
    a: 'برقم جوالك فقط. يوصلك رمز برسالة نصية وتدخل به، بدون كلمة مرور.',
  },
  {
    q: 'كم جيل أقدر أضيف؟',
    a: 'الأجيال بلا حد. الباقة تحدد عدد الأفراد في الشجرة فقط.',
  },
];

function SectionHead({ title, body, center }: { title: string; body: string; center?: boolean }) {
  return (
    <div
      data-reveal
      className={cn('grid max-w-2xl gap-4', center && 'mx-auto justify-items-center text-center')}
    >
      <span aria-hidden="true" className="h-[3px] w-10 rounded-full bg-gold" />
      <h2 className="text-[1.75rem]/[1.35] font-bold text-balance text-forest md:text-[2.5rem]/[1.3]">
        {title}
      </h2>
      <p className="text-body-lg leading-[1.9] text-ink-soft md:text-[1.0625rem]">{body}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-x-clip bg-ivory text-ink">
      <SiteHeader home />

      {/* Hero */}
      <section className="star-ground relative isolate">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_30%_45%,rgb(211_234_190/0.55),transparent_70%),linear-gradient(to_bottom,transparent_70%,var(--color-ivory))]"
        />
        <div
          className={cn(
            wrap,
            'grid items-center gap-14 pt-12 pb-20 md:pt-16 lg:grid-cols-12 lg:gap-10 lg:pt-20 lg:pb-28',
          )}
        >
          <div className="grid justify-items-start gap-7 lg:col-span-5">
            <span
              className="hero-in inline-flex items-center gap-2 rounded-full border border-gold-light/60 bg-card/70 px-3.5 py-1.5 text-caption font-semibold text-olive"
              style={d(0)}
            >
              <Icon name="spa" fill className="text-[1rem]" />
              شجرة نسب تبنيها العائلة معًا
            </span>
            <h1
              className="hero-in text-[2.25rem]/[1.3] font-bold text-balance text-forest sm:text-[2.75rem]/[1.28] xl:text-[3.5rem]/[1.22]"
              style={d(1)}
            >
              كل عائلة لها جذور، وكل غصن يحمل حكاية
            </h1>
            <p
              className="hero-in max-w-[30rem] text-[1.0625rem] leading-[1.95] text-ink-soft"
              style={d(2)}
            >
              ابنوا شجرة عائلتكم كما تُرسم لوحات النسب: الجد جذعها، وكل أب غصن، وكل ابن وبنت ورقة
              باسمه. الأقارب يضيفون، وأنت تعتمد.
            </p>
            <div className="hero-in flex flex-wrap gap-3" style={d(3)}>
              <Link
                href="/trees/new"
                className={cn(
                  buttonClass('primary'),
                  'h-13 px-8 shadow-[0_12px_30px_-12px_rgb(22_56_47/0.6)]',
                )}
              >
                ابدأ شجرة عائلتك
                <Icon name="arrow_back" />
              </Link>
              <Link href="/demo" className={cn(buttonClass('quiet'), 'h-13 px-7')}>
                <Icon name="play_circle" className="text-olive" />
                جرّب شجرة حقيقية
              </Link>
            </div>
            <dl
              className="hero-in mt-2 grid w-full grid-cols-3 gap-4 border-t border-gold-light/50 pt-6"
              style={d(4)}
            >
              {[
                ['دخول', 'برقم الجوال'],
                ['خاصة', 'لمن تدعوه فقط'],
                ['مجانًا', 'للأقارب'],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-0.5">
                  <dt className="text-title font-bold text-forest">{k}</dt>
                  <dd className="text-caption text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <figure className="relative lg:col-span-7">
            <div className="hero-in relative" style={d(2)}>
              <div className="rounded-[2rem] bg-linear-to-br from-[#a58654] via-gold-light to-[#8c6e42] p-[3px] shadow-[0_50px_100px_-40px_rgb(22_56_47/0.55)]">
                <div className="overflow-hidden rounded-[calc(2rem-3px)] bg-ivory">
                  <div className="flex items-center justify-between border-b border-gold-light/40 bg-ivory-deep/80 px-5 py-3">
                    <span className="flex items-center gap-2 text-body font-semibold text-forest">
                      <Icon name="park" fill className="text-olive" />
                      شجرة أسرة السهلي
                    </span>
                    <span className="text-caption text-muted">اضغط أي غصن</span>
                  </div>
                  <div className="relative aspect-[4/5] sm:aspect-[6/5]">
                    <DemoPoster />
                  </div>
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="hero-note absolute top-[22%] -start-3 hidden w-64 rounded-2xl border border-gold-light/50 bg-card/95 p-3 shadow-float backdrop-blur sm:block lg:-start-10"
              style={d(6)}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[0_60%_0_60%] border-2 border-dashed border-pending bg-pending-soft text-pending">
                  <Icon name="add" className="text-[1rem]" />
                </span>
                <span className="grid gap-0.5 text-caption">
                  <span className="font-semibold text-ink">سعود أضاف «العنود» بنت ماجد</span>
                  <span className="text-pending">بانتظار اعتمادك</span>
                </span>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="hero-note absolute -bottom-6 end-4 hidden items-center gap-2.5 rounded-full border border-gold-light/50 bg-forest py-2 ps-2 pe-4 text-caption text-ivory shadow-toast sm:flex lg:-end-6"
              style={d(8)}
            >
              <Medallion name="فيصل خالد" size="sm" className="border-gold-light" />
              <span>
                <span className="text-gold-light">فيصل</span> بن خالد بن عبدالله بن محمد
              </span>
            </div>
          </figure>
        </div>
      </section>

      {/* The nasab, read from the leaf to the trunk */}
      <InView as="section" className="relative overflow-hidden bg-forest py-20 text-ivory md:py-28">
        <div
          aria-hidden="true"
          className="star-ground absolute inset-0 opacity-40 mix-blend-soft-light"
        />
        <div className={cn(wrap, 'relative grid justify-items-center gap-10 text-center')}>
          <p data-reveal className="text-body-lg text-on-forest-soft">
            في سُلالة، كل ورقة تُقرأ بنسبها كاملًا حتى الجذع
          </p>
          <p
            className="flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-2 font-title text-[2.25rem]/[1.5] sm:text-[3rem]/[1.45] lg:text-[3.6rem]/[1.4]"
            aria-label={nasab.join(' ')}
          >
            {nasab.map((w, i) => (
              <span
                key={w}
                aria-hidden="true"
                className={cn(
                  'nasab-word',
                  i === 0 && 'text-[#9fd08a]',
                  i === nasab.length - 1 ? 'text-gold-light' : i > 0 && 'text-ivory/90',
                )}
                style={d(i)}
              >
                {w}
              </span>
            ))}
          </p>
          <ul className="grid w-full max-w-4xl gap-px overflow-hidden rounded-2xl border border-gold-light/20 bg-gold-light/15 sm:grid-cols-3">
            {[
              ['all_inclusive', 'أجيال بلا حد', 'من الجد المؤسس إلى أصغر حفيد'],
              ['search', 'بحث يفهم العربية', 'يلقى «أحمد» لو كتبت «احمد»'],
              ['smartphone', 'مصممة للجوال', 'تكبير وتنقل بين الأغصان بلمسة'],
            ].map(([icon, title, body], i) => (
              <li
                key={title}
                data-reveal
                style={d(8 + i)}
                className="grid justify-items-center gap-1.5 bg-forest px-6 py-6"
              >
                <Icon name={icon!} className="mb-1 text-[1.5rem] text-gold-light" />
                <span className="text-title font-semibold">{title}</span>
                <span className="text-caption text-on-forest-soft">{body}</span>
              </li>
            ))}
          </ul>
        </div>
      </InView>

      {/* How it grows */}
      <section id="how" className="scroll-mt-20 bg-card pt-20 md:pt-28">
        <InView className={wrap}>
          <SectionHead
            title="كيف تنمو شجرتكم؟"
            body="ثلاث خطوات، والعائلة كلها تشارك. انزل مع الخطوات وشوف الشجرة تكبر."
          />
        </InView>
        <div className={cn(wrap, 'mt-6 pb-10 lg:mt-10')}>
          <GrowthStory />
        </div>
      </section>

      {/* Roles and privacy */}
      <section
        id="roles"
        className="scroll-mt-20 border-t border-gold-light/30 bg-ivory py-20 md:py-28"
      >
        <InView className={cn(wrap, 'grid gap-12')}>
          <SectionHead
            title="العائلة كلها تبني، وأنت تقرر"
            body="الشجرة خاصة بعائلتكم. ما يدخلها إلا من تدعوه، وكل واحد يضيف في حدود غصنه."
          />
          <div className="grid gap-5 lg:grid-cols-6">
            <article
              data-reveal
              style={d(1)}
              className="grid gap-6 rounded-[1.75rem] border border-line/50 bg-card p-6 md:p-8 lg:col-span-4"
            >
              <div className="grid gap-2">
                <h3 className="text-h2 font-bold text-forest">الدعوة برابط، والقريب يختار غصنه</h3>
                <p className="max-w-lg text-body leading-relaxed text-ink-soft">
                  أرسل رابطًا واحدًا في قروب العائلة. كل قريب يدخل برقم جواله ويحدد من أي غصن هو،
                  فتوصل إضافته في مكانها الصحيح.
                </p>
              </div>
              <InviteGlimpse />
            </article>

            <article
              data-reveal
              style={d(2)}
              className="relative grid content-between gap-8 overflow-hidden rounded-[1.75rem] bg-forest p-6 text-ivory md:p-8 lg:col-span-2 lg:row-span-2"
            >
              <div
                aria-hidden="true"
                className="star-ground absolute inset-0 opacity-30 mix-blend-soft-light"
              />
              <div className="relative grid gap-6">
                <h3 className="text-h2 font-bold">كل واحد بصلاحيته</h3>
                <ol className="relative grid gap-6">
                  <span
                    aria-hidden="true"
                    className="absolute start-4 top-4 bottom-4 w-px bg-gold-light/30"
                  />
                  {roles.map((r) => (
                    <li key={r.name} className="relative flex gap-3">
                      <Medallion name={r.person} size="sm" className="relative" />
                      <span className="grid gap-1">
                        <span className="text-title font-semibold text-gold-light">{r.name}</span>
                        <span className="text-body leading-relaxed text-ivory/80">{r.scope}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="relative grid gap-2 rounded-2xl border border-gold-light/25 bg-forest-deep/50 p-4">
                <p className="flex items-center gap-2 text-body font-semibold">
                  <Icon name="lock" fill className="text-gold-light" />
                  شجرتكم خاصة
                </p>
                <p className="text-caption leading-relaxed text-ivory/75">
                  لا تظهر في محركات البحث، وتقدر توقف أي رابط دعوة متى ما بغيت.
                </p>
              </div>
            </article>

            <article
              data-reveal
              style={d(3)}
              className="grid content-start gap-5 rounded-[1.75rem] border border-line/50 bg-card p-6 md:p-8 lg:col-span-2"
            >
              <div className="grid gap-2">
                <h3 className="text-h2 font-bold text-forest">المراجعة على الشجرة نفسها</h3>
                <p className="text-body leading-relaxed text-ink-soft">
                  كل إضافة تظهر بحدود منقطة في مكانها، وتخضرّ لما تعتمدها.
                </p>
              </div>
              <ReviewGlimpse />
            </article>

            <article
              data-reveal
              style={d(4)}
              className="grid content-start gap-5 rounded-[1.75rem] border border-line/50 bg-card p-6 md:p-8 lg:col-span-2"
            >
              <div className="grid gap-2">
                <h3 className="text-h2 font-bold text-forest">أسماء البنات بيدك</h3>
                <p className="text-body leading-relaxed text-ink-soft">
                  تظهر لأهل الشجرة، وتقدر تخفيها عن الزوار.
                </p>
              </div>
              <DaughtersGlimpse />
            </article>
          </div>
        </InView>
      </section>

      {/* Plans */}
      <section
        id="plans"
        className="scroll-mt-20 border-t border-gold-light/30 bg-card py-20 md:py-28"
      >
        <InView className={cn(wrap, 'grid gap-14')}>
          <SectionHead
            center
            title="باقة على قد عائلتكم"
            body="المالك وحده يشترك، والأقارب يدخلون ويضيفون مجانًا. الأسعار تُعلن عند الإطلاق."
          />
          <PlanCards />
          <PlanTable />
        </InView>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-20 border-t border-gold-light/30 bg-ivory py-20 md:py-28"
      >
        <InView className={cn(wrap, 'grid gap-10 lg:grid-cols-12 lg:gap-16')}>
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHead
                title="أسئلة تتكرر"
                body="وإذا ما لقيت جوابك، جرّب الشجرة التجريبية وشوف بنفسك."
              />
            </div>
          </div>
          <div className="grid gap-3 lg:col-span-8">
            {faq.map((f, i) => (
              <details
                key={f.q}
                data-reveal
                style={d(i)}
                className="faq group rounded-2xl border border-line/50 bg-card open:border-gold-light open:shadow-float"
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
          </div>
        </InView>
      </section>

      {/* Closing call and footer */}
      <SiteFooter home />
    </main>
  );
}
