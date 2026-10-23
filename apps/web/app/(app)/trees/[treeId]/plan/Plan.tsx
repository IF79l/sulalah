'use client';

import { defaultPlanLimits, type PlanId } from '@sulalah/domain';
import { Button, Chip, Icon, cn } from '@sulalah/ui';
import { useState } from 'react';
import { AppShell, Panel } from '@/components/AppShell';
import { PlanArt } from '@/components/home/PlanArt';
import { lineage, num, planName, update, useDemo } from '@/lib/demo-store';

const order: PlanId[] = ['family', 'extended', 'tribe'];

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-body font-semibold text-ink">{label}</span>
        <span className="text-title font-bold tabular-nums text-forest">
          {num(used)} <span className="text-body font-normal text-muted">من {num(limit)}</span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-high">
        <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-danger' : pct >= 90 ? 'bg-pending' : 'bg-olive')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** S22: the plan, how much of it is used, and asking for more. Payment comes later. */
export function Plan() {
  const s = useDemo();
  // Preview the limit banners against the smallest plan.
  const [preview, setPreview] = useState<'real' | 'near' | 'full'>('real');
  const used = preview === 'near' ? 46 : preview === 'full' ? 50 : lineage(s.people).length;
  const plan = preview === 'real' ? s.plan : 'family';
  const l = defaultPlanLimits[plan];
  const pct = used / l.maxPersons;

  return (
    <AppShell title="الباقة" subtitle="المالك وحده يشترك، والأقارب يدخلون مجانًا.">
      <div className="grid gap-6">
        {pct >= 1 ? (
          <p className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-body text-danger">
            <Icon name="block" className="mt-0.5" />
            وصلت شجرتك إلى {num(l.maxPersons)} فردًا. الإضافات الجديدة متوقفة حتى الترقية، والشجرة نفسها محفوظة.
          </p>
        ) : pct >= 0.9 ? (
          <p className="flex items-start gap-2 rounded-2xl border border-pending/40 bg-pending-soft p-4 text-body text-pending">
            <Icon name="warning" className="mt-0.5" />
            اقتربت شجرتك من الحد: باقي {num(l.maxPersons - used)} أفراد.
          </p>
        ) : null}

        <Panel>
          <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] md:items-center md:p-6">
            <div className="grid gap-1">
              <span className="text-caption text-muted">باقتك الحالية</span>
              <span className="text-h2 font-bold text-forest">{planName[plan]}</span>
            </div>
            <div className="grid gap-5 md:border-s md:border-line/40 md:ps-6">
              <Meter label="الأفراد" used={used} limit={l.maxPersons} />
              <Meter label="المدققون المساعدون" used={s.reviewers.length} limit={l.maxReviewers} />
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          {order.map((id) => {
            const lim = defaultPlanLimits[id];
            const current = id === plan;
            const higher = order.indexOf(id) > order.indexOf(plan);
            const asked = s.upgradeRequested === id;
            return (
              <article key={id} className={cn('flex flex-col gap-4 rounded-2xl border p-5', current ? 'border-forest bg-olive-soft/25 ring-2 ring-forest/10' : 'border-line/40 bg-card')}>
                <div className="flex items-center justify-between">
                  <h3 className="text-title font-bold text-forest">{planName[id]}</h3>
                  {current ? <Chip tone="forest">باقتك</Chip> : null}
                </div>
                <div className="flex justify-center" data-in="">
                  <PlanArt plan={id} />
                </div>
                <p className="text-body text-ink-soft">
                  حتى <strong className="text-forest">{num(lim.maxPersons)}</strong> فردًا، و{num(lim.maxReviewers)} {lim.maxReviewers === 1 ? 'مدقق مساعد' : 'مدققين مساعدين'}
                </p>
                <p className="text-caption text-muted">السعر يُعلن عند الإطلاق</p>
                {higher ? (
                  asked ? (
                    <p className="mt-auto flex items-center gap-2 rounded-xl bg-success-soft p-3 text-caption text-success">
                      <Icon name="mark_email_read" />
                      وصلنا طلبك، نتواصل معك خلال يوم.
                    </p>
                  ) : (
                    <Button className="mt-auto rounded-xl" onClick={() => update((st) => ({ ...st, upgradeRequested: id }))}>
                      اطلب الترقية
                    </Button>
                  )
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line/70 p-4 text-caption text-muted">
          <span>معاينة التنبيهات:</span>
          {(
            [
              ['real', 'الحالي'],
              ['near', 'قريب من الحد'],
              ['full', 'وصل الحد'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setPreview(v)} className={cn('rounded-full border px-3 py-1', preview === v ? 'border-forest bg-forest text-ivory' : 'border-line/60')}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
