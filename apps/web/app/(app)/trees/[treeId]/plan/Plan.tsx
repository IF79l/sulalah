'use client';

import {
  inForce,
  onSale,
  planIds,
  planRank,
  priceOf,
  quote,
  type BillingCycle,
  type PlanId,
} from '@sulalah/domain';
import { Button, Chip, Icon, Segmented, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppShell, Panel, Toast } from '@/components/AppShell';
import { PlanArt } from '@/components/home/PlanArt';
import { BillingError, billing, useBilling } from '@/lib/billing/client';
import { demoDeclineRenewal, resetDemoBilling } from '@/lib/billing/demo';
import {
  annualSaving,
  brandName,
  cycleName,
  day,
  perCycle,
  riyals,
  statusName,
} from '@/lib/billing/format';
import type { BillingView, ChangeAction } from '@/lib/billing/types';
import { num, planName, useDemo } from '@/lib/demo-store';

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
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 100 ? 'bg-danger' : pct >= 90 ? 'bg-pending' : 'bg-olive',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Notice({
  tone,
  icon,
  children,
  action,
}: {
  tone: 'danger' | 'pending' | 'olive';
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-body',
        tone === 'danger' && 'border-danger/30 bg-danger-soft text-danger',
        tone === 'pending' && 'border-pending/40 bg-pending-soft text-pending',
        tone === 'olive' && 'border-olive/25 bg-olive-soft/30 text-on-olive-soft',
      )}
    >
      <p className="flex min-w-0 flex-1 items-start gap-2">
        <Icon name={icon} className="mt-0.5 shrink-0" />
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}

/** S22: the plan, what it costs, how much of it is used, and changing it. */
export function Plan() {
  const s = useDemo();
  const { treeId } = useParams<{ treeId: string }>();
  const router = useRouter();
  const { view, error, setView, reload } = useBilling(treeId);
  const [cycle, setCycle] = useState<BillingCycle | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Preview the limit banners against the smallest plan (sample tree only).
  const [preview, setPreview] = useState<'real' | 'near' | 'full'>('real');

  const sub = view?.subscription ?? null;
  const live = inForce(
    sub && {
      ...sub,
      periodStart: sub.periodStart ? new Date(sub.periodStart) : null,
      periodEnd: sub.periodEnd ? new Date(sub.periodEnd) : null,
    },
  );
  const shownCycle = cycle ?? sub?.cycle ?? 'monthly';
  const plan = preview === 'real' ? (view?.plan ?? s.plan) : 'family';
  const offer = view?.offers.find((o) => o.id === plan);
  const limits = offer?.limits ?? { maxPersons: 50, maxReviewers: 1 };
  const used =
    preview === 'near'
      ? Math.ceil(limits.maxPersons * 0.92)
      : preview === 'full'
        ? limits.maxPersons
        : s.people.filter((p) => p.status === 'approved').length;
  const pct = used / limits.maxPersons;
  const selling = !!view && onSale(view.offers);

  const change = async (a: ChangeAction, done: string) => {
    setBusy(a.action);
    try {
      setView(await billing.change(treeId, a));
      setToast(done);
    } catch (e) {
      setToast(e instanceof BillingError ? e.message : 'صار خطأ، حاول مرة ثانية');
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  const buy = (id: PlanId) =>
    router.push(`/trees/${treeId}/plan/checkout?plan=${id}&cycle=${shownCycle}`);

  return (
    <AppShell
      need="billing.manage"
      title="الباقة"
      subtitle="المالك وحده يشترك، والأقارب يدخلون مجانًا."
    >
      <div className="grid gap-6">
        {error ? (
          <Notice tone="danger" icon="cloud_off">
            {error}
          </Notice>
        ) : null}

        {sub?.status === 'past_due' ? (
          <Notice
            tone="danger"
            icon="credit_card_off"
            action={
              <Button size="sm" className="rounded-xl" onClick={() => buy(sub.plan)}>
                ادفع ببطاقة ثانية
              </Button>
            }
          >
            ما قدرنا نجدد الاشتراك من بطاقتك. نحاول مرة ثانية يوم {day(sub.nextRetryAt)}، والشجرة
            على باقتها حتى ذلك الوقت.
          </Notice>
        ) : sub && (sub.status === 'expired' || sub.status === 'canceled') ? (
          <Notice tone="pending" icon="pause_circle">
            انتهت باقة {planName[sub.plan]} يوم {day(sub.periodEnd)}. الشجرة محفوظة وتنعرض كاملة
            لأهلها، والإضافات الجديدة متوقفة حتى تشترك.
          </Notice>
        ) : sub?.cancelAtPeriodEnd ? (
          <Notice
            tone="pending"
            icon="event_busy"
            action={
              <Button
                size="sm"
                variant="quiet"
                className="rounded-xl"
                disabled={!!busy}
                onClick={() => change({ action: 'resume' }, 'رجع التجديد التلقائي')}
              >
                استمر في الاشتراك
              </Button>
            }
          >
            ألغيت التجديد. تبقى باقة {planName[sub.plan]} حتى {day(sub.periodEnd)}، وبعدها تتوقف
            الإضافات الجديدة.
          </Notice>
        ) : sub?.scheduledPlan ? (
          <Notice
            tone="olive"
            icon="schedule"
            action={
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                disabled={!!busy}
                onClick={() => change({ action: 'unschedule' }, 'تبقى على باقتك الحالية')}
              >
                تراجع
              </Button>
            }
          >
            تنتقل إلى باقة {planName[sub.scheduledPlan]} ({cycleName[sub.scheduledCycle!]}) عند
            التجديد يوم {day(sub.periodEnd)}. إلى ذلك الوقت تبقى باقتك كما هي.
          </Notice>
        ) : null}

        {pct >= 1 ? (
          <Notice tone="danger" icon="block">
            وصلت شجرتك إلى {num(limits.maxPersons)} فردًا. الإضافات الجديدة متوقفة حتى الترقية،
            والشجرة نفسها محفوظة.
          </Notice>
        ) : pct >= 0.9 ? (
          <Notice tone="pending" icon="warning">
            اقتربت شجرتك من الحد: باقي {num(limits.maxPersons - used)} أفراد.
          </Notice>
        ) : null}

        <Panel>
          <div className="grid gap-6 p-5 md:grid-cols-[minmax(14rem,auto)_1fr] md:items-center md:p-6">
            <div className="grid content-start gap-3">
              <div className="grid gap-1">
                <span className="text-caption text-muted">باقتك الحالية</span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-h2 font-bold text-forest">{planName[plan]}</span>
                  {sub ? (
                    <Chip
                      tone={
                        sub.status === 'active'
                          ? 'success'
                          : sub.status === 'past_due'
                            ? 'pending'
                            : 'neutral'
                      }
                    >
                      {sub.provider === 'manual' ? 'مفعّلة يدويًا' : statusName[sub.status]}
                    </Chip>
                  ) : null}
                </span>
              </div>
              {sub && sub.provider !== 'manual' ? (
                <dl className="grid gap-1.5 text-body text-ink-soft">
                  <div className="flex gap-2">
                    <dt className="text-muted">الاشتراك</dt>
                    <dd>
                      {cycleName[sub.cycle]}، {riyals(sub.periodValue)}
                    </dd>
                  </div>
                  {live ? (
                    <div className="flex gap-2">
                      <dt className="text-muted">
                        {sub.cancelAtPeriodEnd ? 'ينتهي' : 'التجديد القادم'}
                      </dt>
                      <dd>{day(sub.periodEnd)}</dd>
                    </div>
                  ) : null}
                  {view?.card ? (
                    <div className="flex items-center gap-2">
                      <dt className="text-muted">البطاقة</dt>
                      <dd className="flex items-center gap-1.5">
                        <Icon name="credit_card" className="text-[1.1rem] text-olive" />
                        {brandName(view.card.brand)}{' '}
                        <bdi dir="ltr" className="tabular-nums">
                          •••• {view.card.last4}
                        </bdi>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            <div className="grid gap-5 md:border-s md:border-line/40 md:ps-6">
              <Meter label="الأفراد" used={used} limit={limits.maxPersons} />
              <Meter
                label="المدققون المساعدون"
                used={s.reviewers.length}
                limit={limits.maxReviewers}
              />
            </div>
          </div>
        </Panel>

        {view ? (
          <section aria-labelledby="plans-h" className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="plans-h" className="text-title font-bold text-forest">
                {selling ? 'غيّر باقتك' : 'الباقات'}
              </h2>
              {selling ? (
                <div className="w-full sm:w-72">
                  <Segmented
                    label="مدة الاشتراك"
                    value={shownCycle}
                    onChange={setCycle}
                    options={[
                      { value: 'monthly', label: 'شهري' },
                      { value: 'annual', label: 'سنوي' },
                    ]}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {planIds.map((id) => (
                <PlanCard
                  key={id}
                  id={id}
                  view={view}
                  cycle={shownCycle}
                  current={id === plan && (!sub || sub.provider === 'manual' || live)}
                  busy={!!busy}
                  onBuy={() => buy(id)}
                  onSchedule={() =>
                    change(
                      { action: 'schedule', plan: id, cycle: shownCycle },
                      `تنتقل إلى ${planName[id]} عند التجديد`,
                    )
                  }
                />
              ))}
            </div>
            {view.mode !== 'moyasar' && selling ? (
              <p className="flex items-center gap-2 text-caption text-muted">
                <Icon name="science" className="text-[1.1rem]" />
                أسعار تجريبية لتجربة الدفع فقط. الأسعار الفعلية تُعلن عند الإطلاق، ولا يُخصم أي مبلغ
                هنا.
              </p>
            ) : null}
          </section>
        ) : null}

        {view?.invoices.length ? <Invoices view={view} treeId={treeId} /> : null}

        {live && sub && sub.provider !== 'manual' && !sub.cancelAtPeriodEnd ? (
          <div className="rounded-2xl border border-line/40 bg-card p-5">
            {confirmCancel ? (
              <div className="grid gap-3">
                <p className="text-body text-ink">
                  يتوقف التجديد، وتبقى باقة {planName[sub.plan]} حتى {day(sub.periodEnd)}. بعدها
                  تبقى الشجرة محفوظة وتنعرض، وتتوقف الإضافات الجديدة حتى تشترك من جديد.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    className="rounded-xl"
                    disabled={!!busy}
                    onClick={() => change({ action: 'cancel' }, 'ألغينا التجديد')}
                  >
                    ألغِ التجديد
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setConfirmCancel(false)}
                  >
                    لا، أبقِه
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-body text-ink-soft">
                  يتجدد اشتراكك تلقائيًا من بطاقتك. تقدر توقفه متى ما شئت.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-danger"
                  onClick={() => setConfirmCancel(true)}
                >
                  إلغاء التجديد
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {view?.mode === 'demo' ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line/70 p-4 text-caption text-muted">
            <span>معاينة:</span>
            {(
              [
                ['real', 'الحالي'],
                ['near', 'قريب من الحد'],
                ['full', 'وصل الحد'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPreview(v)}
                className={cn(
                  'rounded-full border px-3 py-1',
                  preview === v ? 'border-forest bg-forest text-ivory' : 'border-line/60',
                )}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full border border-line/60 px-3 py-1"
              onClick={() => {
                demoDeclineRenewal();
                reload();
              }}
            >
              تجديد مرفوض
            </button>
            <button
              type="button"
              className="rounded-full border border-line/60 px-3 py-1"
              onClick={() => {
                resetDemoBilling();
                reload();
              }}
            >
              ابدأ من جديد
            </button>
          </div>
        ) : null}
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}

function PlanCard({
  id,
  view,
  cycle,
  current,
  busy,
  onBuy,
  onSchedule,
}: {
  id: PlanId;
  view: BillingView;
  cycle: BillingCycle;
  current: boolean;
  busy: boolean;
  onBuy: () => void;
  onSchedule: () => void;
}) {
  const offer = view.offers.find((o) => o.id === id)!;
  const price = priceOf(offer, cycle);
  const sub = view.subscription;
  const paid = sub && sub.provider !== 'manual';
  const q = quote(
    sub && {
      ...sub,
      periodStart: sub.periodStart ? new Date(sub.periodStart) : null,
      periodEnd: sub.periodEnd ? new Date(sub.periodEnd) : null,
    },
    { plan: id, cycle },
    offer,
    new Date(),
  );
  const onIt = current && (!paid || sub.cycle === cycle);
  const scheduled = sub?.scheduledPlan === id && sub.scheduledCycle === cycle;
  const saving = cycle === 'annual' ? annualSaving(offer) : 0;
  const bigger = planRank[id] > planRank[view.plan];

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-2xl border p-5',
        current ? 'border-forest bg-olive-soft/25 ring-2 ring-forest/10' : 'border-line/40 bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-title font-bold text-forest">{planName[id]}</h3>
        {current ? <Chip tone="forest">باقتك</Chip> : null}
      </div>
      <div className="flex justify-center" data-in="">
        <PlanArt plan={id} />
      </div>
      <p className="text-body text-ink-soft">
        حتى <strong className="text-forest">{num(offer.limits.maxPersons)}</strong> فردًا، و
        {num(offer.limits.maxReviewers)}{' '}
        {offer.limits.maxReviewers === 1 ? 'مدقق مساعد' : 'مدققين مساعدين'}
      </p>
      {price === null ? (
        <p className="text-caption text-muted">السعر يُعلن عند الإطلاق</p>
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-h2 font-bold tabular-nums text-forest">{riyals(price)}</span>
          <span className="text-body text-muted">{perCycle[cycle]}</span>
          {saving > 0 ? (
            <Chip tone="olive" className="ms-auto">
              {saving === 2 ? 'شهران مجانًا' : `${num(saving)} أشهر مجانًا`}
            </Chip>
          ) : null}
        </p>
      )}

      <div className="mt-auto grid gap-2">
        {price === null || !q ? null : onIt ? null : scheduled ? (
          <p className="flex items-center gap-2 rounded-xl bg-olive-soft/40 p-3 text-caption text-on-olive-soft">
            <Icon name="schedule" />
            تنتقل لها عند التجديد
          </p>
        ) : q.kind === 'downgrade' ? (
          <>
            <Button variant="secondary" className="rounded-xl" disabled={busy} onClick={onSchedule}>
              انتقل لها عند التجديد
            </Button>
            <p className="text-caption text-muted">
              بدون دفع الآن. باقتك الحالية تبقى حتى نهايتها.
            </p>
          </>
        ) : (
          <>
            <Button className="rounded-xl" disabled={busy} onClick={onBuy}>
              {q.kind === 'upgrade' || (bigger && !paid)
                ? 'رقِّ الآن'
                : sub && !inForceView(sub)
                  ? 'جدد الاشتراك'
                  : 'اشترك'}
            </Button>
            {q.credit > 0 ? (
              <p className="text-caption text-muted">
                تدفع اليوم {riyals(q.charge)} بعد خصم {riyals(q.credit)} عن الأيام الباقية من باقتك.
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

const inForceView = (s: NonNullable<BillingView['subscription']>) =>
  s.status === 'active' || s.status === 'past_due';

function Invoices({ view, treeId }: { view: BillingView; treeId: string }) {
  return (
    <section aria-labelledby="inv-h" className="grid gap-3">
      <h2 id="inv-h" className="text-title font-bold text-forest">
        الفواتير
      </h2>
      <ul className="divide-y divide-line/30 overflow-hidden rounded-2xl border border-line/40 bg-card">
        {view.invoices.map((i) => (
          <li key={i.id}>
            <Link
              href={`/trees/${treeId}/plan/invoices/${i.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-low"
            >
              <span className="grid gap-0.5">
                <span className="text-body font-semibold text-ink">
                  {i.plan ? `باقة ${planName[i.plan]}` : 'سُلالة'}
                  {i.cycle ? `، ${cycleName[i.cycle]}` : ''}
                </span>
                <span className="text-caption text-muted">
                  <bdi dir="ltr" className="font-mono">
                    {i.number}
                  </bdi>{' '}
                  · {day(i.issuedAt)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-body font-bold tabular-nums text-forest">
                  {riyals(i.total)}
                </span>
                <span className={cn(buttonClass('ghost', 'sm'), 'rounded-xl')}>
                  <Icon name="receipt_long" />
                  الفاتورة
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
