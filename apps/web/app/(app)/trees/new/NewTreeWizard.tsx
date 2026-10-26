'use client';

import {
  NAME_MAX,
  cleanName,
  countedNames,
  defaultPlanLimits,
  fromCsv,
  generateTreeKey,
  type CsvIssue,
  type PlanId,
  type TreeFilePerson,
} from '@sulalah/domain';
import { Button, Chip, Field, Icon, Logo, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { TREE_ID, names, newId, replaceTree, update } from '@/lib/demo-store';
import { appEnv } from '@/lib/backend';
import { supabase } from '@/lib/supabase/client';
import { SaveRefused, plantTree } from '@/lib/tree-cloud';
import { keepKey } from '@/lib/tree-keys';

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
  i === 0
    ? `والد ${founder || 'الجد'}`
    : i === 1
      ? 'جده'
      : `الجد ${['الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع'][i - 2] ?? 'الأعلى'}`;

const num = (n: number) => n.toLocaleString('en-US');

/** A starter file: the founder, his sons, and a granddaughter, so every column shows. */
const templateCsv =
  '\uFEFF' +
  [
    'المعرف,الاسم,الجنس,معرف الأب,متوفى,سنة الميلاد,سنة الوفاة,الكنية,نبذة',
    '1,محمد بن عبدالله,ذكر,,نعم,1921,1998,أبو عبدالله,',
    '2,عبدالله,ذكر,1,,1953,,,',
    '3,سالم,ذكر,1,,1957,,,',
    '4,نورة,أنثى,2,,1984,,,',
  ].join('\r\n') +
  '\r\n';

interface Imported {
  file: string;
  people: TreeFilePerson[];
  rootId: string;
  issues: CsvIssue[];
  /** People with no line to the founder, left out of the tree. */
  dropped: number;
}

/** Keeps only the founder's line: anyone not descended from him has no place on the tree. */
function readCsv(file: string, text: string): Imported | { file: string; issues: CsvIssue[] } {
  const r = fromCsv(text);
  if (!r.rootId)
    return {
      file,
      issues: r.issues.length ? r.issues : [{ line: 1, message: 'ما لقينا أسماء في الملف' }],
    };
  const keep = new Set([r.rootId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const p of r.people)
      if (p.fatherId && keep.has(p.fatherId) && !keep.has(p.id)) {
        keep.add(p.id);
        grew = true;
      }
  }
  const people = r.people.filter((p) => keep.has(p.id));
  return {
    file,
    people,
    rootId: r.rootId,
    issues: r.issues,
    dropped: r.people.length - people.length,
  };
}

/**
 * Three steps to plant a tree: its name, the trunk (the founder and his forefathers, which
 * the tree engraves on its trunk), then the plan. With `live` the tree is sealed with a new key
 * kept on this device and saved; the owner leaves with its recovery code.
 */
export function NewTreeWizard({ live }: { live?: boolean }) {
  const [step, setStep] = useState(0);
  const [family, setFamily] = useState('');
  const [founder, setFounder] = useState('');
  const [ancestors, setAncestors] = useState<string[]>(['']);
  const [plan, setPlan] = useState<PlanId>('extended');
  const [done, setDone] = useState(false);
  const [imported, setImported] = useState<Imported | null>(null);
  const [planted, setPlanted] = useState<string>();
  const [planting, setPlanting] = useState(false);
  const [plantError, setPlantError] = useState<string>();

  const title = cleanName(family) ? `شجرة آل ${cleanName(family)}` : 'شجرة العائلة';
  const filled = ancestors.map(cleanName).filter(Boolean);
  const canNext = step === 0 ? !!family.trim() : step === 1 ? !!founder.trim() : true;

  const plantLive = async () => {
    setPlanting(true);
    setPlantError(undefined);
    const rootId = imported?.rootId ?? newId('p');
    const people: TreeFilePerson[] = imported
      ? imported.people.map((p) => ({
          ...p,
          status: 'approved' as const,
          ...(p.id === rootId ? { name: cleanName(founder) } : {}),
        }))
      : [{ id: rootId, name: cleanName(founder), gender: 'male', fatherId: null, status: 'approved' }];
    // Every tree starts on the first plan until the one chosen is activated, and the server
    // refuses a first file larger than that plan, so say so here instead of failing there.
    const { data: start } = await supabase()
      .from('plans')
      .select('max_persons')
      .eq('id', 'family')
      .maybeSingle();
    const cap = start?.max_persons ?? defaultPlanLimits.family.maxPersons;
    const count = countedNames(people, rootId);
    if (count > cap) {
      setPlanting(false);
      setPlantError(
        `كل شجرة تبدأ بباقة "العائلة" (حتى ${num(cap)} فرد) إلى أن تتفعل الباقة اللي اخترتها، وملفك فيه ${num(count)}. ازرعها الآن بدون الملف أو بملف أصغر، وتكمّل الأسماء بعد تفعيل الباقة.`,
      );
      return;
    }
    const key = generateTreeKey();
    try {
      const id = await plantTree(
        plan,
        (treeId) => {
          // Kept before the first save, so a dropped connection never strands the tree.
          keepKey(treeId, key);
          return {
            format: 'sulalah-tree',
            version: 1,
            tree: { id: treeId, title, family: cleanName(family), rootId, ancestors: filled },
            people,
            unions: [],
            submissions: [],
            updatedAt: new Date().toISOString(),
          };
        },
        key,
      );
      setPlanted(id);
      setDone(true);
    } catch (e) {
      const why = (e as { code?: string; message?: string }) ?? {};
      if (e instanceof SaveRefused) {
        setPlantError(`ما قدرنا نزرع الشجرة: ${e.message}`);
        return;
      }
      setPlantError(
        `ما قدرنا نزرع الشجرة. تأكد من اتصالك وحاول مرة ثانية.${
          appEnv === 'staging'
            ? ` (${[why.code, why.message].filter(Boolean).join(': ') || 'خطأ'})`
            : ''
        }`,
      );
    } finally {
      setPlanting(false);
    }
  };

  const plant = () => {
    if (live) {
      void plantLive();
      return;
    }
    if (imported) {
      replaceTree(
        { title, family: family.trim(), rootId: imported.rootId, ancestors: filled },
        imported.people.map((p) => (p.id === imported.rootId ? { ...p, name: founder.trim() } : p)),
      );
      update((st) => ({ ...st, plan }));
    }
    setDone(true);
  };
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
            {imported
              ? `نبتت بـ ${names(imported.people.length)} من ملفك. ادعُ عائلتك يكملون أغصانهم.`
              : 'الخطوة التالية: ادعُ عائلتك يختارون أغصانهم ويضيفون أبناءهم.'}
          </p>
          <div className="grid w-full gap-2">
            <Link href={`/trees/${planted ?? TREE_ID}`} className={buttonClass('primary')}>
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
                <span
                  className="flex items-center gap-2"
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-caption font-bold md:size-9',
                      i < step && 'bg-forest text-ivory',
                      i === step &&
                        'border-2 border-gold-light bg-forest text-gold-light shadow-md',
                      i > step && 'border border-dashed border-outline text-outline',
                    )}
                  >
                    {i < step ? (
                      <Icon name="check" />
                    ) : i === step ? (
                      <Icon name={s.icon} fill />
                    ) : (
                      num(i + 1)
                    )}
                  </span>
                  <span className="hidden lg:grid">
                    <span
                      className={cn(
                        'text-body font-semibold',
                        i > step ? 'text-outline' : 'text-forest',
                      )}
                    >
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
                  placeholder="السهلي"
                  maxLength={40}
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  icon="family_restroom"
                  autoFocus
                />
                {family.trim() ? (
                  <p className="rounded-xl bg-surface-low px-4 py-3 text-body text-ink-soft">
                    عنوان الشجرة: <span className="font-title text-h2 text-forest">{title}</span>
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
                  maxLength={NAME_MAX}
                  value={founder}
                  onChange={(e) => setFounder(e.target.value)}
                  icon="park"
                  hint="هذا الاسم يكون جذع الشجرة، وتتفرع منه أسماء أبنائه وأحفاده."
                  autoFocus
                />
              </Card>
              <CsvImport
                imported={imported}
                onImport={(r) => {
                  setImported(r);
                  const root = r.people.find((p) => p.id === r.rootId);
                  if (root) setFounder(root.name);
                }}
                onClear={() => setImported(null)}
                maxPersons={defaultPlanLimits[live ? 'family' : plan].maxPersons}
                live={live}
              />
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
                        maxLength={NAME_MAX}
                        value={a}
                        onChange={(e) =>
                          setAncestors(ancestors.map((x, j) => (j === i ? e.target.value : x)))
                        }
                      />
                      <button
                        type="button"
                        aria-label="احذف"
                        onClick={() =>
                          setAncestors(
                            ancestors.length > 1 ? ancestors.filter((_, j) => j !== i) : [''],
                          )
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
                        on
                          ? 'border-2 border-forest shadow-md'
                          : 'border-line/50 hover:border-gold-light',
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

          {plantError ? (
            <p role="alert" className="text-body font-medium text-danger">
              {plantError}
            </p>
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
                disabled={!canNext || planting}
                onClick={() => (step < steps.length - 1 ? setStep(step + 1) : plant())}
              >
                {step < steps.length - 1
                  ? `التالي: ${steps[step + 1]!.title}`
                  : planting
                    ? 'نزرع الشجرة…'
                    : 'ازرع الشجرة'}
                <Icon
                  name={planting ? 'progress_activity' : 'arrow_back'}
                  className={planting ? 'animate-spin' : undefined}
                />
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
                  <span
                    aria-hidden="true"
                    className="h-6 w-1.5 bg-linear-to-b from-[#8f7b56] to-[#6b4329]"
                  />
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
              <span
                aria-hidden="true"
                className="h-1.5 w-32 rounded-full bg-linear-to-l from-transparent via-[#6b4329]/40 to-transparent"
              />
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

/** Start from a spreadsheet the family already keeps, instead of typing every name. */
function CsvImport({
  imported,
  onImport,
  onClear,
  maxPersons,
  live,
}: {
  imported: Imported | null;
  onImport: (r: Imported) => void;
  onClear: () => void;
  maxPersons: number;
  live?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState<{ file: string; issues: CsvIssue[] } | null>(null);

  const read = async (f: File | undefined) => {
    if (!f) return;
    const r = readCsv(f.name, await f.text());
    if ('people' in r) {
      setFailed(null);
      onImport(r);
    } else setFailed(r);
    if (input.current) input.current.value = '';
  };

  const template = () => {
    const url = URL.createObjectURL(new Blob([templateCsv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نموذج-سلالة.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const issues = imported?.issues ?? failed?.issues ?? [];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h3 className="flex items-center gap-2 text-title font-bold text-forest">
            <Icon name="table_view" className="text-olive" />
            عندك الأسماء في جدول؟ (اختياري)
          </h3>
          <p className="max-w-[52ch] text-caption leading-relaxed text-muted">
            ارفع ملف CSV من Excel أو Google Sheets، وتنبت الشجرة بكل أسمائها. كل صف شخص، ومعه معرف
            أبيه.
          </p>
        </div>
        <button
          type="button"
          onClick={template}
          className="text-caption font-semibold text-olive hover:underline"
        >
          نزّل ملف نموذج
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        onChange={(e) => read(e.target.files?.[0])}
      />

      {imported ? (
        <div className="grid animate-rise gap-2 rounded-xl border border-success/25 bg-success-soft p-4">
          <p className="flex items-start gap-2 text-body text-ink">
            <Icon name="check_circle" fill className="mt-0.5 text-success" />
            <span>
              قرأنا <strong className="text-forest">{names(imported.people.length)}</strong> من{' '}
              {imported.file}، والجد المؤسس{' '}
              {imported.people.find((p) => p.id === imported.rootId)?.name}.
              {imported.dropped ? ` تركنا ${num(imported.dropped)} ما لهم صلة بالجد المؤسس.` : ''}
            </span>
          </p>
          {countedNames(imported.people, imported.rootId) > maxPersons ? (
            <p className="text-caption text-pending">
              {live
                ? `العدد أكبر من حد باقة "العائلة" (${num(maxPersons)} فرد)، وكل شجرة تبدأ بها حتى تتفعل باقتها. خفّف الملف أو ازرعها بدونه الآن.`
                : `العدد أكبر من حد الباقة (${num(maxPersons)} فرد). اختر باقة أكبر في الخطوة الجاية.`}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => input.current?.click()}>
              <Icon name="sync" />
              ملف ثاني
            </Button>
            <Button size="sm" variant="ghost" onClick={onClear}>
              <Icon name="close" />
              بدون استيراد
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="justify-self-start rounded-xl"
          onClick={() => input.current?.click()}
        >
          <Icon name="upload_file" />
          اختر ملف CSV
        </Button>
      )}

      {issues.length ? (
        <div
          className={cn(
            'grid gap-1.5 rounded-xl p-3',
            failed && !imported ? 'bg-danger-soft' : 'bg-pending-soft',
          )}
        >
          <p
            className={cn(
              'text-caption font-semibold',
              failed && !imported ? 'text-danger' : 'text-pending',
            )}
          >
            {failed && !imported
              ? `ما قدرنا نقرأ ${failed.file}`
              : `ملاحظات على الملف (${num(issues.length)})`}
          </p>
          <ul className="grid gap-1 text-caption leading-relaxed text-ink-soft">
            {issues.slice(0, 5).map((i, k) => (
              <li key={k}>
                <span className="text-muted">السطر {num(i.line)}:</span> {i.message}
              </li>
            ))}
            {issues.length > 5 ? (
              <li className="text-muted">و{num(issues.length - 5)} ملاحظات ثانية</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </Card>
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
