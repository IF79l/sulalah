'use client';

import { LivingTree } from '@sulalah/tree-svg';
import { demoAncestors, demoFamily, demoUnions, type LineagePerson } from '@sulalah/tree-engine';
import { Icon, cn } from '@sulalah/ui';
import { useEffect, useMemo, useRef, useState } from 'react';

const ROOT = 'mohammed';
const firstBranches = new Set(
  demoFamily.filter((p) => p.id === ROOT || p.fatherId === ROOT).map((p) => p.id),
);

/** What the tree holds at each step: the owner's trunk, then the family's additions, then approval. */
const stages: LineagePerson[][] = [
  demoFamily.filter((p) => firstBranches.has(p.id)),
  demoFamily.map((p) => (firstBranches.has(p.id) ? p : { ...p, status: 'proposed' as const })),
  demoFamily,
];

const steps = [
  {
    title: 'ازرع الجذع',
    body: 'اكتب اسم الجد المؤسس ومن فوقه من الأجداد، ثم أبناءه. يقوم جذع شجرتكم وعليه نسبكم مكتوبًا.',
    who: 'المالك',
    detail: [
      ['account_tree', 'الأجداد يُكتبون على الجذع'],
      ['timer', 'دقيقتان تكفي للبداية'],
    ],
  },
  {
    title: 'ادعُ العائلة',
    body: 'أرسل رابطًا في قروب العائلة. كل قريب يدخل برقم جواله، يختار غصنه، ويضيف أبناءه وبناته وأحفاده.',
    who: 'الأقارب',
    detail: [
      ['link', 'رابط واحد لكل العائلة'],
      ['call_split', 'كل واحد يضيف في غصنه'],
    ],
  },
  {
    title: 'اعتمد ما يصل',
    body: 'الإضافات تظهر على الشجرة نفسها بحدود منقطة. تعتمدها أنت أو مدقق تختاره لغصن معيّن، فتخضرّ الأوراق وتثبت.',
    who: 'المالك والمدققون',
    detail: [
      ['verified', 'لا شيء يثبت بدون اعتماد'],
      ['history', 'سجل بكل إضافة ومن اعتمدها'],
    ],
  },
] as const;

const captions = ['الجذع وأول الأغصان', 'إضافات العائلة بانتظار الاعتماد', 'الشجرة بعد الاعتماد'];

/**
 * The three steps told on one real tree: it stays pinned while the steps scroll past, and grows
 * through each step with the engine's own growth animation.
 */
export function GrowthStory() {
  const [stage, setStage] = useState(0);
  const [fit, setFit] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = items.current.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setStage(i);
        }
      },
      // On phones the tree is pinned over the top half, so steps are read lower down.
      { rootMargin: window.matchMedia('(min-width: 1024px)').matches ? '-45% 0px -45% 0px' : '-74% 0px -24% 0px' },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // Each new stage refits the whole tree, since the crown widens as it grows.
  useEffect(() => setFit((n) => n + 1), [stage]);

  const people = useMemo(() => stages[stage]!, [stage]);
  const pending = people.filter((p) => p.status === 'proposed').length;

  return (
    <div className="grid gap-x-16 lg:grid-cols-12">
      <div className="sticky top-16 z-10 -mx-4 bg-card/95 px-4 pb-3 backdrop-blur-sm md:top-20 lg:col-span-7 lg:mx-0 lg:h-[calc(100svh-7rem)] lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none">
        <figure className="relative h-[46svh] overflow-hidden rounded-[1.75rem] border border-gold-light/50 bg-ivory shadow-[0_40px_80px_-40px_rgb(22_56_47/0.35)] lg:h-full">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
            <LivingTree
              people={people}
              unions={demoUnions}
              rootId={ROOT}
              ancestors={demoAncestors}
              title="شجرة أسرة السهلي"
              fitSignal={fit}
            />
          </div>
          <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-full border border-gold-light/40 bg-card/90 py-1.5 ps-2 pe-4 text-caption shadow-float backdrop-blur-md">
            <span className="flex items-center gap-2 font-semibold text-forest">
              <span className="flex size-6 items-center justify-center rounded-full bg-forest text-[0.7rem] text-gold-light">
                {stage + 1}
              </span>
              {captions[stage]}
            </span>
            <span className={cn('tabular-nums', pending ? 'text-pending' : 'text-muted')}>
              {pending ? `${pending} بانتظار الاعتماد` : people.length > 10 ? `${people.length} فردًا` : `${people.length} أفراد`}
            </span>
          </figcaption>
        </figure>
      </div>

      <ol className="relative grid pb-[12svh] lg:col-span-5 lg:pb-[18svh]">
        <span aria-hidden="true" className="absolute top-0 bottom-0 start-[1.1875rem] w-px bg-line/60 max-lg:hidden" />
        {steps.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="relative flex min-h-[46svh] items-center py-8 lg:min-h-[78svh] lg:py-10 lg:ps-16"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute start-0 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border text-body font-bold transition duration-500 lg:flex',
                i <= stage
                  ? 'border-forest bg-forest text-gold-light shadow-[0_0_0_6px_rgb(223_201_161/0.35)]'
                  : 'border-line bg-card text-muted',
              )}
            >
              {i + 1}
            </span>
            <div
              className={cn(
                'grid gap-4 transition duration-700 ease-(--ease-cinematic)',
                i === stage ? 'opacity-100' : 'opacity-35 lg:translate-x-2',
              )}
            >
              <p className="flex items-center gap-2 text-caption font-semibold text-olive">
                <span className="rounded-full bg-forest px-2 py-0.5 text-gold-light lg:hidden">الخطوة {i + 1}</span>
                {s.who}
              </p>
              <h3 className="text-h1-m font-bold text-forest md:text-h1">{s.title}</h3>
              <p className="max-w-md text-body-lg leading-[1.9] text-ink-soft">{s.body}</p>
              <ul className="mt-2 grid gap-2.5 border-t border-line/40 pt-5">
                {s.detail.map(([icon, text]) => (
                  <li key={text} className="flex items-center gap-3 text-body text-ink">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-olive-soft/60 text-on-olive-soft">
                      <Icon name={icon} className="text-[1.1rem]" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
