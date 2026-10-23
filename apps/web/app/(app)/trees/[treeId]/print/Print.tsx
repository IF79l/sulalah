'use client';

import { LivingTree } from '@sulalah/tree-svg';
import { Button, Icon, Segmented, cn } from '@sulalah/ui';
import { useMemo, useState } from 'react';
import { AppShell, Panel } from '@/components/AppShell';
import { generations, lineage, num, useDemo } from '@/lib/demo-store';

/** Paper sizes the poster prints on, with their width-to-height ratio (ISO A series). */
const papers = { A4: 'A4', A3: 'A3', A2: 'A2' } as const;
type Paper = keyof typeof papers;

/**
 * The tree as a framed poster to print or save as PDF: the same picture as on screen, on
 * ivory paper with a gold frame, the family's line under the crown and the date it was printed.
 */
export function Print() {
  const s = useDemo();
  const [paper, setPaper] = useState<Paper>('A3');
  const [daughters, setDaughters] = useState(true);
  const [deceased, setDeceased] = useState(true);
  const [line, setLine] = useState('');

  const root = s.people.find((p) => p.id === s.tree.rootId);
  const people = useMemo(() => {
    const parents = new Set(s.people.map((p) => p.fatherId));
    return s.people
      .filter((p) => p.status === 'approved')
      .filter((p) => deceased || !p.deceased || parents.has(p.id))
      .map((p) => (p.gender === 'female' && !daughters ? { ...p, name: 'ابنة' } : p));
  }, [s.people, daughters, deceased]);
  const count = lineage(people, s.tree.rootId).length;
  const caption = line.trim() || `من الجد ${root?.name ?? ''} إلى أحفاد أحفاده`;
  const printed = new Date().toLocaleDateString('ar-SA-u-nu-latn', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <AppShell
      need="member"
      wide
      title="اطبع الشجرة"
      subtitle="لوحة بحجم الجدار للمجلس، أو ملف PDF ترسله للعائلة. تُطبع الأسماء المعتمدة فقط."
      actions={
        <Button onClick={() => window.print()}>
          <Icon name="print" />
          اطبع أو احفظ PDF
        </Button>
      }
    >
      <style>{`@page { size: ${paper} portrait; margin: 0; }`}</style>
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start print:block">
        <Panel title="اللوحة" icon="tune" className="lg:sticky lg:top-24 print:hidden">
          <div className="grid gap-5 p-5">
            <div className="grid gap-1.5">
              <span className="text-body font-medium text-ink">حجم الورق</span>
              <Segmented
                label="حجم الورق"
                value={paper}
                onChange={setPaper}
                options={[
                  { value: 'A4', label: 'A4' },
                  { value: 'A3', label: 'A3' },
                  { value: 'A2', label: 'A2' },
                ]}
              />
              <span className="text-caption text-muted">
                {paper === 'A2'
                  ? 'للجدار، 42 × 59 سم'
                  : paper === 'A3'
                    ? 'للبرواز، 30 × 42 سم'
                    : 'للملف، 21 × 30 سم'}
              </span>
            </div>
            <label className="grid gap-1.5">
              <span className="text-body font-medium text-ink">السطر تحت الشجرة</span>
              <input
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder={`من الجد ${root?.name ?? ''} إلى أحفاد أحفاده`}
                className="h-11 rounded-xl border border-line/70 bg-card px-3 text-body outline-none focus:border-forest"
              />
            </label>
            <Check
              label="أسماء البنات"
              hint={'إذا أطفأته تُطبع ورقة باسم "ابنة".'}
              on={daughters}
              onChange={setDaughters}
            />
            <Check
              label="المتوفون"
              hint="يُطبعون بلون ذابل."
              on={deceased}
              onChange={setDeceased}
            />
            <p className="rounded-xl bg-surface-low p-3 text-caption leading-relaxed text-ink-soft">
              في نافذة الطباعة اختر "حفظ كـ PDF" لتنزيل الملف، واختر الحجم نفسه وبدون هوامش.
            </p>
          </div>
        </Panel>

        <div className="grid justify-items-center rounded-3xl bg-surface p-4 md:p-8 print:block print:rounded-none print:bg-transparent print:p-0">
          <figure
            className={cn(
              'relative flex w-full flex-col overflow-hidden bg-ivory shadow-float print:h-screen print:max-w-none! print:shadow-none',
              paper === 'A2' ? 'max-w-[44rem]' : paper === 'A3' ? 'max-w-[38rem]' : 'max-w-[32rem]',
            )}
            style={{ aspectRatio: '1 / 1.4142' }}
          >
            <span aria-hidden="true" className="star-ground absolute inset-0 opacity-70" />
            <span
              aria-hidden="true"
              className="absolute inset-[2.2%] rounded-sm border-2 border-gold/70"
            />
            <span
              aria-hidden="true"
              className="absolute inset-[3.1%] rounded-sm border border-gold/40"
            />
            <div className="relative min-h-0 flex-1 px-[5%] pt-[5%]">
              <div className="relative size-full">
                <LivingTree
                  key={`${paper}-${daughters}-${deceased}`}
                  people={people}
                  unions={s.tree.unions}
                  rootId={s.tree.rootId}
                  ancestors={s.tree.ancestors}
                  title={s.tree.title}
                  className="pointer-events-none size-full"
                />
              </div>
            </div>
            <figcaption className="relative grid justify-items-center gap-1 px-[8%] pt-2 pb-[6%] text-center">
              <span className="font-title text-[clamp(1rem,2.4vw,1.5rem)] text-forest">
                {caption}
              </span>
              <span className="text-[clamp(0.55rem,1.1vw,0.75rem)] text-muted">
                {num(count)} فردًا في {num(generations(people, s.tree.rootId))} أجيال · {printed}
              </span>
              <span className="text-[clamp(0.5rem,1vw,0.68rem)] text-muted/80">
                اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </AppShell>
  );
}

function Check({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="grid gap-0.5">
        <span className="text-body font-medium text-ink">{label}</span>
        <span className="text-caption text-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 accent-[var(--color-forest)]"
      />
    </label>
  );
}
