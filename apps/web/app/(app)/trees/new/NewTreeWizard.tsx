'use client';

import { defaultPlanLimits, type PlanId } from '@sulalah/domain';
import { Button, Chip, Field, Icon, Logo, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';

const steps = [
  { title: 'اسم الشجرة', icon: 'edit' },
  { title: 'الجذع والأجداد', icon: 'park' },
  { title: 'الباقة', icon: 'workspace_premium' },
] as const;

const plans: { id: PlanId; name: string; who: string }[] = [
  { id: 'family', name: 'العائلة', who: 'أب وأم وأبناؤهم' },
  { id: 'extended', name: 'العائلة الممتدة', who: 'جد وأبناؤه وأحفاده' },
  { id: 'tribe', name: 'القبيلة', who: 'نسب ممتد لعدة أجداد' },
];

/** The nth forefather above the founder, in words. */
const above = (i: number, founder: string) =>
  i === 0 ? `والد ${founder || 'الجد'}` : i === 1 ? 'جده' : `الجد ${['الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع'][i - 2] ?? 'الأعلى'}`;

const num = (n: number) => n.toLocaleString('en-US');

/**
 * Three steps to plant a tree: its name, the trunk (the founder and his forefathers, which
 * the tree engraves on its trunk), then the plan. Saving arrives with the database (batch 2).
 */
export function NewTreeWizard() {
  const [step, setStep] = useState(0);
  const [family, setFamily] = useState('');
  const [founder, setFounder] = useState('');
  const [ancestors, setAncestors] = useState<string[]>(['']);
  const [plan, setPlan] = useState<PlanId>('extended');
  const [done, setDone] = useState(false);

  const title = family.trim() ? `شجرة آل ${family.trim()}` : 'شجرة العائلة';
  const filled = ancestors.map((a) => a.trim()).filter(Boolean);
  const canNext = step === 0 ? !!family.trim() : step === 1 ? !!founder.trim() : true;
  const chain = [...filled].reverse().concat(founder.trim() ? [founder.trim()] : []);

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ivory px-4">
        <div className="grid w-full max-w-md animate-rise justify-items-center gap-4 rounded-2xl border border-gold-light/35 bg-card p-8 text-center shadow-float">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-gold-light bg-forest text-gold-light">
            <Icon name="park" fill className="text-[2rem]" />
          </span>
          <h1 className="text-h2 font-bold text-forest">نبتت {title}</h1>
          <p className="text-body text-muted">
            الخطوة التالية: ادعُ عائلتك يختارون أغصانهم ويضيفون أبناءهم.
          </p>
          <div className="grid w-full gap-2">
            <Link href="/trees/al-rashid" className={buttonClass('primary')}>
              افتح الشجرة
              <Icon name="arrow_back" />
            </Link>
            <Link href="/trees" className={buttonClass('ghost')}>
              العودة إلى أشجاري
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="sticky top-0 z-30 border-b border-line/30 bg-card/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-[max(16px,env(safe-area-inset-right,0px))] md:h-20 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/trees"
              className="inline-flex items-center gap-1 text-body font-medium text-forest hover:underline"
            >
              <Icon name="arrow_forward" />
              <span className="hidden sm:inline">العودة إلى أشجاري</span>
            </Link>
            <span className="hidden h-6 w-px bg-line/50 md:block" />
            <Logo className="hidden text-[0.9rem] md:inline-flex" />
          </div>

          <ol className="flex items-center gap-2 md:gap-3" aria-label="خطوات إنشاء الشجرة">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-center gap-2 md:gap-3">
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn('h-0.5 w-6 md:w-14', i <= step ? 'bg-forest' : 'bg-line/60')}
                  />
                ) : null}
                <span className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-caption font-bold md:size-9',
                      i < step && 'bg-forest text-ivory',
                      i === step && 'border-2 border-gold-light bg-forest text-gold-light shadow-md',
                      i > step && 'border border-dashed border-outline text-outline',
                    )}
                  >
                    {i < step ? <Icon name="check" /> : i === step ? <Icon name={s.icon} fill /> : num(i + 1)}
                  </span>
                  <span className="hidden lg:grid">
                    <span className={cn('text-body font-semibold', i > step ? 'text-outline' : 'text-forest')}>
                      {s.title}
                    </span>
                    <span className="text-caption text-muted">
                      {i < step ? 'مكتملة' : i === step ? 'الخطوة الحالية' : 'قادمة'}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <Chip className="hidden md:inline-flex" icon="forest">
            {title}
          </Chip>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-8">
        <main className="grid content-start gap-5">
          {step === 0 ? (
            <>
              <StepHead
                eyebrow="الاسم"
                title="وش اسم العائلة؟"
                body="يظهر الاسم عنوانًا فوق تاج الشجرة، وتقدر تغيّره بعدين."
              />
              <Card>
                <Field
                  label="اسم العائلة"
                  placeholder="الراشد"
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  icon="family_restroom"
                  autoFocus
                />
                {family.trim() ? (
                  <p className="rounded-xl bg-surface-low px-4 py-3 text-body text-ink-soft">
                    عنوان الشجرة:{' '}
                    <span className="font-title text-h2 text-forest">{title}</span>
                  </p>
                ) : null}
              </Card>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <StepHead
                eyebrow="الجذع"
                title="ازرع الجذع: الجد المؤسس وأجداده"
                body="الجد المؤسس هو جذع الشجرة، ومنه تتفرع الأغصان. وأجداده فوقه يُكتبون على الجذع."
              />
              <Card accent>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-title font-bold text-forest">
                    <Icon name="star" fill className="text-gold" />
                    الجد المؤسس <span className="text-danger">*</span>
                  </h3>
                  <Chip tone="olive">الجيل الأول</Chip>
                </div>
                <Field
                  label="الاسم الكامل"
                  placeholder="محمد بن عبدالله"
                  value={founder}
                  onChange={(e) => setFounder(e.target.value)}
                  icon="park"
                  hint="هذا الاسم يكون جذع الشجرة، وتتفرع منه أسماء أبنائه وأحفاده."
                  autoFocus
                />
              </Card>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-title font-bold text-forest">
                      <Icon name="account_tree" className="text-olive" />
                      الأجداد فوقه (اختياري)
                    </h3>
                    <p className="text-caption text-muted">الأقرب أولًا: أبوه، ثم جده، وهكذا.</p>
                  </div>
                  {filled.length ? <Chip>{num(filled.length)} أجداد</Chip> : null}
                </div>
                <ol className="grid gap-3">
                  {ancestors.map((a, i) => (
                    <li key={i} className="flex items-end gap-3">
                      <span className="mb-2.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-high text-caption font-bold text-forest">
                        {num(i + 1)}
                      </span>
                      <Field
                        className="flex-1"
                        label={above(i, founder.trim().split(' ')[0] ?? '')}
                        value={a}
                        onChange={(e) =>
                          setAncestors(ancestors.map((x, j) => (j === i ? e.target.value : x)))
                        }
                      />
                      <button
                        type="button"
                        aria-label="احذف"
                        onClick={() =>
                          setAncestors(ancestors.length > 1 ? ancestors.filter((_, j) => j !== i) : [''])
                        }
                        className="mb-2 rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <Icon name="delete" />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setAncestors([...ancestors, ''])}
                  className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line/70 py-3 text-body font-medium text-forest hover:border-olive hover:bg-surface-low"
                >
                  <Icon name="add_circle" />
                  أضف جدًا أعلى
                </button>
              </Card>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepHead
                eyebrow="الباقة"
                title="اختر باقة الشجرة"
                body="المالك وحده يشترك. أهلك يدخلون ويضيفون بدون اشتراك. تقدر ترفع الباقة بعدين."
              />
              <div role="radiogroup" aria-label="الباقة" className="grid gap-3">
                {plans.map((p) => {
                  const on = plan === p.id;
                  const limits = defaultPlanLimits[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPlan(p.id)}
                      className={cn(
                        'flex items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-start transition',
                        on ? 'border-2 border-forest shadow-md' : 'border-line/50 hover:border-gold-light',
                      )}
                    >
                      <span className="grid gap-1">
                        <span className="text-title font-bold text-forest">{p.name}</span>
                        <span className="text-body text-muted">{p.who}</span>
                        <span className="text-caption text-ink-soft">
                          حتى {num(limits.maxPersons)} فرد · {num(limits.maxReviewers)}{' '}
                          {limits.maxReviewers === 1 ? 'مدقق مساعد' : 'مدققين مساعدين'}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                          on ? 'border-forest bg-forest text-ivory' : 'border-line',
                        )}
                      >
                        {on ? <Icon name="check" className="text-[0.9rem]" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-caption text-muted">السعر يُعلن عند الإطلاق.</p>
            </>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line/30 pt-5">
            {step > 0 ? (
              <Button variant="quiet" onClick={() => setStep(step - 1)}>
                <Icon name="arrow_forward" />
                رجوع
              </Button>
            ) : (
              <span />
            )}
            <span className="flex items-center gap-4">
              <span className="hidden text-caption text-muted sm:inline">
                الخطوة {num(step + 1)} من {num(steps.length)}
              </span>
              <Button
                disabled={!canNext}
                onClick={() => (step < steps.length - 1 ? setStep(step + 1) : setDone(true))}
              >
                {step < steps.length - 1 ? `التالي: ${steps[step + 1]!.title}` : 'ازرع الشجرة'}
                <Icon name="arrow_back" />
              </Button>
            </span>
          </div>
        </main>

        <aside className="order-first lg:order-none">
          <div className="sticky top-28 grid gap-4 rounded-2xl border border-gold-light/40 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-line/30 pb-3">
              <h2 className="flex items-center gap-2 text-title font-bold text-forest">
                <span className="size-2 rounded-full bg-leaf" />
                معاينة الجذع
              </h2>
              <Chip icon="visibility">تتحدث وأنت تكتب</Chip>
            </div>
            <div className="flex flex-col items-center py-2">
              <span className="mb-1 flex gap-3 text-olive" aria-hidden="true">
                <Icon name="eco" />
                <Icon name="psychiatry" />
                <Icon name="eco" className="-scale-x-100" />
              </span>
              <span className="mb-3 text-caption text-muted">هنا تنبت الأغصان</span>
              <span className="flex size-28 flex-col items-center justify-center rounded-full border-4 border-gold-light bg-forest p-2 text-center shadow-lg">
                <span className="text-caption text-gold-light">الجد المؤسس</span>
                <span className="line-clamp-2 text-title font-bold text-ivory">
                  {founder.trim() || '؟'}
                </span>
              </span>
              {filled.map((a, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span aria-hidden="true" className="h-6 w-1.5 bg-linear-to-b from-[#8f7b56] to-[#6b4329]" />
                  <span className="flex min-w-48 items-center gap-3 rounded-xl border border-line/40 bg-card px-4 py-2.5 shadow-xs">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-olive-soft text-caption font-bold text-on-olive-soft">
                      {i === 0 ? 'أب' : 'جد'}
                    </span>
                    <span className="grid">
                      <span className="text-body font-semibold text-forest">{a}</span>
                      <span className="text-caption text-muted">{above(i, '')}</span>
                    </span>
                  </span>
                </div>
              ))}
              <span aria-hidden="true" className="h-6 w-2 rounded-b bg-[#6b4329]" />
              <span aria-hidden="true" className="h-1.5 w-32 rounded-full bg-linear-to-l from-transparent via-[#6b4329]/40 to-transparent" />
            </div>
            {chain.length > 1 ? (
              <p className="rounded-full border border-line/40 bg-surface-low px-4 py-1.5 text-center text-caption text-forest">
                سلسلة النسب: {chain.join(' ← ')}
              </p>
            ) : null}
            <p className="flex gap-2 rounded-xl bg-surface-low p-3 text-caption leading-relaxed text-ink-soft">
              <Icon name="lightbulb" className="text-pending" />
              هذه الأسماء أساس الشجرة. تقدر تعدّلها أو تضيف أجدادًا أعلى في أي وقت.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StepHead({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="grid gap-2 border-b border-line/30 pb-4">
      <Chip tone="olive" className="w-fit">
        {eyebrow}
      </Chip>
      <h1 className="text-h1-m font-bold text-balance text-forest md:text-h1">{title}</h1>
      <p className="max-w-[60ch] text-body-lg text-muted">{body}</p>
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <section
      className={cn(
        'grid gap-4 rounded-2xl border border-line/40 bg-card p-5 shadow-xs md:p-6',
        accent && 'border-e-4 border-e-forest',
      )}
    >
      {children}
    </section>
  );
}
