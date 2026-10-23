'use client';

import { Button, Field, Icon, Segmented, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AppShell, Panel, Toast } from '@/components/AppShell';
import { TreeData } from '@/components/tree/TreeData';
import {
  TREE_ID,
  joinedMembers,
  resetDemo,
  transferOwnership,
  update,
  useDemo,
  type Settings,
} from '@/lib/demo-store';

function Toggle({
  label,
  hint,
  on,
  locked,
  onChange,
}: {
  label: string;
  hint: ReactNode;
  on: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/30 px-5 py-4 last:border-0">
      <span className="grid gap-0.5">
        <span className="flex items-center gap-1.5 text-body font-semibold text-ink">
          {label}
          {locked ? <Icon name="lock" className="text-[1rem] text-muted" /> : null}
        </span>
        <span className="text-caption leading-relaxed text-muted">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={locked}
        onClick={() => onChange?.(!on)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60',
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
    </div>
  );
}

/** S20: the owner's settings for one tree. */
export function TreeSettings() {
  const s = useDemo();
  const router = useRouter();
  const [title, setTitle] = useState(s.tree.title);
  const [family, setFamily] = useState(s.tree.family);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [heir, setHeir] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const set = (patch: Partial<Settings>) => {
    update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
    setToast('حفظنا الإعداد');
  };

  return (
    <AppShell need="tree.manage" title="إعدادات الشجرة" subtitle={s.tree.title}>
      <div className="grid gap-6">
        <Panel title="عام" icon="tune">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="اسم الشجرة" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Field label="اسم العائلة" value={family} onChange={(e) => setFamily(e.target.value)} />
            <div className="grid gap-1.5 md:col-span-2">
              <span className="text-body font-medium text-ink">الجد المؤسس والأجداد فوقه</span>
              <p className="rounded-xl border border-line/50 bg-surface-low px-4 py-3 font-title text-title text-forest">
                {[s.people.find((p) => p.id === s.tree.rootId)?.name, ...s.tree.ancestors]
                  .filter(Boolean)
                  .join(' بن ')}
              </p>
            </div>
            <Button
              size="sm"
              className="justify-self-start"
              disabled={!title.trim() || !family.trim()}
              onClick={() => {
                update((st) => ({
                  ...st,
                  tree: { ...st.tree, title: title.trim(), family: family.trim() },
                }));
                setToast('حفظنا التغييرات');
              }}
            >
              حفظ
            </Button>
          </div>
        </Panel>

        <Panel title="الخصوصية" icon="shield">
          <div className="grid gap-2 border-b border-line/30 px-5 py-4">
            <span className="text-body font-semibold text-ink">من يقدر يشوف الشجرة؟</span>
            <Segmented
              label="من يقدر يشوف الشجرة"
              value={s.settings.viewers}
              onChange={(v) => set({ viewers: v })}
              options={[
                { value: 'members', label: 'أهل الشجرة فقط' },
                { value: 'link', label: 'ومن معه رابط المشاهدة' },
              ]}
            />
          </div>
          <Toggle
            label="إظهار أسماء البنات للزوار"
            hint="إذا أطفأته، تظهر للزوار ورقة باسم «ابنة» بدل الاسم. أهل الشجرة يشوفون الأسماء دائمًا."
            on={s.settings.showDaughtersToVisitors}
            onChange={(v) => set({ showDaughtersToVisitors: v })}
          />
          <Toggle
            label="إظهار المتوفين"
            hint="يظهرون بلون ذابل مع «رحمه الله»."
            on={s.settings.showDeceased}
            onChange={(v) => set({ showDeceased: v })}
          />
          <Toggle
            label="إظهار سنوات الميلاد"
            hint="في الملف الشخصي فقط، وليس على الشجرة."
            on={s.settings.showBirthYears}
            onChange={(v) => set({ showBirthYears: v })}
          />
          <p className="flex items-center justify-between gap-2 px-5 py-3 text-caption">
            <span className="text-muted">جرّب كيف يشوفها الزائر</span>
            <Link
              href={`/trees/${TREE_ID}?as=visitor`}
              className="font-semibold text-olive hover:underline"
            >
              عرض كزائر
            </Link>
          </p>
        </Panel>

        <Panel title="المساهمات" icon="fact_check">
          <Toggle
            label="الاعتماد مطلوب دائمًا"
            hint="ما يثبت أي اسم في الشجرة بدون اعتماد منك أو من مدقق. هذا أساس ثقة العائلة في الشجرة، فما يمكن إطفاؤه."
            on
            locked
          />
        </Panel>

        <TreeData onToast={setToast} />

        <Panel title="السجل" icon="history">
          <Link
            href={`/trees/${TREE_ID}/activity`}
            className="flex items-center justify-between border-b border-line/30 px-5 py-4 hover:bg-surface-low"
          >
            <span className="grid">
              <span className="text-body font-semibold text-ink">سجل النشاط</span>
              <span className="text-caption text-muted">كل إضافة وتعديل واعتماد، ومن سواه</span>
            </span>
            <Icon name="chevron_left" className="text-muted" />
          </Link>
          <button
            type="button"
            onClick={() => {
              resetDemo();
              setToast('رجّعنا العائلة التجريبية لبدايتها');
            }}
            className="flex w-full items-center justify-between px-5 py-4 text-start hover:bg-surface-low"
          >
            <span className="grid">
              <span className="text-body font-semibold text-ink">إعادة العائلة التجريبية</span>
              <span className="text-caption text-muted">
                للتجربة فقط: يمسح ما أضفته في هذا المتصفح
              </span>
            </span>
            <Icon name="restart_alt" className="text-muted" />
          </button>
        </Panel>

        <Panel title="منطقة الخطر" icon="warning" tone="danger">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/15 px-5 py-4">
            <span className="grid">
              <span className="text-body font-semibold text-ink">نقل الملكية</span>
              <span className="text-caption text-muted">
                تصير مدققًا، ويصير المالك الجديد هو من يدفع ويدير.
              </span>
            </span>
            {!transferring ? (
              <Button size="sm" variant="secondary" onClick={() => setTransferring(true)}>
                انقل الملكية
              </Button>
            ) : null}
          </div>
          {transferring ? (
            <div className="grid animate-rise gap-3 border-b border-danger/15 bg-surface-low/60 px-5 py-4">
              <label className="grid gap-1.5">
                <span className="text-body font-medium text-ink">المالك الجديد</span>
                <select
                  value={heir}
                  onChange={(e) => setHeir(e.target.value)}
                  className="h-11 rounded-xl border border-line/70 bg-card px-3 text-body"
                >
                  <option value="">اختر من أهل الشجرة</option>
                  {joinedMembers.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <span className="text-caption text-muted">
                  يظهر هنا فقط من انضم للشجرة برقم جواله.
                </span>
              </label>
              {heir ? (
                <p className="rounded-xl border border-pending/40 bg-pending-soft p-3 text-caption leading-relaxed text-pending">
                  يصير {heir} المالك: يدفع الباقة ويعتمد ويدير المدققين. وأنت تبقى مدققًا للشجرة
                  كاملة، وما تقدر ترجع الملكية إلا إذا نقلها لك.
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={!heir}
                  onClick={() => {
                    transferOwnership(heir);
                    router.push(`/trees/${TREE_ID}`);
                  }}
                >
                  انقلها لـ {heir || '…'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setTransferring(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="grid">
                <span className="text-body font-semibold text-danger">حذف الشجرة</span>
                <span className="text-caption text-muted">
                  تُحذف الشجرة وكل أسمائها نهائيًا، ولا يمكن التراجع.
                </span>
              </span>
              {!deleting ? (
                <Button size="sm" variant="danger" onClick={() => setDeleting(true)}>
                  احذف الشجرة
                </Button>
              ) : null}
            </div>
            {deleting ? (
              <div className="grid animate-rise gap-2 rounded-xl border border-danger/30 bg-danger-soft p-4">
                <Field
                  label={`اكتب «${s.tree.title}» للتأكيد`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={confirm.trim() !== s.tree.title}
                    onClick={() => router.push('/trees')}
                  >
                    احذفها نهائيًا
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}
