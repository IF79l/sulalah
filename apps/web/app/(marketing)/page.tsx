import { defaultPlanLimits, type PlanId } from '@sulalah/domain';
import { buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { DemoPoster } from '@/components/DemoTree';

/** The three steps are a real sequence, each drawn as the mark it leaves on the tree. */
const steps: { title: string; body: string; leaf: 'trunk' | 'sprout' | 'leaf' }[] = [
  {
    title: 'ازرع الجذع',
    body: 'اكتب اسم الجد ومن فوقه من الأجداد، فيقوم جذع شجرتكم وعليه نسبكم.',
    leaf: 'trunk',
  },
  {
    title: 'ادعُ العائلة',
    body: 'أرسل رابطًا في قروب العائلة. كل واحد يختار غصنه، ويضيف أبناءه وأحفاده فتنبت أوراقهم مقترحة.',
    leaf: 'sprout',
  },
  {
    title: 'اعتمد ما يصل',
    body: 'تراجع الإضافات على الشجرة نفسها، أنت أو مدقق تختاره لغصن معيّن، فتخضرّ الأوراق وتثبت.',
    leaf: 'leaf',
  },
];

const plans: { id: PlanId; name: string; who: string }[] = [
  { id: 'family', name: 'العائلة', who: 'أب وأم وأبناؤهم' },
  { id: 'extended', name: 'العائلة الممتدة', who: 'جد وأبناؤه وأحفاده' },
  { id: 'tribe', name: 'القبيلة', who: 'نسب ممتد لعدة أجداد' },
];

const num = (n: number) => n.toLocaleString('en-US');
const gutter =
  'pr-[max(20px,env(safe-area-inset-right,0px))] pl-[max(20px,env(safe-area-inset-left,0px))]';

function StepMark({ kind }: { kind: 'trunk' | 'sprout' | 'leaf' }) {
  if (kind === 'trunk')
    return (
      <svg viewBox="0 0 40 40" className="size-10" aria-hidden>
        <circle cx="20" cy="20" r="15" fill="#FBF5E2" stroke="#C9A45C" strokeWidth="3" />
        <circle cx="20" cy="20" r="9" fill="none" stroke="#C9A45C" strokeWidth="1" />
      </svg>
    );
  const sprout = kind === 'sprout';
  return (
    <svg viewBox="0 0 40 40" className="size-10" aria-hidden>
      <path
        d="M20 37C9 30 7 15 20 3c13 12 11 27 0 34Z"
        fill={sprout ? '#FFF9E6' : '#7FB95B'}
        stroke={sprout ? '#C9A45C' : '#5D9944'}
        strokeWidth="1.6"
        strokeDasharray={sprout ? '3 2.5' : undefined}
      />
      <path d="M20 35V8" stroke={sprout ? '#C9A45C' : '#4E8A38'} strokeWidth="1.2" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="bg-walnut text-parchment">
      {/* The poster hangs on a walnut wall under a warm light; the page is the room around it. */}
      <section className="relative isolate min-h-dvh overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_70%_at_32%_45%,rgb(201_164_92/0.16),transparent_70%)]"
        />
        <header
          className={cn(
            'flex items-center justify-between pt-[calc(18px+env(safe-area-inset-top,0px))] md:px-14',
            gutter,
          )}
        >
          <span className="font-title text-3xl text-gilt">سُلالة</span>
          <Link href="/login" className={buttonClass('onDark', 'sm')}>
            دخول
          </Link>
        </header>

        <div
          className={cn(
            'grid items-center gap-10 pt-8 pb-14 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:px-14 md:pt-4',
            gutter,
          )}
        >
          <div className="grid max-w-xl gap-7">
            <h1 className="font-title text-[clamp(2.7rem,5.6vw,5.2rem)] leading-[1.75] text-balance text-parchment">
              كل عائلة لها جذور، وكل غصن يحمل حكاية
            </h1>
            <p className="max-w-[44ch] text-lg leading-[1.9] text-parchment-soft">
              ابنِ شجرة عائلتكم كما تُرسم لوحات النسب: الجد جذعها، وكل أب غصن، وكل ابن وبنت ورقة
              باسمه. ادعُ العائلة تضيف فروعها، وأنت تعتمد.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/trees/new" className={buttonClass('gilt')}>
                ابدأ شجرة عائلتك
              </Link>
              <Link href="/demo" className={buttonClass('onDark')}>
                جرّب الشجرة
              </Link>
            </div>
          </div>

          <figure className="mx-auto w-full max-w-[560px] md:w-[min(46vw,640px)] md:max-w-none">
            <div className="rounded-[6px] bg-[#3b2a1c] p-2.5 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.75)] ring-1 ring-gilt/40">
              <div className="rounded-[2px] p-1.5 ring-1 ring-gilt/60">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-paper">
                  <DemoPoster />
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-sm text-parchment-soft">
              عائلة تجريبية. اضغط على أي غصن.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={cn('border-t border-walnut-line py-20 md:px-14', gutter)}>
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <h2 className="font-title text-4xl leading-snug text-parchment md:text-5xl">
            كيف تنمو شجرتكم
          </h2>
          <ol className="relative grid gap-10">
            <span aria-hidden className="absolute start-5 top-6 bottom-6 w-px bg-gilt/35" />
            {steps.map((s) => (
              <li key={s.title} className="relative grid grid-cols-[40px_1fr] gap-5">
                <span className="bg-walnut">
                  <StepMark kind={s.leaf} />
                </span>
                <div className="grid gap-1.5 pt-1.5">
                  <h3 className="text-xl font-semibold text-parchment">{s.title}</h3>
                  <p className="max-w-[52ch] leading-[1.9] text-parchment-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={cn('bg-paper py-20 text-ink md:px-14', gutter)}>
        <div className="mx-auto grid max-w-5xl gap-10">
          <div className="grid gap-3">
            <h2 className="font-title text-4xl text-ink md:text-5xl">الباقات</h2>
            <p className="max-w-[56ch] leading-[1.9] text-ink-soft">
              مالك الشجرة وحده يشترك. المدققون والمساهمون من العائلة يدخلون بدون اشتراك.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-ink/80">
                  <td className="w-[28%] py-4" />
                  {plans.map((p) => (
                    <th key={p.id} scope="col" className="px-2 py-4 text-start align-bottom md:px-3">
                      <span className="block font-display text-xl font-bold">{p.name}</span>
                      <span className="mt-1 block text-sm font-normal text-ink-soft">{p.who}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[0.98rem]">
                <tr className="border-b border-line">
                  <th scope="row" className="py-4 text-start font-normal text-ink-soft">
                    عدد الأفراد
                  </th>
                  {plans.map((p) => (
                    <td key={p.id} className="px-3 py-4 font-semibold tabular-nums">
                      حتى {num(defaultPlanLimits[p.id].maxPersons)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-line">
                  <th scope="row" className="py-4 text-start font-normal text-ink-soft">
                    مدققون مساعدون
                  </th>
                  {plans.map((p) => (
                    <td key={p.id} className="px-3 py-4 font-semibold tabular-nums">
                      {num(defaultPlanLimits[p.id].maxReviewers)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="py-4 text-start font-normal text-ink-soft">
                    السعر
                  </th>
                  <td colSpan={3} className="px-3 py-4 text-gold">
                    يُعلن عند الإطلاق
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <Link href="/trees/new" className={buttonClass('primary')}>
              ابدأ شجرة عائلتك
            </Link>
          </div>
        </div>
      </section>

      <footer className={cn('py-10 text-sm text-parchment-soft md:px-14', gutter)}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <span className="font-title text-2xl text-gilt">سُلالة</span>
          <span>اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.</span>
        </div>
      </footer>
    </main>
  );
}
