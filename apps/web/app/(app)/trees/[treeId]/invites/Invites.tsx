'use client';

import { Button, Chip, Icon, cn } from '@sulalah/ui';
import { useEffect, useState } from 'react';
import { AppShell, EmptyState, Toast } from '@/components/AppShell';
import { ShareSheet } from '@/components/tree/ShareSheet';
import { listLinks, stopLink, type Link as LiveLink } from '@/lib/collab-cloud';
import { byId, liveTree, logEntry, num, update, useDemo, type Invite } from '@/lib/demo-store';

const statusChip: Record<Invite['status'], [string, 'success' | 'neutral' | 'danger']> = {
  active: ['فعّال', 'success'],
  expired: ['منتهي', 'neutral'],
  stopped: ['موقوف', 'danger'],
  'used-up': ['اكتمل', 'neutral'],
};

const kindLabel: Record<Invite['kind'], [string, string]> = {
  contribute: ['رابط مساهمة', 'group_add'],
  view: ['رابط مشاهدة', 'visibility'],
  review: ['رابط مدقق', 'verified_user'],
};

const asInvite = (l: LiveLink): Invite => ({
  id: l.id,
  kind: l.kind,
  scope: l.branch ?? 'all',
  used: l.used,
  maxUses: l.maxUses,
  expiresInDays: Math.max(0, Math.ceil((Date.parse(l.expiresAt) - Date.now()) / 86_400_000)),
  status: l.status,
  url: l.url,
});

/** S21: every invite link, with how it is being used. */
export function Invites() {
  const s = useDemo();
  const [making, setMaking] = useState(false);
  const [stopping, setStopping] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !!liveTree());
  const m = byId(s.people);
  const live = liveTree();

  // A real tree's links live on the server; the list is read fresh each visit.
  useEffect(() => {
    const t = liveTree();
    if (!t) return;
    let gone = false;
    listLinks(t.treeId, s.treeKey!)
      .then((links) => {
        if (!gone) update((st) => ({ ...st, invites: links.map(asInvite) }));
      })
      .catch(() => !gone && setToast('تعذّر تحميل الروابط'))
      .finally(() => !gone && setLoading(false));
    return () => {
      gone = true;
    };
  }, [s.treeKey]);

  const copy = async (inv: Invite) => {
    try {
      await navigator.clipboard.writeText(inv.url ?? `https://sulalah.app/i/${inv.id.slice(-6)}`);
      setToast('نسخنا الرابط');
    } catch {
      setToast('تعذّر النسخ');
    }
  };

  const stop = async (inv: Invite) => {
    if (live) {
      try {
        await stopLink(live.treeId, {
          id: inv.id,
          kind: inv.kind,
          branch: null,
          used: inv.used,
          expiresAt: '',
          status: inv.status,
        });
      } catch {
        setToast('ما قدرنا نوقف الرابط، حاول مرة ثانية');
        return;
      }
    }
    update((st) => ({
      ...st,
      invites: st.invites.map((x) => (x.id === inv.id ? { ...x, status: 'stopped' } : x)),
      log: live ? [logEntry('invite', `أوقف ${kindLabel[inv.kind][0]}`), ...st.log] : st.log,
    }));
    setStopping(null);
    setToast('أوقفنا الرابط');
  };

  return (
    <AppShell
      need="invite.manage"
      title="روابط الدعوة"
      subtitle="رابط المساهمة يدخل به القريب ويضيف في غصنه. رابط المشاهدة للتصفح فقط."
      actions={
        <Button size="sm" onClick={() => setMaking(true)}>
          <Icon name="add_link" />
          رابط جديد
        </Button>
      }
    >
      {loading ? (
        <p role="status" className="py-10 text-center text-body text-muted">
          نجيب الروابط…
        </p>
      ) : s.invites.length ? (
        <ul className="grid gap-3">
          {s.invites.map((inv) => {
            const [label, tone] = statusChip[inv.status];
            return (
              <li
                key={inv.id}
                className={cn(
                  'grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[auto_1fr_auto] md:items-center md:p-5',
                  inv.status === 'active' ? 'border-line/40' : 'border-line/30 opacity-75',
                )}
              >
                <span
                  className={cn(
                    'flex size-11 items-center justify-center rounded-xl',
                    inv.kind === 'view' ? 'bg-surface text-forest' : 'bg-forest text-gold-light',
                  )}
                >
                  <Icon name={kindLabel[inv.kind][1]} />
                </span>
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-forest">
                    {kindLabel[inv.kind][0]}
                    <Chip tone="olive">
                      {inv.scope === 'all' ? 'الشجرة كاملة' : `غصن ${m.get(inv.scope)?.name}`}
                    </Chip>
                    <Chip tone={tone}>{label}</Chip>
                  </p>
                  <p className="text-caption text-muted">
                    استُخدم {num(inv.used)} {inv.used === 1 ? 'مرة' : 'مرات'}
                    {inv.maxUses ? ` من ${num(inv.maxUses)}` : ''}،{' '}
                    {inv.status === 'expired'
                      ? 'انتهت صلاحيته'
                      : inv.status === 'stopped' || inv.status === 'used-up'
                        ? 'ما يقبل أحدًا جديدًا'
                      : inv.expiresInDays === 1
                        ? 'ينتهي بكرة'
                        : `ينتهي بعد ${num(inv.expiresInDays)} أيام`}
                  </p>
                  {inv.maxUses ? (
                    <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-high">
                      <div
                        className="h-full rounded-full bg-olive"
                        style={{ width: `${Math.min(100, (inv.used / inv.maxUses) * 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                {inv.status === 'active' ? (
                  stopping === inv.id ? (
                    <div className="flex items-center gap-2 rounded-xl bg-danger-soft p-2">
                      <span className="text-caption text-danger">يتوقف الرابط فورًا</span>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void stop(inv)}
                      >
                        أوقفه
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStopping(null)}>
                        لا
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="quiet"
                        disabled={live ? !inv.url : false}
                        onClick={() => copy(inv)}
                      >
                        <Icon name="content_copy" />
                        نسخ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => setStopping(inv.id)}
                      >
                        إيقاف
                      </Button>
                    </div>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon="link"
          title="ما عندك روابط بعد"
          body="أنشئ رابطًا وأرسله في قروب العائلة."
        />
      )}
      {making ? <ShareSheet onClose={() => setMaking(false)} onCopied={setToast} /> : null}
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}
