'use client';

import { Icon, cn } from '@sulalah/ui';
import { useEffect, useState } from 'react';
import { update, useDemo, type DemoState } from '@/lib/demo-store';
import { supabase } from '@/lib/supabase/client';

type Prefs = Pick<DemoState['me'], 'notify' | 'muted'>;
type Topic = Prefs['muted'][number];

const topics: { id: Topic; label: string; hint: string }[] = [
  {
    id: 'review',
    label: 'الإضافات والمراجعة',
    hint: 'إضافات جديدة تنتظر مراجعتك، ونتيجة مراجعة إضافاتك',
  },
  { id: 'members', label: 'أفراد الشجرة', hint: 'من انضم، ودورك إذا تغيّر، ونقل الملكية' },
  { id: 'billing', label: 'الباقة والدفع', hint: 'الفواتير، وتعذّر التجديد، وقرب انتهاء الباقة' },
];

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        on ? 'bg-forest' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-1 size-5 rounded-full bg-card shadow transition-all',
          on ? 'start-6' : 'start-1',
        )}
      />
    </button>
  );
}

/**
 * WhatsApp notices: on or off, and which topics. Everything still shows in the app's own
 * list; the login code comes on WhatsApp whatever is chosen here.
 */
export function NoticeSettings({ live, onSaved }: { live?: boolean; onSaved: () => void }) {
  const s = useDemo();
  const [prefs, setPrefs] = useState<Prefs>({ notify: s.me.notify, muted: s.me.muted });
  const [failed, setFailed] = useState(false);

  // On a real account the choice lives on the profile, not in the open tree.
  useEffect(() => {
    if (!live) return;
    void (async () => {
      const db = supabase();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return;
      const { data } = await db
        .from('profiles')
        .select('notify, notify_muted')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setPrefs({ notify: data.notify, muted: data.notify_muted });
    })();
  }, [live]);

  const save = async (next: Prefs) => {
    const was = prefs;
    setPrefs(next);
    setFailed(false);
    update((st) => ({ ...st, me: { ...st.me, ...next } }));
    if (live) {
      const db = supabase();
      const {
        data: { user },
      } = await db.auth.getUser();
      const { error } = user
        ? await db
            .from('profiles')
            .update({
              notify: next.notify,
              notify_muted: next.muted,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        : { error: new Error('signed out') };
      if (error) {
        setPrefs(was);
        update((st) => ({ ...st, me: { ...st.me, ...was } }));
        setFailed(true);
        return;
      }
    }
    onSaved();
  };

  const on = prefs.notify === 'whatsapp';
  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-line/30 px-5 py-4">
        <span className="flex items-start gap-3">
          <Icon name="chat" className="mt-0.5 text-olive" />
          <span className="grid gap-0.5">
            <span className="text-body font-semibold text-ink">تنبيهات واتساب</span>
            <span className="text-caption leading-relaxed text-muted">
              نرسلها من رقم سُلالة الرسمي إلى رقمك المسجّل. وتقدر توقفها أيضًا بالرد "إيقاف".
            </span>
          </span>
        </span>
        <Switch
          label="تنبيهات واتساب"
          on={on}
          onChange={() => void save({ ...prefs, notify: on ? 'app' : 'whatsapp' })}
        />
      </div>
      {on ? (
        topics.map((t) => {
          const wanted = !prefs.muted.includes(t.id);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 border-b border-line/30 px-5 py-3.5 ps-14 last:border-0"
            >
              <span className="grid gap-0.5">
                <span className="text-body text-ink">{t.label}</span>
                <span className="text-caption text-muted">{t.hint}</span>
              </span>
              <Switch
                label={t.label}
                on={wanted}
                onChange={() =>
                  void save({
                    ...prefs,
                    muted: wanted ? [...prefs.muted, t.id] : prefs.muted.filter((m) => m !== t.id),
                  })
                }
              />
            </div>
          );
        })
      ) : (
        <p className="px-5 py-4 text-caption leading-relaxed text-muted">
          التنبيهات تظهر داخل التطبيق فقط. رمز الدخول يوصلك على واتساب دائمًا.
        </p>
      )}
      {failed ? (
        <p role="alert" className="px-5 pb-4 text-caption font-semibold text-danger">
          ما قدرنا نحفظ اختيارك، جرّب مرة ثانية.
        </p>
      ) : null}
    </div>
  );
}
