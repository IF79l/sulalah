'use client';

import { Button, Icon, OtpField } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { deleteMyAccount, ownedTrees, type OwnedTree } from '@/lib/account';
import { num } from '@/lib/demo-store';
import { supabase } from '@/lib/supabase/client';
import { loadTreeFile } from '@/lib/tree-cloud';
import { treeKey } from '@/lib/tree-keys';

type Step = 'idle' | 'review' | 'code';

const others = (n: number) =>
  n === 1 ? 'شخص' : n === 2 ? 'شخصين' : n <= 10 ? `${num(n)} أشخاص` : `${num(n)} شخصًا`;

/** A tree's name, read from its sealed file; the server never knows it. */
async function titleOf(treeId: string) {
  try {
    const key = await treeKey(treeId);
    const loaded = key ? await loadTreeFile(treeId, key) : null;
    return loaded?.file.tree.title ?? 'شجرة عائلة';
  } catch {
    return 'شجرة عائلة';
  }
}

/**
 * Deleting the account from "حسابي". A tree with other people in it must be handed over or
 * deleted first, so a family never loses its tree to one person leaving. Trees only they are
 * in go with the account. A fresh code from their phone confirms it is really them.
 */
export function DeleteAccount({
  phone,
  onDeleted,
}: {
  phone: string;
  onDeleted: () => Promise<void>;
}) {
  const [step, setStep] = useState<Step>('idle');
  const [trees, setTrees] = useState<(OwnedTree & { title: string })[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const e164 = `+966${phone}`;

  const review = async () => {
    setStep('review');
    setError(undefined);
    setTrees(null);
    try {
      const owned = await ownedTrees();
      setTrees(
        await Promise.all(owned.map(async (t) => ({ ...t, title: await titleOf(t.treeId) }))),
      );
    } catch {
      setError('ما قدرنا نجيب أشجارك، حاول مرة ثانية');
    }
  };

  const sendCode = async () => {
    setBusy(true);
    setError(undefined);
    const { error: e } = await supabase().auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (e)
      return setError(
        e.status === 429
          ? 'طلبت رموز كثيرة، انتظر دقيقة وحاول'
          : 'ما قدرنا نرسل الرمز، حاول بعد شوي',
      );
    setCode('');
    setStep('code');
  };

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    const { error: e } = await supabase().auth.verifyOtp({ phone: e164, token: code, type: 'sms' });
    if (e) {
      setBusy(false);
      setCode('');
      return setError('الرمز غير صحيح أو انتهت صلاحيته');
    }
    const why = await deleteMyAccount();
    if (why) {
      setBusy(false);
      return setError(why);
    }
    await onDeleted();
  };

  const cancel = () => {
    setStep('idle');
    setError(undefined);
    setCode('');
  };

  const shared = trees?.filter((t) => t.others > 0) ?? [];
  const alone = trees?.filter((t) => t.others === 0) ?? [];

  return (
    <div className="grid gap-4 p-5">
      {step === 'idle' ? (
        <>
          <p className="text-body leading-relaxed text-ink-soft">
            حذف الحساب نهائي وما يرجع. قبل ما نحذفه نعرض لك وش بيصير لكل شجرة أنت فيها.
          </p>
          <Button
            size="sm"
            variant="danger"
            className="justify-self-start"
            onClick={() => void review()}
          >
            احذف حسابي
          </Button>
        </>
      ) : trees === null && !error ? (
        <p className="text-body text-muted">نجيب أشجارك…</p>
      ) : shared.length ? (
        <>
          <p className="text-body leading-relaxed text-ink-soft">
            هذي الأشجار فيها أحد غيرك، فانقل ملكيتها لأحد من أهلها أو احذفها من إعداداتها، عشان ما
            تضيع على العائلة. بعدها ارجع هنا واحذف حسابك.
          </p>
          <ul className="grid gap-2">
            {shared.map((t) => (
              <li
                key={t.treeId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/40 px-4 py-3"
              >
                <span className="grid">
                  <span className="text-body font-semibold text-forest">{t.title}</span>
                  <span className="text-caption text-muted">فيها {others(t.others)} غيرك</span>
                </span>
                <Link
                  href={`/trees/${t.treeId}/settings`}
                  className="inline-flex items-center gap-1 text-caption font-semibold text-olive hover:underline"
                >
                  انقل ملكيتها أو احذفها
                  <Icon name="arrow_back" className="text-[1rem]" />
                </Link>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="justify-self-start" onClick={cancel}>
            رجوع
          </Button>
        </>
      ) : (
        <>
          <p className="text-body font-semibold text-forest">لما تحذف حسابك:</p>
          <ul className="grid list-disc gap-1.5 ps-5 text-body leading-relaxed text-ink-soft">
            {alone.map((t) => (
              <li key={t.treeId}>
                تنحذف &quot;{t.title}&quot; نهائيًا مع ملفها ونسخها، لأنك الوحيد فيها
                {t.paid ? '، وتتوقف باقتها المدفوعة معها' : ''}.
              </li>
            ))}
            <li>
              تخرج من الأشجار اللي أنت فيها مدققًا أو مساهمًا، ويوصل مالكها تنبيه إن أحد الأعضاء
              غادر، وتنحذف إضافاتك اللي ما انراجعت.
            </li>
            <li>ينحذف اسمك ورقم جوالك وإعدادات تنبيهاتك.</li>
            <li>الفواتير المدفوعة تبقى محفوظة لأن النظام يلزمنا بحفظها.</li>
          </ul>
          {step === 'code' ? (
            <div className="grid max-w-md gap-3">
              <p className="text-body text-ink-soft">
                أرسلنا رمزًا إلى{' '}
                <bdi dir="ltr" className="inline-block font-semibold">
                  +966 {phone.slice(0, 2)} {phone.slice(2, 5)} {phone.slice(5)}
                </bdi>
                . اكتبه لتأكيد الحذف.
              </p>
              <OtpField value={code} onChange={setCode} invalid={!!error} />
              <span className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={code.length < 6 || busy}
                  onClick={() => void confirm()}
                >
                  {busy ? 'نحذف…' : 'احذف حسابي نهائيًا'}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>
                  إلغاء
                </Button>
              </span>
            </div>
          ) : (
            <span className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={busy || !trees}
                onClick={() => void sendCode()}
              >
                {busy ? 'نرسل الرمز…' : 'أرسل رمز التأكيد'}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel}>
                إلغاء
              </Button>
            </span>
          )}
        </>
      )}
      {error ? <p className="text-body text-danger">{error}</p> : null}
    </div>
  );
}
