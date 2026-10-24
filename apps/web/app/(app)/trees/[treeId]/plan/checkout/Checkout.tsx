'use client';

import { splitVat, type BillingCycle, type PlanId } from '@sulalah/domain';
import { Button, Field, Icon } from '@sulalah/ui';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppShell, Panel } from '@/components/AppShell';
import { BillingError, billing } from '@/lib/billing/client';
import { brandName, cycleName, day, riyals } from '@/lib/billing/format';
import type { CheckoutView } from '@/lib/billing/types';
import { planName } from '@/lib/demo-store';

const plans: PlanId[] = ['family', 'extended', 'tribe'];
const cycles: BillingCycle[] = ['monthly', 'annual'];

/** Paying for a plan: the server's price, then the card. The plan turns on when the bank says so. */
export function Checkout() {
  const { treeId } = useParams<{ treeId: string }>();
  const q = useSearchParams();
  const router = useRouter();
  const plan = plans.find((p) => p === q.get('plan'));
  const cycle = cycles.find((c) => c === q.get('cycle')) ?? 'monthly';
  const [c, setC] = useState<CheckoutView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCard, setNewCard] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current || !plan) return;
    opened.current = true;
    billing
      .startCheckout(treeId, plan, cycle)
      .then(setC)
      .catch((e: Error) => setError(e instanceof BillingError ? e.message : 'صار خطأ'));
  }, [treeId, plan, cycle]);

  const back = { href: `/trees/${treeId}/plan`, label: 'الباقة' };
  const done = () => router.push(`/trees/${treeId}/plan/return?checkout=${c!.id}`);

  return (
    <AppShell
      need="billing.manage"
      title="الدفع"
      subtitle="دفع آمن، والبطاقة ما تمر على خوادمنا."
      back={back}
    >
      {!plan || error ? (
        <p className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-body text-danger">
          <Icon name="error" className="mt-0.5" />
          {error ?? 'اختر باقة من صفحة الباقة'}
        </p>
      ) : !c ? (
        <p className="text-body text-muted">نجهّز الفاتورة...</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <Panel title="طريقة الدفع" icon="credit_card" className="lg:order-1">
            <div className="grid gap-5 p-5 md:p-6">
              {c.savedCard && !newCard ? (
                <SavedCard c={c} treeId={treeId} onDone={done} onOther={() => setNewCard(true)} />
              ) : c.mode === 'moyasar' ? (
                <MoyasarForm c={c} treeId={treeId} />
              ) : (
                <TestCardForm c={c} treeId={treeId} onDone={done} />
              )}
            </div>
          </Panel>
          <Summary c={c} />
        </div>
      )}
    </AppShell>
  );
}

function Summary({ c }: { c: CheckoutView }) {
  const v = splitVat(c.amount, c.vatRateBp);
  return (
    <Panel title="ملخص الطلب" icon="receipt_long" className="lg:order-2">
      <dl className="grid gap-3 p-5 text-body md:p-6">
        <div className="flex justify-between gap-3">
          <dt className="text-ink">
            باقة {planName[c.plan]}، {cycleName[c.cycle]}
          </dt>
          <dd className="tabular-nums">{riyals(c.amount + c.credit)}</dd>
        </div>
        {c.credit > 0 ? (
          <div className="flex justify-between gap-3 text-success">
            <dt>خصم الأيام الباقية من باقتك</dt>
            <dd className="tabular-nums">− {riyals(c.credit)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 text-muted">
          <dt>تبدأ اليوم وتتجدد</dt>
          <dd>{day(c.periodEnd)}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line/40 pt-4">
          <dt className="text-title font-bold text-forest">المطلوب اليوم</dt>
          <dd className="text-h2 font-bold tabular-nums text-forest">{riyals(c.amount)}</dd>
        </div>
        <p className="text-caption text-muted">
          {v.vat > 0
            ? `شامل ضريبة القيمة المضافة 15%: ${riyals(v.vat)}`
            : 'السعر نهائي، بلا ضريبة قيمة مضافة.'}
        </p>
        {c.mode !== 'moyasar' ? (
          <p className="flex items-start gap-2 rounded-xl bg-surface-low p-3 text-caption text-ink-soft">
            <Icon name="science" className="mt-0.5 text-[1.1rem] text-olive" />
            دفع تجريبي: لا يُخصم أي مبلغ.
          </p>
        ) : null}
      </dl>
    </Panel>
  );
}

function Failure({ text }: { text: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-body text-danger"
    >
      <Icon name="credit_card_off" className="mt-0.5" />
      {text}
    </p>
  );
}

function SavedCard({
  c,
  treeId,
  onDone,
  onOther,
}: {
  c: CheckoutView;
  treeId: string;
  onDone: () => void;
  onOther: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const card = c.savedCard!;
  const pay = async () => {
    setBusy(true);
    setFail(null);
    try {
      const r = await billing.pay(treeId, c.id, { method: 'saved' });
      if (r.status === 'redirect' && r.url) window.location.assign(r.url);
      else if (r.status === 'failed') setFail(r.message ?? 'رُفضت البطاقة');
      else onDone();
    } catch (e) {
      setFail(e instanceof Error ? e.message : 'صار خطأ');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex items-center gap-4 rounded-2xl border border-forest/30 bg-olive-soft/20 p-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-forest text-ivory">
          <Icon name="credit_card" />
        </span>
        <span className="grid">
          <span className="text-body font-semibold text-ink">
            {brandName(card.brand)}{' '}
            <bdi dir="ltr" className="tabular-nums">
              •••• {card.last4}
            </bdi>
          </span>
          {card.expMonth && card.expYear ? (
            <span className="text-caption text-muted">
              تنتهي{' '}
              <bdi dir="ltr">
                {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
              </bdi>
            </span>
          ) : null}
        </span>
      </div>
      {fail ? <Failure text={fail} /> : null}
      <Button className="rounded-xl" disabled={busy} onClick={pay}>
        <Icon name="lock" />
        {busy ? 'نرسل للبنك...' : `ادفع ${riyals(c.amount)}`}
      </Button>
      <button
        type="button"
        className="justify-self-start text-body font-semibold text-olive hover:underline"
        onClick={onOther}
      >
        أو ادفع ببطاقة ثانية
      </button>
    </>
  );
}

/** The sandbox's card form: test cards only, nothing leaves the app. */
function TestCardForm({
  c,
  treeId,
  onDone,
}: {
  c: CheckoutView;
  treeId: string;
  onDone: () => void;
}) {
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);

  const digits = number.replace(/\D/g, '');
  const ready =
    digits.length >= 15 && /^\d{2}\/\d{2}$/.test(exp) && /^\d{3,4}$/.test(cvc) && name.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setFail(null);
    try {
      const r = await billing.pay(treeId, c.id, {
        method: 'sandbox',
        cardNumber: digits,
        saveCard: save,
      });
      if (r.status === 'failed') setFail(r.message ?? 'رُفضت البطاقة');
      else onDone();
    } catch (err) {
      setFail(err instanceof Error ? err.message : 'صار خطأ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-caption text-muted">
        <span>بطاقات التجربة:</span>
        {[
          ['4111 1111 1111 1111', 'تنجح'],
          ['4000 0000 0000 0002', 'تُرفض'],
        ].map(([n, label]) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setNumber(n!);
              setExp('12/29');
              setCvc('123');
              if (!name) setName('FAISAL KHALID');
            }}
            className="rounded-full border border-line/60 bg-card px-3 py-1 hover:border-olive"
          >
            <bdi dir="ltr" className="tabular-nums">
              {n}
            </bdi>{' '}
            {label}
          </button>
        ))}
      </div>
      <Field
        label="رقم البطاقة"
        dir="ltr"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        icon="credit_card"
        value={number}
        onChange={(e) =>
          setNumber(
            e.target.value
              .replace(/\D/g, '')
              .slice(0, 19)
              .replace(/(\d{4})(?=\d)/g, '$1 '),
          )
        }
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="تاريخ الانتهاء"
          dir="ltr"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={exp}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 4);
            setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
          }}
        />
        <Field
          label="رمز التحقق"
          dir="ltr"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="CVC"
          value={cvc}
          onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </div>
      <Field
        label="الاسم على البطاقة"
        dir="ltr"
        autoComplete="cc-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="flex items-start gap-3 rounded-xl border border-line/50 p-3 text-body text-ink">
        <input
          type="checkbox"
          checked={save}
          onChange={(e) => setSave(e.target.checked)}
          className="mt-1 size-4 accent-forest"
        />
        <span className="grid gap-0.5">
          احفظ البطاقة للتجديد التلقائي
          <span className="text-caption text-muted">
            يحفظها مزود الدفع، ونحن نرى آخر أربعة أرقام فقط. بدونها ينتهي الاشتراك في موعده.
          </span>
        </span>
      </label>
      {fail ? <Failure text={fail} /> : null}
      <Button type="submit" className="rounded-xl" disabled={!ready || busy}>
        <Icon name="lock" />
        {busy ? 'نرسل للبنك...' : `ادفع ${riyals(c.amount)}`}
      </Button>
    </form>
  );
}

const MOYASAR_JS =
  process.env.NEXT_PUBLIC_MOYASAR_FORM_JS ?? 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_CSS =
  process.env.NEXT_PUBLIC_MOYASAR_FORM_CSS ?? 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';

declare global {
  interface Window {
    Moyasar?: { init(config: Record<string, unknown>): void };
  }
}

/**
 * Moyasar's own payment form: the card goes from the browser straight to Moyasar. The payment
 * carries the checkout id; the webhook checks its amount against the checkout.
 */
function MoyasarForm({ c, treeId }: { c: CheckoutView; treeId: string }) {
  const [fail, setFail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = MOYASAR_CSS;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = MOYASAR_JS;
    js.onload = () => {
      if (cancelled || !window.Moyasar) return;
      window.Moyasar.init({
        element: '.mysr-form',
        language: 'ar',
        amount: c.amount,
        currency: 'SAR',
        description: `باقة سُلالة: ${planName[c.plan]}`,
        publishable_api_key: c.publishableKey,
        callback_url: c.callbackUrl,
        // Apple Pay joins once the domain is verified with Apple through Moyasar.
        methods: ['creditcard'],
        supported_networks: ['mada', 'visa', 'mastercard'],
        credit_card: { save_card: true },
        metadata: { checkout_id: c.id, tree_id: treeId },
        on_completed: (payment: { id: string }) =>
          billing.pay(treeId, c.id, { method: 'form', paymentId: payment.id }),
      });
    };
    js.onerror = () => setFail('ما قدرنا نحمّل نموذج الدفع. تأكد من اتصالك.');
    document.body.appendChild(js);
    return () => {
      cancelled = true;
      css.remove();
      js.remove();
    };
  }, [c, treeId]);

  return (
    <>
      {fail ? <Failure text={fail} /> : null}
      <div className="mysr-form min-h-64" />
      <p className="flex items-center gap-2 text-caption text-muted">
        <Icon name="verified_user" className="text-[1.1rem] text-olive" />
        الدفع عبر ميسّر، مرخّص من البنك المركزي السعودي. بطاقتك ما تمر على خوادم سُلالة.
      </p>
    </>
  );
}
