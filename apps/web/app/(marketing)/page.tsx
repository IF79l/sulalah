import { defaultPlanLimits, type PlanId } from '@sulalah/domain';
import { Icon, Logo, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { DemoPoster } from '@/components/DemoTree';

const num = (n: number) => n.toLocaleString('en-US');
const wrap = 'mx-auto max-w-7xl px-[max(16px,env(safe-area-inset-right,0px))] md:px-8';

/** The three steps are a real sequence, each marked by what it leaves on the tree. */
const steps = [
  {
    title: 'ازرع الجذع',
    body: 'اكتب اسم الجد المؤسس ومن فوقه من الأجداد، فيقوم جذع شجرتكم وعليه نسبكم.',
    foot: 'الجد جذع الشجرة',
    icon: 'account_tree',
    mark: 'bg-forest text-gold-light ring-gold-light/30',
  },
  {
    title: 'ادعُ العائلة',
    body: 'أرسل رابطًا في قروب العائلة. كل واحد يختار غصنه، ويضيف أبناءه وبناته وأحفاده.',
    foot: 'رابط دعوة لكل العائلة',
    icon: 'group_add',
    mark: 'bg-olive-soft text-on-olive-soft ring-olive/20',
  },
  {
    title: 'اعتمد ما يصل',
    body: 'تراجع الإضافات على الشجرة نفسها، أنت أو مدقق تختاره لغصن معيّن، فتخضرّ الأوراق وتثبت.',
    foot: 'لا شيء يثبت بدون اعتماد',
    icon: 'verified',
    mark: 'bg-leaf text-ivory ring-leaf/30',
  },
];

const privacy = [
  {
    title: 'شجرتكم خاصة',
    body: 'ما يشوفها إلا من تدعوه أنت برابط. ولا تظهر في محركات البحث.',
    icon: 'shield',
  },
  {
    title: 'كل واحد بصلاحيته',
    body: 'المساهم يضيف في غصنه فقط، والمدقق يعتمد في الأغصان اللي حددتها له، وأنت تشرف على الكل.',
    icon: 'admin_panel_settings',
  },
  {
    title: 'أسماء البنات بيدك',
    body: 'تقدر تخفي أسماء البنات عن الزوار، وتبقى ظاهرة لأهل الشجرة.',
    icon: 'visibility_off',
  },
];

const plans: { id: PlanId; name: string; who: string; icon: string; extras: string[] }[] = [
  {
    id: 'family',
    name: 'العائلة',
    who: 'أب وأم وأبناؤهم وأحفادهم.',
    icon: 'family_restroom',
    extras: ['روابط دعوة للأقارب', 'بحث عربي في الشجرة'],
  },
  {
    id: 'extended',
    name: 'العائلة الممتدة',
    who: 'جد وأبناؤه وأحفاده وأبناء العمومة.',
    icon: 'diversity_3',
    extras: ['مدققون لأغصان محددة', 'سجل بكل إضافة ومن اعتمدها'],
  },
  {
    id: 'tribe',
    name: 'القبيلة',
    who: 'نسب ممتد لعدة أجداد وفروع كثيرة.',
    icon: 'groups',
    extras: ['مدققون لأغصان محددة', 'سجل بكل إضافة ومن اعتمدها'],
  },
];

export default function HomePage() {
  return (
    <main className="bg-ivory text-ink">
      <header className="sticky top-0 z-50 bg-ivory/90 shadow-sm backdrop-blur-md">
        <div className={cn(wrap, 'flex h-16 items-center justify-between md:h-20')}>
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="سُلالة">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-7 text-body md:flex">
              <a href="#how" className="text-ink-soft hover:text-forest">
                كيف تعمل
              </a>
              <a href="#privacy" className="text-ink-soft hover:text-forest">
                الخصوصية
              </a>
              <a href="#plans" className="text-ink-soft hover:text-forest">
                الباقات
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClass('ghost', 'sm')}>
              دخول
            </Link>
            <Link href="/trees/new" className={cn(buttonClass('primary', 'sm'), 'max-sm:hidden')}>
              <Icon name="park" />
              ابدأ شجرة عائلتك
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-line/30 bg-[radial-gradient(var(--color-line)_0.6px,transparent_0.6px)] bg-size-[22px_22px] pt-10 pb-20 md:pt-14 md:pb-28">
        <div className={cn(wrap, 'grid items-center gap-12 lg:grid-cols-12')}>
          <div className="grid justify-items-start gap-6 lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-light/40 bg-surface-high px-3.5 py-1.5 text-caption font-semibold text-olive shadow-sm">
              <Icon name="spa" fill className="text-[1rem]" />
              شجرة نسب تبنيها العائلة معًا
            </span>
            <h1 className="text-hero-m font-bold text-balance text-forest md:text-hero">
              كل عائلة لها جذور،
              <br />
              وكل غصن يحمل حكاية
            </h1>
            <p className="max-w-xl text-body-lg leading-relaxed text-ink-soft">
              ابنِ شجرة عائلتكم كما تُرسم لوحات النسب: الجد جذعها، وكل أب غصن، وكل ابن وبنت ورقة
              باسمه.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/trees/new" className={buttonClass('primary')}>
                <Icon name="account_tree" />
                ابدأ شجرة عائلتك
              </Link>
              <Link href="/demo" className={buttonClass('quiet')}>
                <Icon name="visibility" className="text-olive" />
                جرّب الشجرة
              </Link>
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line/40 pt-6 text-body text-ink-soft">
              <li className="flex items-center gap-2">
                <Icon name="phone_iphone" className="text-olive" />
                دخول برقم الجوال
              </li>
              <li className="flex items-center gap-2">
                <Icon name="lock" className="text-olive" />
                خاصة بعائلتك
              </li>
              <li className="flex items-center gap-2">
                <Icon name="groups" className="text-olive" />
                الأقارب يدخلون مجانًا
              </li>
            </ul>
          </div>

          <figure className="lg:col-span-7">
            <div className="rounded-2xl bg-linear-to-tr from-[#9b7d50] via-gold-light to-[#9b7d50] p-[3px] shadow-[0_30px_80px_-30px_rgb(22_56_47/0.45)]">
              <div className="overflow-hidden rounded-[0.9rem] border border-gold-light/40 bg-ivory">
                <div className="flex items-center justify-between border-b border-line/30 bg-ivory-deep px-4 py-3">
                  <span className="text-body font-semibold text-forest">شجرة أسرة الراشد</span>
                  <span className="rounded-full border border-olive/20 bg-olive-soft px-2.5 py-0.5 text-caption text-on-olive-soft">
                    عائلة تجريبية
                  </span>
                </div>
                <div className="relative aspect-[4/5] sm:aspect-[5/4]">
                  <DemoPoster />
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-caption text-muted">
              هذه شجرة حقيقية من سُلالة. اضغط على أي غصن.
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-b border-line/30 bg-card py-20 md:py-24">
        <div className={wrap}>
          <div className="mx-auto mb-14 grid max-w-2xl justify-items-center gap-3 text-center">
            <h2 className="text-h1-m font-bold text-forest md:text-h1">كيف تنمو شجرتكم؟</h2>
            <p className="text-body-lg text-ink-soft">ثلاث خطوات، والعائلة كلها تشارك.</p>
          </div>
          <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
            <span
              aria-hidden="true"
              className="absolute top-16 right-[15%] left-[15%] hidden h-1 rounded-full bg-linear-to-l from-gold-light via-olive to-leaf opacity-60 md:block"
            />
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="relative grid content-between gap-6 rounded-2xl border border-line/40 bg-ivory p-7 shadow-sm"
              >
                <div className="grid gap-3">
                  <span
                    className={cn(
                      'mb-2 flex size-16 items-center justify-center rounded-2xl shadow-md ring-4',
                      s.mark,
                    )}
                  >
                    <Icon name={s.icon} className="text-[2rem]" />
                  </span>
                  <h3 className="flex items-center gap-2 text-title font-bold text-forest">
                    <span className="flex size-6 items-center justify-center rounded-full bg-olive-soft text-caption">
                      {num(i + 1)}
                    </span>
                    {s.title}
                  </h3>
                  <p className="text-body leading-relaxed text-ink-soft">{s.body}</p>
                </div>
                <p className="border-t border-line/30 pt-4 text-caption font-medium text-olive">{s.foot}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="privacy" className="relative scroll-mt-20 overflow-hidden border-b border-line/30 py-20 md:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-olive-soft/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-gold-light/25 blur-3xl" />
        <div className={cn(wrap, 'relative')}>
          <div className="mb-12 grid max-w-2xl gap-3">
            <h2 className="text-h1-m font-bold text-forest md:text-h1">خصوصية العائلة أولًا</h2>
            <p className="text-body-lg text-ink-soft">الشجرة للعائلة، وأنت تقرر من يشوف ومن يضيف.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {privacy.map((p) => (
              <article key={p.title} className="grid content-start gap-3 rounded-2xl border border-line/40 bg-card p-7 shadow-sm">
                <span className="mb-3 flex size-14 items-center justify-center rounded-2xl border border-line/30 bg-surface-high text-forest">
                  <Icon name={p.icon} className="text-[1.75rem]" />
                </span>
                <h3 className="text-title font-bold text-forest">{p.title}</h3>
                <p className="text-body leading-relaxed text-ink-soft">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="scroll-mt-20 bg-card py-20 md:py-24">
        <div className={wrap}>
          <div className="mx-auto mb-14 grid max-w-2xl justify-items-center gap-4 text-center">
            <h2 className="text-h1-m font-bold text-forest md:text-h1">اختر الباقة المناسبة لعائلتكم</h2>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-gold-light/60 bg-ivory px-5 py-2.5 text-body font-semibold text-forest shadow-sm">
              <Icon name="verified" fill className="text-olive" />
              المالك وحده يشترك، والأقارب يدخلون مجانًا
            </p>
          </div>
          <div className="grid items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
            {plans.map((p) => {
              const featured = p.id === 'extended';
              const l = defaultPlanLimits[p.id];
              return (
                <article
                  key={p.id}
                  className={cn(
                    'relative flex flex-col justify-between gap-8 rounded-2xl bg-ivory p-7 shadow-sm',
                    featured
                      ? 'border-2 border-gold-light shadow-xl ring-2 ring-gold-light/20 lg:-translate-y-2'
                      : 'border border-line/50',
                  )}
                >
                  {featured ? (
                    <span className="absolute -top-3.5 right-7 flex items-center gap-1.5 rounded-full border border-gold-light/40 bg-forest px-4 py-1 text-caption font-bold text-gold-light shadow-sm">
                      <Icon name="star" fill className="text-[0.95rem]" />
                      الأنسب لأغلب العوائل
                    </span>
                  ) : null}
                  <div className="grid gap-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-h2 font-bold text-forest">{p.name}</h3>
                      <Icon name={p.icon} className="text-olive" />
                    </div>
                    <p className="-mt-3 text-body text-muted">{p.who}</p>
                    <p className="border-b border-line/30 pb-5 text-title font-bold text-forest">
                      السعر يُعلن عند الإطلاق
                    </p>
                    <ul className="grid gap-3.5 text-body text-ink-soft">
                      <li className="flex items-center gap-3">
                        <Icon name="check_circle" className="text-success" />
                        <span>
                          حتى <strong>{num(l.maxPersons)} فرد</strong> في الشجرة
                        </span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Icon name="check_circle" className="text-success" />
                        <span>
                          <strong>
                            {num(l.maxReviewers)} {l.maxReviewers === 1 ? 'مدقق مساعد' : 'مدققين مساعدين'}
                          </strong>{' '}
                          مع المالك
                        </span>
                      </li>
                      {p.extras.map((x) => (
                        <li key={x} className="flex items-center gap-3">
                          <Icon name="check_circle" className="text-success" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href="/trees/new"
                    className={cn(buttonClass(featured ? 'primary' : 'secondary'), 'w-full')}
                  >
                    ابدأ بهذه الباقة
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-gold-light/20 bg-forest pt-14 pb-10 text-ivory">
        <div className={wrap}>
          <div className="grid gap-10 border-b border-line/20 pb-10 md:grid-cols-12">
            <div className="grid content-start justify-items-start gap-4 md:col-span-6">
              <Logo onDark className="text-[1.1rem]" />
              <p className="max-w-sm text-body leading-relaxed text-surface-highest">
                شجرة نسب حيّة تبنيها العائلة معًا، وتبقى للأجيال القادمة.
              </p>
            </div>
            <nav className="grid content-start gap-3 text-body text-surface-highest md:col-span-3">
              <h4 className="text-title font-bold text-gold-light">سُلالة</h4>
              <a href="#how" className="hover:text-ivory">
                كيف تعمل
              </a>
              <a href="#privacy" className="hover:text-ivory">
                الخصوصية
              </a>
              <a href="#plans" className="hover:text-ivory">
                الباقات
              </a>
            </nav>
            <nav className="grid content-start gap-3 text-body text-surface-highest md:col-span-3">
              <h4 className="text-title font-bold text-gold-light">ابدأ</h4>
              <Link href="/demo" className="hover:text-ivory">
                جرّب الشجرة
              </Link>
              <Link href="/trees/new" className="hover:text-ivory">
                ابدأ شجرة عائلتك
              </Link>
              <Link href="/login" className="hover:text-ivory">
                دخول
              </Link>
            </nav>
          </div>
          <div className="grid justify-items-center gap-6 pt-8">
            <p className="inline-flex items-center gap-2 rounded-xl border border-gold-light/25 bg-forest-deep/40 px-5 py-2 text-caption text-gold-light">
              <Icon name="info" />
              اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.
            </p>
            <p className="text-caption text-surface-highest/80">© 2026 سُلالة</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
