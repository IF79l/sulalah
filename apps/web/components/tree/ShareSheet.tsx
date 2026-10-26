'use client';

import { Button, Icon, IconButton, Segmented, Sheet, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useState } from 'react';
import { makeLink } from '@/lib/collab-cloud';
import {
  currentTreeId,
  childrenOf,
  liveTree,
  logEntry,
  newId,
  update,
  useDemo,
} from '@/lib/demo-store';

type Kind = 'contribute' | 'view' | 'review';
const days = { day: 1, week: 7, month: 30 } as const;

const kinds = [
  [
    'contribute',
    'group_add',
    'رابط مساهمة',
    'يدخل القريب برقم جواله، يختار غصنه، ويضيف أبناءه وأحفاده. إضافاته تنتظر اعتمادك.',
  ],
  [
    'view',
    'visibility',
    'رابط مشاهدة',
    'للتصفح فقط بدون تسجيل دخول، ويلتزم بإعدادات الخصوصية.',
  ],
  [
    'review',
    'verified_user',
    'رابط مدقق',
    'من يدخل به يصير مدققًا يعتمد الإضافات في النطاق اللي تحدده، ويأخذ مقعدًا من باقتك.',
  ],
] as const;

/** S21: make a contribution, view or reviewer link and send it to the family group. */
export function ShareSheet({
  onClose,
  onCopied,
  only,
}: {
  onClose: () => void;
  onCopied: (t: string) => void;
  /** Offer just these kinds; the reviewers page asks for reviewer links only. */
  only?: Kind[];
}) {
  const s = useDemo();
  const offered = kinds.filter(([k]) => (only ? only.includes(k) : k !== 'review'));
  const [kind, setKind] = useState<Kind | null>(offered.length === 1 ? offered[0]![0] : null);
  const [expiry, setExpiry] = useState<keyof typeof days>('week');
  const [uses, setUses] = useState<'1' | '10' | '50' | 'open'>(only?.includes('review') ? '1' : '50');
  const [scope, setScope] = useState<string>('all');
  const [link, setLink] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string>();

  const branches = childrenOf(s.people, s.tree.rootId).filter((p) => p.gender === 'male');
  const message =
    kind === 'view'
      ? `هذي ${s.tree.title}، تقدرون تتصفحونها من هنا: ${link}`
      : kind === 'review'
        ? `أبيك مدققًا معي في ${s.tree.title}، تعتمد إضافات العائلة: ${link}`
        : `حيّاكم تساهمون في ${s.tree.title}، اختار غصنك وأضف أبناءك: ${link}`;

  const make = async () => {
    if (!kind) return;
    const maxUses = uses === 'open' || kind === 'view' ? undefined : Number(uses);
    const live = liveTree();
    if (!live) {
      const id = newId('inv');
      update((st) => ({
        ...st,
        invites: [
          { id, kind, scope, used: 0, maxUses, expiresInDays: days[expiry], status: 'active' },
          ...st.invites,
        ],
      }));
      setLink(`https://sulalah.app/i/${id.slice(-6)}`);
      return;
    }
    setMaking(true);
    setError(undefined);
    try {
      const made = await makeLink(live.treeId, s.treeKey!, {
        kind,
        branch: scope === 'all' || kind === 'view' ? null : scope,
        maxUses,
        days: days[expiry],
      });
      // A view link opens the tree to visitors; the server built their copy before answering.
      update((st) => ({
        ...st,
        settings: kind === 'view' ? { ...st.settings, viewers: 'link' } : st.settings,
        invites: [
          {
            id: made.id,
            kind,
            scope,
            used: 0,
            maxUses,
            expiresInDays: days[expiry],
            status: 'active',
            url: made.url,
          },
          ...st.invites,
        ],
        log: [
          logEntry(
            'invite',
            kind === 'view' ? 'أنشأ رابط مشاهدة' : kind === 'review' ? 'أنشأ رابط مدقق' : 'أنشأ رابط مساهمة',
          ),
          ...st.log,
        ],
      }));
      setLink(made.url ?? null);
    } catch {
      setError('ما قدرنا ننشئ الرابط، تأكد من اتصالك وحاول مرة ثانية');
    } finally {
      setMaking(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link ?? '');
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto p-5">
        {!link ? (
          <>
            <div className="grid gap-2.5" role="radiogroup" aria-label="نوع الرابط">
              {offered.map(([k, icon, title, body]) => (
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
                {kind !== 'view' ? (
                  <>
                    <div className="grid gap-1.5">
                      <span className="text-caption font-semibold text-ink">عدد مرات الاستخدام</span>
                      <Segmented
                        label="عدد مرات الاستخدام"
                        value={uses}
                        onChange={setUses}
                        options={
                          kind === 'review'
                            ? [
                                { value: '1', label: 'شخص واحد' },
                                { value: '10', label: '10' },
                              ]
                            : [
                                { value: '10', label: '10' },
                                { value: '50', label: '50' },
                                { value: 'open', label: 'بلا حد' },
                              ]
                        }
                      />
                    </div>
                    <label className="grid gap-1.5">
                      <span className="text-caption font-semibold text-ink">
                        {kind === 'review' ? 'يراجع' : 'النطاق'}
                      </span>
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
                {kind === 'view' && s.settings.viewers === 'members' ? (
                  <p className="flex items-start gap-2 text-caption leading-relaxed text-muted">
                    <Icon name="info" className="mt-0.5 text-[1rem]" />
                    الشجرة الآن لأهلها فقط. إنشاء الرابط يفتحها لمن معه رابط مشاهدة، وتقدر تقفلها
                    من الإعدادات متى ما بغيت.
                  </p>
                ) : null}
                {error ? <p className="text-caption text-danger">{error}</p> : null}
                <Button className="mt-1 rounded-xl" disabled={making} onClick={make}>
                  <Icon name="link" />
                  {making ? 'ننشئ الرابط…' : 'أنشئ الرابط'}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] animate-rise gap-4">
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
              <p className="rounded-2xl rounded-ss-sm bg-[#e7f3e1] p-3 text-body leading-relaxed text-ink [overflow-wrap:anywhere]">{message}</p>
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
