'use client';

import { DemoPoster } from '@/components/DemoTree';
import { Icon, Logo, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import {
  generations,
  lineage,
  num,
  useDemo,
} from '@/lib/demo-store';

const errors = {
  expired: ['timer_off', 'انتهت صلاحية هذا الرابط', 'اطلب رابطًا جديدًا من فيصل في قروب العائلة.'],
  'used-up': ['link_off', 'هذا الرابط استُخدم بالكامل', 'وصل الرابط لعدد مرات الاستخدام المحدد. اطلب من فيصل رابطًا جديدًا.'],
  full: ['forest', 'الشجرة وصلت لحد باقتها', 'ما تقدر تنضم كمساهم حاليًا. تقدر تبلّغ فيصل يرفع الباقة، والشجرة نفسها محفوظة.'],
} as const;

/** S12: what a relative sees after tapping the link in the family group. */
export function InviteLanding({ state }: { state: 'ok' | keyof typeof errors }) {
  const s = useDemo();
  const people = lineage(s.people, s.tree.rootId).length;
  const err = state === 'ok' ? null : errors[state];
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-forest-deep">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-110 opacity-60 blur-[6px]">
        <DemoPoster />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-forest-deep/30 via-forest-deep/60 to-forest-deep/95" />

      <header className="relative z-10 flex justify-center pt-[calc(20px+env(safe-area-inset-top,0px))]">
        <Logo onDark />
      </header>

      <div className="relative z-10 flex flex-1 items-end justify-center px-4 pt-10 pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:items-center">
        <section className="w-full max-w-md animate-rise rounded-[1.75rem] border border-gold-light/40 bg-card/95 p-6 shadow-float backdrop-blur-md sm:p-8">
          {err ? (
            <div className="grid justify-items-center gap-3 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-surface text-muted">
                <Icon name={err[0]} className="text-[2rem]" />
              </span>
              <h1 className="text-h2 font-bold text-forest">{err[1]}</h1>
              <p className="text-body leading-relaxed text-muted">{err[2]}</p>
              <Link href="/" className={cn(buttonClass('quiet'), 'mt-2')}>
                تعرّف على سُلالة
              </Link>
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="flex items-center gap-3">
                <Medallion name="فيصل خالد" />
                <p className="text-body text-ink-soft">
                  <strong className="text-forest">فيصل بن خالد</strong> يدعوك للمساهمة في
                </p>
              </div>
              <div className="grid gap-1">
                <h1 className="font-title text-[2.25rem]/[1.4] text-forest">{s.tree.title}</h1>
                <p className="text-body text-muted">
                  {num(people)} فردًا · {num(generations(s.people, s.tree.rootId))} أجيال
                </p>
              </div>
              <ol className="grid gap-3 border-y border-line/40 py-5">
                {[
                  ['call_split', 'تختار غصنك', 'اسم أبيك أو اسمك إذا كنت مسجّلًا.'],
                  ['person_add', 'تضيف أبناءك وأحفادك', 'كل واحد باسمه، في مكانه الصحيح.'],
                  ['eco', 'يعتمدها المالك فتخضرّ', 'وتظهر لكل العائلة على الشجرة.'],
                ].map(([icon, title, body]) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-olive-soft/70 text-on-olive-soft">
                      <Icon name={icon!} className="text-[1.15rem]" />
                    </span>
                    <span className="grid">
                      <span className="text-body font-semibold text-forest">{title}</span>
                      <span className="text-caption text-muted">{body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Link href="/login?invite=1" className={cn(buttonClass('primary'), 'h-13 w-full text-body-lg')}>
                <Icon name="phone_iphone" />
                انضم برقم جوالك
              </Link>
              <p className="text-center text-caption text-muted">ما تحتاج كلمة مرور. يوصلك رمز برسالة نصية.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
