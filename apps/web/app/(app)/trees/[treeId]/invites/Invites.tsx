'use client';

import { Button, Chip, Icon, cn } from '@sulalah/ui';
import { useState } from 'react';
import { AppShell, EmptyState, Toast } from '@/components/AppShell';
import { ShareSheet } from '@/components/tree/ShareSheet';
import { byId, num, update, useDemo, type Invite } from '@/lib/demo-store';

const statusChip: Record<Invite['status'], [string, 'success' | 'neutral' | 'danger']> = {
  active: ['فعّال', 'success'],
  expired: ['منتهي', 'neutral'],
  stopped: ['موقوف', 'danger'],
};

/** S21: every invite link, with how it is being used. */
export function Invites() {
  const s = useDemo();
  const [making, setMaking] = useState(false);
  const [stopping, setStopping] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const m = byId(s.people);

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`https://sulalah.app/i/${id.slice(-6)}`);
      setToast('نسخنا الرابط');
    } catch {
      setToast('تعذّر النسخ');
    }
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
      {s.invites.length ? (
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
                    inv.kind === 'contribute'
                      ? 'bg-forest text-gold-light'
                      : 'bg-surface text-forest',
                  )}
                >
                  <Icon name={inv.kind === 'contribute' ? 'group_add' : 'visibility'} />
                </span>
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-forest">
                    {inv.kind === 'contribute' ? 'رابط مساهمة' : 'رابط مشاهدة'}
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
                        onClick={() => {
                          update((st) => ({
                            ...st,
                            invites: st.invites.map((x) =>
                              x.id === inv.id ? { ...x, status: 'stopped' } : x,
                            ),
                          }));
                          setStopping(null);
                          setToast('أوقفنا الرابط');
                        }}
                      >
                        أوقفه
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStopping(null)}>
                        لا
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="quiet" onClick={() => copy(inv.id)}>
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
