'use client';

import type { PlanId } from '@sulalah/domain';
import { Chip, Icon, Logo, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { Tabs, Toast } from '@/components/AppShell';
import { TREE_ID, myName, newId, num, planName, update, useDemo } from '@/lib/demo-store';

/**
 * The platform owner's desk: accounts, trees, plan activations and invoices. It holds only
 * what the database holds. A tree here is its id, owner, plan and file, never its names,
 * which stay encrypted with the family.
 */

type Tab = 'requests' | 'trees' | 'users' | 'invoices';

interface TreeRow {
  id: string;
  owner: string;
  plan: PlanId;
  members: number;
  fileKb: number;
  updated: string;
}

const otherTrees: TreeRow[] = [
  {
    id: 'bani-khalid',
    owner: 'تركي بن خالد',
    plan: 'family',
    members: 9,
    fileKb: 41,
    updated: 'قبل أسبوع',
  },
  {
    id: 'al-abdulaziz',
    owner: 'سلطان بن عبدالعزيز',
    plan: 'tribe',
    members: 64,
    fileKb: 610,
    updated: 'أمس',
  },
  {
    id: 'al-otaibi-23',
    owner: 'نايف بن مطلق',
    plan: 'extended',
    members: 21,
    fileKb: 188,
    updated: 'قبل 3 أيام',
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

interface Invoice {
  id: string;
  owner: string;
  plan: PlanId;
  status: 'paid' | 'manual' | 'due';
  at: string;
}

/** The whole platform at a glance; numbers only, nothing from inside a tree. */
export function Admin() {
  const s = useDemo();
  const [tab, setTab] = useState<Tab>('requests');
  const [toast, setToast] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'INV-0007',
      owner: 'سلطان بن عبدالعزيز',
      plan: 'tribe',
      status: 'manual',
      at: '2 أكتوبر 2026',
    },
    {
      id: 'INV-0006',
      owner: 'نايف بن مطلق',
      plan: 'extended',
      status: 'manual',
      at: '28 سبتمبر 2026',
    },
    {
      id: 'INV-0005',
      owner: 'تركي بن خالد',
      plan: 'family',
      status: 'manual',
      at: '14 سبتمبر 2026',
    },
  ]);

  const trees: TreeRow[] = [
    {
      id: TREE_ID,
      owner: myName(s),
      plan: s.plan,
      members: 1 + s.reviewers.length + 6,
      fileKb: 96,
      updated: 'الآن',
    },
    ...otherTrees,
  ];
  const requests = s.upgradeRequested
    ? [{ tree: TREE_ID, owner: myName(s), from: s.plan, to: s.upgradeRequested }]
    : [];

  const activate = (to: PlanId) => {
    update((st) => ({
      ...st,
      plan: to,
      upgradeRequested: undefined,
      notices: [
        {
          id: newId('n'),
          icon: 'workspace_premium',
          text: `تفعّلت باقة ${planName[to]} لشجرتك`,
          at: 'الآن',
          unread: true,
          href: `/trees/${TREE_ID}/plan`,
        },
        ...st.notices,
      ],
    }));
    setInvoices((list) => [
      {
        id: `INV-${String(8 + list.length - 3).padStart(4, '0')}`,
        owner: myName(s),
        plan: to,
        status: 'manual',
        at: 'اليوم',
      },
      ...list,
    ]);
    setToast(`فعّلنا باقة ${planName[to]}، ووصل المالك إشعار`);
  };

  const stats = [
    { label: 'الحسابات', value: users.length, icon: 'group' },
    { label: 'الأشجار', value: trees.length, icon: 'forest' },
    { label: 'باقات مفعّلة', value: trees.length, icon: 'workspace_premium' },
    {
      label: 'طلبات تنتظرك',
      value: requests.length,
      icon: 'pending_actions',
      warn: requests.length > 0,
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
          <h1 className="page-in text-h1-m font-bold md:text-h1">أهلًا فيصل، هذي المنصة اليوم</h1>
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
                    'mt-1 text-[2rem]/none font-bold tabular-nums',
                    x.warn ? 'text-gold-light' : 'text-ivory',
                  )}
                >
                  {num(x.value)}
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
          هذي اللوحة تعرض اللي في قاعدة البيانات فقط. أسماء الأشجار ومن فيها مشفّرة عند العوائل، فما
          تظهر هنا ولا تقدر تفتحها.
        </p>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'requests', label: 'طلبات التفعيل', count: requests.length },
            { value: 'trees', label: 'الأشجار', count: trees.length },
            { value: 'users', label: 'الحسابات', count: users.length },
            { value: 'invoices', label: 'الفواتير', count: invoices.length },
          ]}
        />

        {tab === 'requests' ? (
          requests.length ? (
            <ul className="grid gap-3">
              {requests.map((r) => (
                <li
                  key={r.tree}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-light/60 bg-card p-5"
                >
                  <span className="flex items-center gap-3">
                    <Medallion name={r.owner} />
                    <span className="grid">
                      <span className="text-body font-semibold text-forest">
                        {r.owner} يطلب ترقية
                      </span>
                      <span className="text-caption text-muted">
                        الشجرة <span dir="ltr">{r.tree}</span> من {planName[r.from]} إلى{' '}
                        {planName[r.to]}
                      </span>
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className={cn(buttonClass('primary', 'sm'), 'rounded-xl')}
                      onClick={() => activate(r.to)}
                    >
                      <Icon name="check" />
                      فعّلها يدويًا
                    </button>
                    <button
                      type="button"
                      className={cn(buttonClass('ghost', 'sm'), 'rounded-xl')}
                      onClick={() => {
                        update((st) => ({ ...st, upgradeRequested: undefined }));
                        setToast('أجّلنا الطلب');
                      }}
                    >
                      لاحقًا
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-line/70 bg-card/60 px-6 py-12 text-center">
              <Icon name="task_alt" className="text-[2rem] text-olive" />
              <p className="text-title font-bold text-forest">ما فيه طلبات</p>
              <p className="max-w-sm text-body text-muted">
                لما يطلب مالك ترقية من صفحة الباقة، يظهر طلبه هنا وتفعّله بضغطة.{' '}
                <Link
                  href={`/trees/${TREE_ID}/plan`}
                  className="font-semibold text-olive hover:underline"
                >
                  جرّب تطلب ترقية
                </Link>
              </p>
            </div>
          )
        ) : null}

        {tab === 'trees' ? (
          <Table
            head={['الشجرة', 'المالك', 'الباقة', 'الأعضاء', 'حجم الملف المشفّر', 'آخر تحديث']}
            rows={trees.map((x) => [
              <span key="id" dir="ltr" className="font-mono text-caption text-ink">
                {x.id}
              </span>,
              x.owner,
              <Chip key="p" tone={x.plan === 'tribe' ? 'forest' : 'olive'}>
                {planName[x.plan]}
              </Chip>,
              num(x.members),
              `${num(x.fileKb)} ك.ب`,
              x.updated,
            ])}
          />
        ) : null}

        {tab === 'users' ? (
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
        ) : null}

        {tab === 'invoices' ? (
          <Table
            head={['الرقم', 'المالك', 'الباقة', 'الحالة', 'التاريخ']}
            rows={invoices.map((i) => [
              <span key="id" dir="ltr" className="font-mono text-caption">
                {i.id}
              </span>,
              i.owner,
              planName[i.plan],
              <Chip key="st" tone={i.status === 'due' ? 'pending' : 'success'}>
                {i.status === 'manual' ? 'تفعيل يدوي' : i.status === 'paid' ? 'مدفوعة' : 'مستحقة'}
              </Chip>,
              i.at,
            ])}
          />
        ) : null}
      </main>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
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
