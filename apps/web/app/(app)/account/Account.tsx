'use client';

import { Button, Chip, Field, Icon, OtpField, PhoneField, Segmented } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell, Panel, Toast } from '@/components/AppShell';
import { TREE_ID, update, useDemo } from '@/lib/demo-store';

/** S23: my name, my number, my trees, and leaving. */
export function Account() {
  const s = useDemo();
  const [first, setFirst] = useState(s.me.first);
  const [father, setFather] = useState(s.me.father);
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const shown = `${s.me.phone.slice(0, 2)} ${s.me.phone.slice(2, 5)} ${s.me.phone.slice(5)}`;

  return (
    <AppShell need="member" title="حسابي">
      <div className="grid gap-6">
        <Panel title="اسمك" icon="badge">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="الاسم الأول" value={first} onChange={(e) => setFirst(e.target.value)} />
            <Field label="اسم الأب" value={father} onChange={(e) => setFather(e.target.value)} />
            <p className="rounded-xl bg-surface-low px-4 py-2.5 text-body text-ink-soft sm:col-span-2">
              يظهر اسمك:{' '}
              <strong className="text-forest">
                {first} بن {father} {s.tree.family}
              </strong>
            </p>
            <Button
              size="sm"
              className="justify-self-start"
              disabled={!first.trim()}
              onClick={() => {
                update((st) => ({
                  ...st,
                  me: { ...st.me, first: first.trim(), father: father.trim() },
                }));
                setToast('حفظنا اسمك');
              }}
            >
              حفظ
            </Button>
          </div>
        </Panel>

        <Panel title="رقم الجوال" icon="phone_iphone">
          <div className="grid gap-4 p-5">
            {phone === null ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span dir="ltr" className="text-title font-semibold tracking-wider text-forest">
                  +966 {shown}
                </span>
                <Button size="sm" variant="quiet" onClick={() => setPhone('')}>
                  تغيير الرقم
                </Button>
              </div>
            ) : (
              <div className="grid max-w-md gap-3">
                <PhoneField
                  value={phone}
                  onChange={setPhone}
                  hint="نرسل رمزًا للرقم الجديد للتأكد منه"
                />
                {phone.length === 9 ? (
                  <>
                    <OtpField value={code} onChange={setCode} />
                    <Button
                      size="sm"
                      disabled={code.length < 6}
                      onClick={() => {
                        update((st) => ({ ...st, me: { ...st.me, phone } }));
                        setPhone(null);
                        setCode('');
                        setToast('تغيّر رقمك');
                      }}
                    >
                      تأكيد الرقم الجديد
                    </Button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="justify-self-start text-caption font-semibold text-muted hover:underline"
                  onClick={() => setPhone(null)}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="أشجاري" icon="forest">
          <ul>
            {[
              [s.tree.title, 'المالك', `/trees/${TREE_ID}`],
              ['شجرة آل الخالدي', 'مساهم', '/trees/bani-khalid?as=contribute'],
            ].map(([t, role, href]) => (
              <li key={t} className="border-b border-line/30 last:border-0">
                <Link
                  href={href!}
                  className="flex items-center justify-between px-5 py-4 hover:bg-surface-low"
                >
                  <span className="text-body font-semibold text-forest">{t}</span>
                  <Chip tone={role === 'المالك' ? 'forest' : 'olive'}>{role}</Chip>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="الإشعارات" icon="notifications">
          <div className="grid gap-2 p-5">
            <span className="text-body text-ink-soft">كيف يوصلك خبر الإضافات والاعتماد؟</span>
            <div className="max-w-sm">
              <Segmented
                label="طريقة الإشعار"
                value={s.me.notify}
                onChange={(v) => update((st) => ({ ...st, me: { ...st.me, notify: v } }))}
                options={[
                  { value: 'app', label: 'داخل التطبيق' },
                  { value: 'sms', label: 'رسالة نصية' },
                ]}
              />
            </div>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/40 bg-card p-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-body font-semibold text-forest hover:underline"
          >
            <Icon name="logout" />
            تسجيل الخروج
          </Link>
        </div>

        <Panel title="حذف الحساب" icon="person_remove" tone="danger">
          <div className="grid gap-3 p-5">
            <p className="text-body leading-relaxed text-ink-soft">
              أنت مالك {s.tree.title}. قبل حذف حسابك لازم تنقل ملكيتها لأحد من العائلة أو تحذفها،
              عشان ما تضيع على أهلها.
            </p>
            {deleting ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/trees/${TREE_ID}/settings`}
                  className="inline-flex h-9 items-center rounded-full bg-forest px-4 text-caption font-semibold text-ivory"
                >
                  انقل ملكية الشجرة
                </Link>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(false)}>
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="danger"
                className="justify-self-start"
                onClick={() => setDeleting(true)}
              >
                احذف حسابي
              </Button>
            )}
          </div>
        </Panel>
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}
