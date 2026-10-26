'use client';

import { Button, Field, Icon, OtpField, PhoneField, buttonClass, isSaudiMobile } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell, Panel, Toast } from '@/components/AppShell';
import { closeLive } from '@/lib/demo-store';
import { stopSaving } from '@/lib/live-tree';
import { supabase } from '@/lib/supabase/client';
import { forgetKeys } from '@/lib/tree-keys';
import { DeleteAccount } from './DeleteAccount';
import { NoticeSettings } from './NoticeSettings';

const cleanName = (v: string) => v.replace(/\s+/g, ' ').trim();
const grouped = (n: string) => `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;

/**
 * S23 on a real account: the name and number come from the account itself, not from any open
 * tree, and every change is saved on the server before it is shown as done.
 */
export function LiveAccount() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [first, setFirst] = useState('');
  const [father, setFather] = useState('');
  const [saved, setSaved] = useState({ first: '', father: '' });
  const [nameError, setNameError] = useState<string>();
  const [savingName, setSavingName] = useState(false);
  const [phone, setPhone] = useState('');
  const [newPhone, setNewPhone] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const db = supabase();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) {
        router.replace('/login?next=/account');
        return;
      }
      setPhone((user.phone ?? '').replace(/\D/g, '').slice(-9));
      const { data } = await db
        .from('profiles')
        .select('first_name, father_name')
        .eq('id', user.id)
        .maybeSingle();
      setFirst(data?.first_name ?? '');
      setFather(data?.father_name ?? '');
      setSaved({ first: data?.first_name ?? '', father: data?.father_name ?? '' });
      setLoaded(true);
    })();
  }, [router]);

  const saveName = async () => {
    const next = { first: cleanName(first), father: cleanName(father) };
    if (!next.first) return setNameError('اكتب اسمك الأول');
    setSavingName(true);
    const db = supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    const { error } = user
      ? await db
          .from('profiles')
          .update({
            first_name: next.first,
            father_name: next.father,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      : { error: new Error('signed out') };
    setSavingName(false);
    if (error) return setNameError('ما قدرنا نحفظ اسمك، حاول مرة ثانية');
    setFirst(next.first);
    setFather(next.father);
    setSaved(next);
    setToast('حفظنا اسمك');
  };

  const sendCode = async () => {
    if (newPhone === null) return;
    if (!isSaudiMobile(newPhone)) return setPhoneError('رقم الجوال يبدأ بـ 5 ويتكون من 9 أرقام');
    if (newPhone === phone) return setPhoneError('هذا رقمك الحالي');
    setBusy(true);
    setPhoneError(undefined);
    const { error } = await supabase().auth.updateUser({ phone: `+966${newPhone}` });
    setBusy(false);
    if (error) {
      return setPhoneError(
        error.status === 429
          ? 'طلبت رموز كثيرة، انتظر دقيقة وحاول'
          : /already|registered|exists/i.test(error.message)
            ? 'هذا الرقم مسجّل في حساب ثاني'
            : 'ما قدرنا نرسل الرمز، حاول بعد شوي',
      );
    }
    setCode('');
    setCodeSent(true);
  };

  const confirmCode = async () => {
    if (newPhone === null || code.length !== 6) return;
    setBusy(true);
    const { error } = await supabase().auth.verifyOtp({
      phone: `+966${newPhone}`,
      token: code,
      type: 'phone_change',
    });
    setBusy(false);
    if (error) {
      setCode('');
      return setPhoneError('الرمز غير صحيح أو انتهت صلاحيته');
    }
    setPhone(newPhone);
    setNewPhone(null);
    setCodeSent(false);
    setToast('تغيّر رقمك، والدخول صار به');
  };

  const nameChanged = cleanName(first) !== saved.first || cleanName(father) !== saved.father;
  const shownName = [cleanName(first), cleanName(father) && `بن ${cleanName(father)}`]
    .filter(Boolean)
    .join(' ');

  return (
    <AppShell need="member" title="حسابي">
      <div className="grid gap-6">
        <Panel title="اسمك" icon="badge">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="الاسم الأول"
              value={first}
              maxLength={40}
              disabled={!loaded}
              error={nameError}
              onChange={(e) => {
                setFirst(e.target.value);
                setNameError(undefined);
              }}
            />
            <Field
              label="اسم الأب"
              value={father}
              maxLength={40}
              disabled={!loaded}
              onChange={(e) => setFather(e.target.value)}
            />
            {shownName ? (
              <p className="rounded-xl bg-surface-low px-4 py-2.5 text-body text-ink-soft sm:col-span-2">
                يظهر اسمك لأهلك: <strong className="text-forest">{shownName}</strong>
              </p>
            ) : null}
            <Button
              size="sm"
              className="justify-self-start"
              disabled={!loaded || !cleanName(first) || !nameChanged || savingName}
              onClick={() => void saveName()}
            >
              {savingName ? 'نحفظ…' : 'حفظ'}
            </Button>
          </div>
        </Panel>

        <Panel title="رقم الجوال" icon="phone_iphone">
          <div className="grid gap-4 p-5">
            {newPhone === null ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span dir="ltr" className="text-title font-semibold tracking-wider text-forest">
                  {phone ? `+966 ${grouped(phone)}` : '—'}
                </span>
                <Button size="sm" variant="quiet" disabled={!loaded} onClick={() => setNewPhone('')}>
                  تغيير الرقم
                </Button>
              </div>
            ) : (
              <div className="grid max-w-md gap-3">
                <PhoneField
                  value={newPhone}
                  onChange={(v) => {
                    setNewPhone(v);
                    setCodeSent(false);
                    setPhoneError(undefined);
                  }}
                  error={phoneError}
                  hint="نرسل رمزًا للرقم الجديد للتأكد منه"
                />
                {codeSent ? (
                  <>
                    <OtpField value={code} onChange={setCode} invalid={!!phoneError} />
                    <Button size="sm" disabled={code.length < 6 || busy} onClick={confirmCode}>
                      {busy ? 'نتحقق…' : 'تأكيد الرقم الجديد'}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" disabled={busy} onClick={sendCode}>
                    {busy ? 'نرسل الرمز…' : 'أرسل الرمز'}
                  </Button>
                )}
                <button
                  type="button"
                  className="justify-self-start text-caption font-semibold text-muted hover:underline"
                  onClick={() => {
                    setNewPhone(null);
                    setCodeSent(false);
                    setPhoneError(undefined);
                  }}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="أشجاري" icon="forest">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-body text-ink-soft">الأشجار اللي أنت فيها، مالكًا أو مدققًا أو مساهمًا.</p>
            <Link href="/trees" className={buttonClass('quiet', 'sm')}>
              أشجاري
              <Icon name="arrow_back" />
            </Link>
          </div>
        </Panel>

        <Panel title="الإشعارات" icon="notifications">
          <NoticeSettings live onSaved={() => setToast('حفظنا اختيارك')} />
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/40 bg-card p-5">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-body font-semibold text-forest hover:underline"
            onClick={async () => {
              stopSaving();
              closeLive();
              forgetKeys();
              await supabase().auth.signOut();
              router.replace('/');
              router.refresh();
            }}
          >
            <Icon name="logout" />
            تسجيل الخروج
          </button>
        </div>

        <Panel title="حذف الحساب" icon="person_remove" tone="danger">
          {loaded ? (
            <DeleteAccount
              phone={phone}
              onDeleted={async () => {
                stopSaving();
                closeLive();
                forgetKeys();
                await supabase().auth.signOut({ scope: 'local' });
                router.replace('/');
                router.refresh();
              }}
            />
          ) : null}
        </Panel>
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}
