'use client';

import { Button, Icon, IconButton, Segmented, Sheet, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import {
  currentTreeId,
  childrenOf,
  newId,
  update,
  useDemo,
} from '@/lib/demo-store';

type Kind = 'contribute' | 'view';
const days = { day: 1, week: 7, month: 30 } as const;

/** S21: make a contribution or view link and send it to the family group. */
export function ShareSheet({ onClose, onCopied }: { onClose: () => void; onCopied: (t: string) => void }) {
  const s = useDemo();
  const [kind, setKind] = useState<Kind | null>(null);
  const [expiry, setExpiry] = useState<keyof typeof days>('week');
  const [uses, setUses] = useState<'10' | '50' | 'open'>('50');
  const [scope, setScope] = useState<string>('all');
  const [made, setMade] = useState<string | null>(null);

  const branches = childrenOf(s.people, s.tree.rootId).filter((p) => p.gender === 'male');
  const link = made ? `https://sulalah.app/i/${made.slice(-6)}` : '';
  const message =
    kind === 'view'
      ? `هذي ${s.tree.title}، تقدرون تتصفحونها من هنا: ${link}`
      : `حيّاكم تساهمون في ${s.tree.title}، اختار غصنك وأضف أبناءك: ${link}`;

  const make = () => {
    const id = newId('inv');
    update((st) => ({
      ...st,
      invites: [
        {
          id,
          kind: kind!,
          scope,
          used: 0,
          maxUses: uses === 'open' ? undefined : Number(uses),
          expiresInDays: days[expiry],
          status: 'active',
        },
        ...st.invites,
      ],
    }));
    setMade(id);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onCopied('نسخنا الرابط');
    } catch {
      onCopied('تعذّر النسخ، انسخه يدويًا');
    }
  };

  return (
    <Sheet label="ادعُ العائلة">
      <div className="flex items-center justify-between border-b border-line/25 bg-surface-low/60 px-4 py-2.5">
        <span className="flex items-center gap-2 text-body font-semibold text-forest">
          <Icon name="share" className="text-olive" />
          ادعُ العائلة
        </span>
        <IconButton label="إغلاق" className="size-8" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>

      <div className="grid gap-4 overflow-y-auto p-5">
        {!made ? (
          <>
            <div className="grid gap-2.5" role="radiogroup" aria-label="نوع الرابط">
              {(
                [
                  ['contribute', 'group_add', 'رابط مساهمة', 'يدخل القريب برقم جواله، يختار غصنه، ويضيف أبناءه وأحفاده. إضافاته تنتظر اعتمادك.'],
                  ['view', 'visibility', 'رابط مشاهدة', 'للتصفح فقط بدون تسجيل دخول، ويلتزم بإعدادات الخصوصية.'],
                ] as const
              ).map(([k, icon, title, body]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border p-4 text-start transition',
                    kind === k ? 'border-forest bg-olive-soft/40 ring-2 ring-forest/10' : 'border-line/50 hover:border-gold-light',
                  )}
                >
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', kind === k ? 'bg-forest text-gold-light' : 'bg-surface text-forest')}>
                    <Icon name={icon} />
                  </span>
                  <span className="grid gap-1">
                    <span className="text-title font-semibold text-forest">{title}</span>
                    <span className="text-caption leading-relaxed text-ink-soft">{body}</span>
                  </span>
                </button>
              ))}
            </div>

            {kind ? (
              <div className="grid animate-rise gap-3 rounded-2xl border border-line/40 bg-surface-low/60 p-4">
                <div className="grid gap-1.5">
                  <span className="text-caption font-semibold text-ink">مدة الصلاحية</span>
                  <Segmented
                    label="مدة الصلاحية"
                    value={expiry}
                    onChange={setExpiry}
                    options={[
                      { value: 'day', label: 'يوم' },
                      { value: 'week', label: 'أسبوع' },
                      { value: 'month', label: 'شهر' },
                    ]}
                  />
                </div>
                {kind === 'contribute' ? (
                  <>
                    <div className="grid gap-1.5">
                      <span className="text-caption font-semibold text-ink">عدد مرات الاستخدام</span>
                      <Segmented
                        label="عدد مرات الاستخدام"
                        value={uses}
                        onChange={setUses}
                        options={[
                          { value: '10', label: '10' },
                          { value: '50', label: '50' },
                          { value: 'open', label: 'بلا حد' },
                        ]}
                      />
                    </div>
                    <label className="grid gap-1.5">
                      <span className="text-caption font-semibold text-ink">النطاق</span>
                      <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        className="h-11 rounded-xl border border-line/70 bg-card px-3 text-body outline-none focus:border-forest"
                      >
                        <option value="all">الشجرة كاملة</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            غصن {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
                <Button className="mt-1 rounded-xl" onClick={make}>
                  <Icon name="link" />
                  أنشئ الرابط
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="grid animate-rise gap-4">
            <p className="flex items-center gap-2 text-body font-semibold text-success">
              <Icon name="check_circle" fill />
              جهز الرابط
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-line/50 bg-surface-low p-1.5 ps-3">
              <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-body text-forest">
                {link}
              </span>
              <Button size="sm" variant="quiet" onClick={copy}>
                <Icon name="content_copy" />
                نسخ
              </Button>
            </div>
            <div className="grid gap-1.5">
              <span className="text-caption font-semibold text-muted">الرسالة الجاهزة</span>
              <p className="rounded-2xl rounded-ss-sm bg-[#e7f3e1] p-3 text-body leading-relaxed text-ink">{message}</p>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClass('primary'), 'rounded-xl bg-[#1f7a4d] hover:bg-[#186b42]')}
            >
              <Icon name="send" />
              أرسل في واتساب
            </a>
          </div>
        )}

        <Link
          href={`/trees/${currentTreeId()}/invites`}
          className="inline-flex items-center justify-center gap-1 text-caption font-semibold text-olive hover:underline"
        >
          <Icon name="tune" className="text-[1.1em]" />
          إدارة كل الروابط
        </Link>
      </div>
    </Sheet>
  );
}
