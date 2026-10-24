'use client';

import { planIds, testPlanPrices, validVatNumber, type PlanId } from '@sulalah/domain';
import { Button, Chip, Field, Icon, Logo, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Panel, Tabs, Toast } from '@/components/AppShell';
import {
  demoInvoices,
  demoPayments,
  demoSeller,
  demoSetPrices,
  demoSetSeller,
  demoView,
} from '@/lib/billing/demo';
import { cycleName, day, riyals, statusName } from '@/lib/billing/format';
import type { AdminAction, AdminBilling } from '@/lib/billing/types';
import { TREE_ID, myName, newId, num, planName, update, useDemo } from '@/lib/demo-store';

/**
 * The platform owner's desk: plan requests, subscriptions, payments, invoices, prices and the
 * seller printed on invoices, and what login codes cost. It holds only what the database
 * holds. A tree here is its id, owner and plan, never its names, which stay encrypted with
 * the family.
 */

type Tab = 'requests' | 'subscriptions' | 'payments' | 'invoices' | 'prices' | 'codes' | 'users';

// The sample platform's other families, so the desk has something to show without accounts.
const others: AdminBilling['subscriptions'] = [
  {
    treeId: 'al-abdulaziz',
    owner: 'سلطان بن عبدالعزيز',
    plan: 'tribe',
    cycle: 'annual',
    status: 'active',
    provider: 'sandbox',
    periodEnd: '2027-06-02T09:00:00Z',
    cancelAtPeriodEnd: false,
    scheduledPlan: null,
  },
  {
    treeId: 'al-otaibi-23',
    owner: 'نايف بن مطلق',
    plan: 'extended',
    cycle: 'monthly',
    status: 'past_due',
    provider: 'sandbox',
    periodEnd: '2026-10-22T09:00:00Z',
    cancelAtPeriodEnd: false,
    scheduledPlan: null,
  },
  {
    treeId: 'bani-khalid',
    owner: 'تركي بن خالد',
    plan: 'family',
    cycle: 'monthly',
    status: 'active',
    provider: 'manual',
    periodEnd: null,
    cancelAtPeriodEnd: false,
    scheduledPlan: null,
  },
];

const users = [
  { name: 'فيصل بن خالد', phone: '55 •••• 567', trees: 1, joined: 'أكتوبر 2026', role: 'مالك' },
  { name: 'سالم بن متروك', phone: '50 •••• 214', trees: 1, joined: 'أكتوبر 2026', role: 'مدقق' },
  { name: 'تركي بن خالد', phone: '53 •••• 880', trees: 2, joined: 'سبتمبر 2026', role: 'مالك' },
  {
    name: 'سلطان بن عبدالعزيز',
    phone: '56 •••• 031',
    trees: 1,
    joined: 'سبتمبر 2026',
    role: 'مالك',
  },
  { name: 'ماجد بن سالم', phone: '54 •••• 772', trees: 1, joined: 'أكتوبر 2026', role: 'مساهم' },
];

function demoAdmin(s: ReturnType<typeof useDemo>): AdminBilling {
  const v = demoView();
  const seller = demoSeller();
  return {
    offers: v.offers,
    seller: { ...seller, vatRateBp: 1500 },
    subscriptions: [
      ...(v.subscription ? [{ treeId: TREE_ID, owner: myName(s), ...v.subscription }] : []),
      ...others,
    ],
    invoices: demoInvoices().map((i) => ({ ...i, treeId: TREE_ID })),
    payments: [
      ...demoPayments(),
      {
        id: 'sbx-0003',
        treeId: 'al-otaibi-23',
        kind: 'renewal',
        plan: 'extended',
        amount: testPlanPrices.extended.monthly,
        status: 'failed',
        failureReason: 'رصيد البطاقة غير كاف',
        provider: 'sandbox',
        createdAt: '2026-10-22T03:00:00Z',
      },
      {
        id: 'sbx-0002',
        treeId: 'al-abdulaziz',
        kind: 'new',
        plan: 'tribe',
        amount: testPlanPrices.tribe.annual,
        status: 'paid',
        failureReason: null,
        provider: 'sandbox',
        createdAt: '2026-06-02T09:00:00Z',
      },
    ],
    requests: s.upgradeRequested
      ? [{ treeId: TREE_ID, owner: myName(s), from: s.plan, to: s.upgradeRequested }]
      : [],
    codes: [
      { channel: 'whatsapp', sent: 184, failed: 9 },
      { channel: 'sms', sent: 23, failed: 0 },
      { channel: 'mock', sent: 0, failed: 0 },
    ],
  };
}

const statusTone = (s: string) =>
  s === 'active' || s === 'paid'
    ? 'success'
    : s === 'past_due' || s === 'open'
      ? 'pending'
      : s === 'failed'
        ? 'danger'
        : 'neutral';

export function Admin({ live }: { live: boolean }) {
  const s = useDemo();
  const [tab, setTab] = useState<Tab>('subscriptions');
  const [toast, setToast] = useState<string | null>(null);
  const [data, setData] = useState<AdminBilling | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!live) return setData(demoAdmin(s));
    fetch('/api/admin/billing', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setError('ما قدرنا نجيب بيانات الفوترة'));
  }, [live, s]);
  useEffect(load, [load]);

  const act = async (a: AdminAction, done: string) => {
    if (live) {
      const r = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(a),
      });
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { error?: { message: string } };
        return setToast(b.error?.message ?? 'ما انحفظ التغيير');
      }
    } else if (a.action === 'prices')
      demoSetPrices(a.plan, { monthly: a.monthly, annual: a.annual });
    else if (a.action === 'seller')
      demoSetSeller({
        name: a.name,
        vatNumber: a.vatNumber,
        crNumber: a.crNumber,
        address: a.address,
      });
    else
      update((st) => ({
        ...st,
        plan: a.plan,
        upgradeRequested: undefined,
        notices: [
          {
            id: newId('n'),
            icon: 'workspace_premium',
            text: `تفعّلت باقة ${planName[a.plan]} لشجرتك`,
            at: 'الآن',
            unread: true,
            href: `/trees/${TREE_ID}/plan`,
          },
          ...st.notices,
        ],
      }));
    setToast(done);
    load();
  };

  const subs = data?.subscriptions ?? [];
  const month = new Date().toISOString().slice(0, 7);
  const monthly = subs
    .filter((x) => x.status === 'active' && x.provider !== 'manual')
    .reduce((sum, x) => {
      const p = data!.offers.find((o) => o.id === x.plan)?.prices;
      const price = x.cycle === 'annual' ? (p?.annual ?? 0) / 12 : (p?.monthly ?? 0);
      return sum + price;
    }, 0);
  const stats = [
    {
      label: 'اشتراكات فعّالة',
      value: num(subs.filter((x) => x.status === 'active').length),
      icon: 'workspace_premium',
    },
    { label: 'الدخل الشهري المتكرر', value: riyals(Math.round(monthly)), icon: 'trending_up' },
    {
      label: 'فواتير هذا الشهر',
      value: riyals(
        (data?.invoices ?? [])
          .filter((i) => i.issuedAt.startsWith(month))
          .reduce((a, i) => a + i.total, 0),
      ),
      icon: 'receipt_long',
    },
    {
      label: 'تجديدات متعثرة',
      value: num(subs.filter((x) => x.status === 'past_due').length),
      icon: 'credit_card_off',
      warn: subs.some((x) => x.status === 'past_due'),
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="relative overflow-hidden bg-forest-deep text-ivory">
        <span
          aria-hidden="true"
          className="star-ground absolute inset-0 opacity-25 mix-blend-soft-light"
        />
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-[max(16px,env(safe-area-inset-right,0px))] md:px-8">
          <span className="flex items-center gap-3">
            <Logo onDark />
            <span className="rounded-full border border-gold-light/40 px-2.5 py-0.5 text-caption font-semibold text-gold-light">
              إدارة المنصة
            </span>
          </span>
          <Link href="/trees" className="text-caption font-semibold text-ivory/80 hover:text-ivory">
            رجوع للتطبيق
          </Link>
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-6 px-[max(16px,env(safe-area-inset-right,0px))] pt-6 pb-8 md:px-8">
          <h1 className="page-in text-h1-m font-bold md:text-h1">
            أهلًا {s.me.first}، هذي المنصة اليوم
          </h1>
          <dl
            className="page-in grid grid-cols-2 gap-3 md:grid-cols-4"
            style={{ ['--d' as string]: 1 }}
          >
            {stats.map((x) => (
              <div key={x.label} className="rounded-2xl border border-gold-light/20 bg-ivory/5 p-4">
                <dt className="flex items-center gap-1.5 text-caption text-on-forest-soft">
                  <Icon name={x.icon} className="text-[1rem]" />
                  {x.label}
                </dt>
                <dd
                  className={cn(
                    'mt-1 text-[1.75rem]/none font-bold tabular-nums',
                    x.warn ? 'text-gold-light' : 'text-ivory',
                  )}
                >
                  {x.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <main
        className="page-in mx-auto w-full max-w-6xl flex-1 px-[max(16px,env(safe-area-inset-right,0px))] py-8 md:px-8"
        style={{ ['--d' as string]: 2 }}
      >
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-line/40 bg-card px-4 py-3 text-caption leading-relaxed text-ink-soft">
          <Icon name="encrypted" className="mt-0.5 text-[1.1rem] text-olive" />
          هذي اللوحة تعرض اللي في قاعدة البيانات فقط. أسماء الأشجار ومن فيها في ملفات مشفّرة، فما
          تظهر هنا، وما تنفتح إلا بطلب من مالك الشجرة لاسترجاعها. البطاقات يحفظها مزود الدفع، ونحن
          نرى آخر أربعة أرقام فقط.
        </p>
        {error ? <p className="mb-5 text-body text-danger">{error}</p> : null}
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'subscriptions', label: 'الاشتراكات', count: subs.length },
            { value: 'payments', label: 'المدفوعات', count: data?.payments.length ?? 0 },
            { value: 'invoices', label: 'الفواتير', count: data?.invoices.length ?? 0 },
            { value: 'requests', label: 'طلبات التفعيل', count: data?.requests.length ?? 0 },
            { value: 'prices', label: 'الأسعار والبائع' },
            { value: 'codes', label: 'رموز الدخول' },
            ...(live ? [] : [{ value: 'users' as const, label: 'الحسابات', count: users.length }]),
          ]}
        />

        {!data ? null : tab === 'subscriptions' ? (
          <Table
            head={['الشجرة', 'المالك', 'الباقة', 'الحالة', 'التجديد', 'الدفع']}
            rows={subs.map((x) => [
              <span key="id" dir="ltr" className="font-mono text-caption text-ink">
                {x.treeId.slice(0, 13)}
              </span>,
              x.owner,
              <span key="p">
                {planName[x.plan]}، {cycleName[x.cycle]}
                {x.scheduledPlan ? (
                  <span className="block text-caption text-muted">
                    ينزل إلى {planName[x.scheduledPlan]}
                  </span>
                ) : null}
              </span>,
              <Chip key="st" tone={statusTone(x.status)}>
                {x.cancelAtPeriodEnd ? 'لن يتجدد' : statusName[x.status]}
              </Chip>,
              x.periodEnd ? day(x.periodEnd) : 'مفتوح',
              x.provider === 'manual' ? 'يدوي' : x.provider === 'moyasar' ? 'ميسّر' : 'تجريبي',
            ])}
          />
        ) : tab === 'payments' ? (
          <Table
            head={['العملية', 'الشجرة', 'النوع', 'المبلغ', 'الحالة', 'التاريخ']}
            rows={data.payments.map((p) => [
              <span key="id" dir="ltr" className="font-mono text-caption">
                {p.id.slice(0, 13)}
              </span>,
              <span key="t" dir="ltr" className="font-mono text-caption">
                {p.treeId.slice(0, 13)}
              </span>,
              `${p.kind === 'renewal' ? 'تجديد' : p.kind === 'upgrade' ? 'ترقية' : 'اشتراك'}: ${planName[p.plan]}`,
              <span key="a" className="tabular-nums">
                {riyals(p.amount)}
              </span>,
              <span key="st" className="grid justify-items-start gap-1">
                <Chip tone={statusTone(p.status)}>
                  {p.status === 'paid'
                    ? 'مدفوعة'
                    : p.status === 'failed'
                      ? 'مرفوضة'
                      : p.status === 'open'
                        ? 'بانتظار البنك'
                        : 'منتهية'}
                </Chip>
                {p.failureReason ? (
                  <span className="text-caption text-muted">{p.failureReason}</span>
                ) : null}
              </span>,
              day(p.createdAt),
            ])}
            empty="ما فيه مدفوعات بعد"
          />
        ) : tab === 'invoices' ? (
          <Table
            head={['الرقم', 'العميل', 'الباقة', 'الإجمالي', 'الضريبة', 'التاريخ']}
            rows={data.invoices.map((i) => [
              <span key="id" dir="ltr" className="font-mono text-caption">
                {i.number}
              </span>,
              i.buyerName,
              i.plan ? planName[i.plan] : '',
              <span key="t" className="tabular-nums">
                {riyals(i.total)}
              </span>,
              i.vat ? (
                <span key="v" className="tabular-nums">
                  {riyals(i.vat)}
                </span>
              ) : (
                <Chip key="v">غير مسجل</Chip>
              ),
              day(i.issuedAt),
            ])}
            empty="ما فيه فواتير بعد"
          />
        ) : tab === 'requests' ? (
          data.requests.length ? (
            <ul className="grid gap-3">
              {data.requests.map((r) => (
                <li
                  key={r.treeId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-light/60 bg-card p-5"
                >
                  <span className="flex items-center gap-3">
                    <Medallion name={r.owner} />
                    <span className="grid">
                      <span className="text-body font-semibold text-forest">
                        {r.owner} يطلب باقة {planName[r.to]}
                      </span>
                      <span className="text-caption text-muted">
                        الشجرة <span dir="ltr">{r.treeId.slice(0, 13)}</span> على {planName[r.from]}{' '}
                        الآن
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className={cn(buttonClass('primary', 'sm'), 'rounded-xl')}
                    onClick={() =>
                      act(
                        { action: 'grant', treeId: r.treeId, plan: r.to, until: null },
                        `فعّلنا باقة ${planName[r.to]}، ووصل المالك إشعار`,
                      )
                    }
                  >
                    <Icon name="check" />
                    فعّلها يدويًا
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-line/70 bg-card/60 px-6 py-12 text-center">
              <Icon name="task_alt" className="text-[2rem] text-olive" />
              <p className="text-title font-bold text-forest">ما فيه طلبات</p>
              <p className="max-w-sm text-body text-muted">
                قبل فتح الدفع، يطلب المالك الباقة من صفحة الباقة وتفعّلها هنا بضغطة. بعد الإطلاق
                تتفعّل الباقات بالدفع لحالها.
              </p>
            </div>
          )
        ) : tab === 'prices' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Prices data={data} onSave={act} />
            <SellerForm data={data} onSave={act} />
          </div>
        ) : tab === 'codes' ? (
          <Codes data={data} />
        ) : (
          <Table
            head={['الاسم', 'الجوال', 'الأشجار', 'الدور الأبرز', 'انضم']}
            rows={users.map((u) => [
              <span key="n" className="flex items-center gap-2 font-semibold text-forest">
                <Medallion name={u.name} size="sm" />
                {u.name}
              </span>,
              <span key="ph" dir="ltr" className="tabular-nums">
                +966 {u.phone}
              </span>,
              num(u.trees),
              u.role,
              u.joined,
            ])}
          />
        )}
      </main>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

const toRiyals = (h: number | null) => (h === null ? '' : String(h / 100));
const toHalalas = (v: string) => (v.trim() === '' ? null : Math.round(Number(v) * 100));

function Prices({
  data,
  onSave,
}: {
  data: AdminBilling;
  onSave: (a: AdminAction, done: string) => void;
}) {
  const [draft, setDraft] = useState(
    () =>
      Object.fromEntries(
        data.offers.map((o) => [
          o.id,
          { m: toRiyals(o.prices.monthly), a: toRiyals(o.prices.annual) },
        ]),
      ) as Record<PlanId, { m: string; a: string }>,
  );
  const bad = (v: string) => v.trim() !== '' && !(Number(v) >= 1);
  return (
    <Panel title="الأسعار" icon="sell">
      <div className="grid gap-5 p-5">
        <p className="text-caption leading-relaxed text-muted">
          بالريال شاملة الضريبة. اترك الخانة فاضية لتبقى &quot;يُعلن عند الإطلاق&quot;. السعر الجديد
          يسري على الاشتراكات الجديدة والتجديدات القادمة.
        </p>
        {planIds.map((id) => {
          const d = draft[id];
          return (
            <div key={id} className="grid gap-3 rounded-xl border border-line/40 p-4">
              <span className="text-body font-semibold text-forest">{planName[id]}</span>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="شهري"
                  inputMode="decimal"
                  dir="ltr"
                  value={d.m}
                  error={bad(d.m) ? 'رقم غير صحيح' : undefined}
                  onChange={(e) => setDraft({ ...draft, [id]: { ...d, m: e.target.value } })}
                />
                <Field
                  label="سنوي"
                  inputMode="decimal"
                  dir="ltr"
                  value={d.a}
                  error={bad(d.a) ? 'رقم غير صحيح' : undefined}
                  onChange={(e) => setDraft({ ...draft, [id]: { ...d, a: e.target.value } })}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="justify-self-start rounded-xl"
                disabled={bad(d.m) || bad(d.a)}
                onClick={() =>
                  onSave(
                    { action: 'prices', plan: id, monthly: toHalalas(d.m), annual: toHalalas(d.a) },
                    `حفظنا أسعار ${planName[id]}`,
                  )
                }
              >
                احفظ
              </Button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SellerForm({
  data,
  onSave,
}: {
  data: AdminBilling;
  onSave: (a: AdminAction, done: string) => void;
}) {
  const [f, setF] = useState({
    name: data.seller.name,
    vatNumber: data.seller.vatNumber,
    crNumber: data.seller.crNumber,
    address: data.seller.address,
  });
  const vatBad = f.vatNumber !== '' && !validVatNumber(f.vatNumber);
  return (
    <Panel title="البائع على الفواتير" icon="storefront">
      <form
        className="grid gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!vatBad) onSave({ action: 'seller', ...f }, 'حفظنا بيانات البائع');
        }}
      >
        <Field
          label="اسم المنشأة"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <Field
          label="السجل التجاري"
          dir="ltr"
          inputMode="numeric"
          value={f.crNumber}
          onChange={(e) => setF({ ...f, crNumber: e.target.value })}
        />
        <Field
          label="الرقم الضريبي"
          dir="ltr"
          inputMode="numeric"
          value={f.vatNumber}
          hint="اتركه فاضيًا حتى التسجيل في الضريبة. بعده تصير الفواتير ضريبية مبسطة بضريبة 15% ورمز QR."
          error={vatBad ? '15 رقمًا، يبدأ وينتهي بـ 3' : undefined}
          onChange={(e) =>
            setF({ ...f, vatNumber: e.target.value.replace(/\D/g, '').slice(0, 15) })
          }
        />
        <Field
          label="العنوان"
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
        />
        <Button type="submit" size="sm" className="justify-self-start rounded-xl" disabled={vatBad}>
          احفظ
        </Button>
        <p className="text-caption text-muted">
          التغيير يظهر على الفواتير الجديدة فقط؛ الفواتير الصادرة تبقى كما صدرت.
        </p>
      </form>
    </Panel>
  );
}

function Codes({ data }: { data: AdminBilling }) {
  const label = { whatsapp: 'واتساب', sms: 'رسالة نصية', mock: 'تجريبي (في السجل)' } as const;
  const total = data.codes.reduce((a, c) => a + c.sent, 0);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {data.codes.map((c) => (
          <div key={c.channel} className="grid gap-1 rounded-2xl border border-line/40 bg-card p-5">
            <span className="flex items-center gap-2 text-caption text-muted">
              <Icon
                name={c.channel === 'whatsapp' ? 'chat' : c.channel === 'sms' ? 'sms' : 'terminal'}
                className="text-[1.1rem] text-olive"
              />
              {label[c.channel]}
            </span>
            <span className="text-h2 font-bold tabular-nums text-forest">{num(c.sent)}</span>
            <span className="text-caption text-muted">
              {total ? `${Math.round((c.sent / total) * 100)}% من الرموز` : 'لا شيء بعد'}
              {c.failed ? `، وتعذر ${num(c.failed)}` : ''}
            </span>
          </div>
        ))}
      </div>
      <p className="rounded-xl border border-line/40 bg-card px-4 py-3 text-caption leading-relaxed text-ink-soft">
        آخر 30 يومًا. الرمز يروح على واتساب أولًا، وإذا تعذر أو طلب الشخص الرمز مرة ثانية يروح
        برسالة نصية. حتى تجهز الحسابات، الرموز تُكتب في سجل الخادم على بيئة التجربة فقط.
      </p>
    </div>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  if (!rows.length && empty)
    return (
      <p className="rounded-2xl border border-dashed border-line/70 bg-card/60 px-6 py-10 text-center text-body text-muted">
        {empty}
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-2xl border border-line/40 bg-card">
      <table className="w-full min-w-[40rem] text-body">
        <thead>
          <tr className="border-b border-line/30 bg-surface-low text-caption text-muted">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/20 last:border-0 hover:bg-surface-low/60">
              {r.map((c, k) => (
                <td key={k} className="px-4 py-3 text-ink-soft">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
