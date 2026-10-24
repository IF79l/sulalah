'use client';

import { Button, Field, Icon, Logo, OtpField, PhoneField } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { safeNext } from '@/lib/backend';
import { supabase } from '@/lib/supabase/client';

type Step = 'phone' | 'code' | 'name';

const RESEND_S = 45;

/**
 * Phone-only sign in: number, then a six-digit SMS code, then (first time only) a name.
 * With `live` the code goes through Supabase; without it (the demo build) any code is accepted.
 */
export function SignIn({
  invite,
  next,
  live,
}: {
  invite?: { from: string; tree: string; token?: string };
  next?: string;
  live?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(RESEND_S);
  const [name, setName] = useState({ first: '', father: '', family: '' });
  const [codeError, setCodeError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const e164 = `+966${phone}`;

  const finish = () => {
    router.replace(invite?.token ? `/invite/${invite.token}` : safeNext(next));
    router.refresh();
  };

  useEffect(() => {
    if (step !== 'code' || wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [step, wait]);

  useEffect(() => {
    if (step !== 'code' || code.length !== 6) return;
    if (!live) {
      setStep('name');
      return;
    }
    let gone = false;
    setChecking(true);
    setCodeError(undefined);
    (async () => {
      const db = supabase();
      const { data, error } = await db.auth.verifyOtp({ phone: e164, token: code, type: 'sms' });
      if (gone) return;
      if (error || !data.user) {
        setChecking(false);
        setCode('');
        setCodeError(
          error?.status === 429
            ? 'محاولات كثيرة، انتظر دقيقة وحاول'
            : 'الرمز غير صحيح أو انتهت صلاحيته',
        );
        return;
      }
      const { data: me } = await db
        .from('profiles')
        .select('first_name')
        .eq('id', data.user.id)
        .maybeSingle();
      if (gone) return;
      setChecking(false);
      if (me?.first_name) finish();
      else setStep('name');
    })();
    return () => {
      gone = true;
    };
    // finish and e164 follow from state already in the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, code, live]);

  const send = async () => {
    if (!/^5\d{8}$/.test(phone)) {
      setPhoneError('رقم الجوال يبدأ بـ 5 ويتكون من 9 أرقام');
      return;
    }
    setPhoneError(undefined);
    setSending(true);
    if (live) {
      const { error } = await supabase().auth.signInWithOtp({ phone: e164 });
      setSending(false);
      if (error) {
        const text =
          error.status === 429
            ? 'طلبت رموز كثيرة، انتظر دقيقة وحاول'
            : 'ما قدرنا نرسل الرمز، حاول بعد شوي';
        if (step === 'code') setCodeError(text);
        else setPhoneError(text);
        return;
      }
    } else {
      await new Promise((r) => setTimeout(r, 600));
      setSending(false);
    }
    setCode('');
    setCodeError(undefined);
    setWait(RESEND_S);
    setStep('code');
  };

  const saveName = async () => {
    if (!name.first.trim()) return;
    if (!live) {
      router.push(invite ? '/trees/al-sahli/join' : '/trees');
      return;
    }
    setSaving(true);
    const db = supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user)
      await db
        .from('profiles')
        .update({
          first_name: name.first.trim(),
          father_name: name.father.trim(),
          family_name: name.family.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    finish();
  };

  const shownPhone = `+966 ${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  const fullName = [name.first, name.father && `بن ${name.father}`, name.family]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ivory">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-olive-soft/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-gold-light/40 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-[max(16px,env(safe-area-inset-right,0px))] pt-[calc(16px+env(safe-area-inset-top,0px))] md:px-8">
        <Link href="/" aria-label="سُلالة، الرئيسية">
          <Logo />
        </Link>
        <Link
          href="/demo"
          className="inline-flex items-center gap-1 text-caption text-ink-soft hover:text-forest"
        >
          <Icon name="park" />
          جرّب الشجرة
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[520px]">
          {invite ? (
            <div className="relative z-20 mx-auto -mb-4 flex w-11/12 items-center justify-between gap-3 rounded-2xl border border-gold-light/30 bg-forest px-5 py-2.5 text-ivory shadow-lg">
              <span className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full border border-leaf/50 bg-leaf/30">
                  <Icon name="nature_people" fill className="text-[1rem] text-olive-soft" />
                </span>
                <span className="grid">
                  <span className="text-body font-semibold">
                    دعاك {invite.from} لـ{invite.tree}
                  </span>
                  <span className="text-caption text-on-forest-soft">
                    سجّل دخولك لتختار غصنك وتضيف عائلتك
                  </span>
                </span>
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-ivory/10 px-2 py-0.5 text-caption text-olive-soft sm:inline-flex">
                <Icon name="lock" className="text-[1rem]" />
                دعوة خاصة
              </span>
            </div>
          ) : null}

          <div className="relative z-10 rounded-2xl border border-gold-light/35 bg-card px-6 pt-10 pb-8 shadow-xl sm:px-8">
            {step === 'phone' ? (
              <form
                className="grid gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <div className="grid justify-items-center gap-1.5 text-center">
                  <span className="mb-3 h-0.5 w-12 rounded-full bg-gold-light/70" />
                  <h1 className="text-h2 font-bold text-forest">أهلًا بك في سُلالة</h1>
                  <p className="max-w-sm text-body text-muted">
                    اكتب رقم جوالك ونرسل لك رمز تحقق. ما تحتاج كلمة مرور.
                  </p>
                </div>
                <PhoneField
                  value={phone}
                  onChange={setPhone}
                  error={phoneError}
                  hint="يوصلك الرمز في رسالة نصية"
                />
                <Button type="submit" disabled={sending} className="w-full">
                  {sending ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin" />
                      نرسل الرمز…
                    </>
                  ) : (
                    <>
                      أرسل الرمز
                      <Icon name="arrow_back" />
                    </>
                  )}
                </Button>
                <p className="border-t border-line/30 pt-4 text-center text-caption leading-relaxed text-muted">
                  بالمتابعة توافق على{' '}
                  <Link href="/terms" className="font-semibold text-olive hover:underline">
                    شروط الاستخدام
                  </Link>{' '}
                  و
                  <Link href="/privacy" className="font-semibold text-olive hover:underline">
                    سياسة الخصوصية
                  </Link>
                </p>
              </form>
            ) : null}

            {step === 'code' ? (
              <div className="grid gap-5 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-olive-soft text-on-olive-soft">
                  <Icon name="sms" />
                </span>
                <div className="grid gap-1">
                  <h1 className="text-h2 font-bold text-forest">أدخل الرمز</h1>
                  <p className="text-body text-muted">
                    أرسلنا رمزًا من 6 أرقام إلى{' '}
                    <span
                      dir="ltr"
                      className="inline-block font-semibold text-ink [unicode-bidi:isolate]"
                    >
                      {`\u2066${shownPhone}\u2069`}
                    </span>
                  </p>
                </div>
                <OtpField value={code} onChange={setCode} invalid={!!codeError} />
                {checking ? (
                  <p
                    role="status"
                    className="flex items-center justify-center gap-2 text-caption text-muted"
                  >
                    <Icon name="progress_activity" className="animate-spin" />
                    نتحقق من الرمز…
                  </p>
                ) : codeError ? (
                  <p role="alert" className="text-caption font-medium text-danger">
                    {codeError}
                  </p>
                ) : null}
                <div className="flex items-center justify-between px-1 text-caption">
                  <button
                    type="button"
                    className="font-medium text-forest hover:underline"
                    onClick={() => setStep('phone')}
                  >
                    تغيير الرقم
                  </button>
                  {wait > 0 ? (
                    <span className="text-outline">
                      إعادة الإرسال بعد <bdi dir="ltr">0:{String(wait).padStart(2, '0')}</bdi>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="font-medium text-forest hover:underline"
                      disabled={sending}
                      onClick={() => void send()}
                    >
                      أعد الإرسال
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {step === 'name' ? (
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveName();
                }}
              >
                <div className="grid gap-1 text-center">
                  <h1 className="text-h2 font-bold text-forest">وش اسمك؟</h1>
                  <p className="text-body text-muted">يظهر اسمك لأهلك على الإضافات اللي ترسلها.</p>
                </div>
                <Field
                  label="الاسم الأول"
                  value={name.first}
                  onChange={(e) => setName({ ...name, first: e.target.value })}
                  autoFocus
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="اسم الأب"
                    value={name.father}
                    onChange={(e) => setName({ ...name, father: e.target.value })}
                  />
                  <Field
                    label="العائلة"
                    value={name.family}
                    onChange={(e) => setName({ ...name, family: e.target.value })}
                  />
                </div>
                {fullName ? (
                  <p className="rounded-xl bg-surface-low px-4 py-2.5 text-body text-ink-soft">
                    يظهر اسمك: <span className="font-semibold text-forest">{fullName}</span>
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={!name.first.trim() || saving}>
                  {saving ? 'نحفظ اسمك…' : 'متابعة'}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-line/20 bg-ivory/80 px-4 py-4 text-center text-caption text-muted backdrop-blur-sm">
        اعتماد مالك الشجرة توثيق عائلي، وليس إثباتًا رسميًا للنسب.
      </footer>
    </div>
  );
}
