'use client';

import { Icon, cn } from '@sulalah/ui';
import Link from 'next/link';
import { AppShell, EmptyState } from '@/components/AppShell';
import { planLimits, lineage, num, update, useDemo } from '@/lib/demo-store';

/** S19: what happened on my trees, newest first. */
export function Notifications() {
  const s = useDemo();
  const unread = s.notices.filter((n) => n.unread).length;
  const used = lineage(s.people).length;
  const limit = planLimits(s).maxPersons;
  const near = used / limit >= 0.9;
  const read = (id?: string) =>
    update((st) => ({ ...st, notices: st.notices.map((n) => (!id || n.id === id ? { ...n, unread: false } : n)) }));

  return (
    <AppShell
      title="الإشعارات"
      subtitle={unread ? `${num(unread)} غير مقروءة` : 'كلها مقروءة'}
      actions={
        unread ? (
          <button type="button" onClick={() => read()} className="text-caption font-semibold text-olive hover:underline">
            تحديد الكل كمقروء
          </button>
        ) : null
      }
    >
      {near ? (
        <p className="mb-4 flex items-center gap-2 rounded-2xl border border-pending/40 bg-pending-soft p-4 text-body text-pending">
          <Icon name="warning" />
          اقتربت من حد الباقة: {num(used)} من {num(limit)}
        </p>
      ) : null}
      {s.notices.length ? (
        <ul className="grid overflow-hidden rounded-2xl border border-line/40 bg-card">
          {s.notices.map((n) => (
            <li key={n.id} className="border-b border-line/30 last:border-0">
              <Link
                href={n.href ?? '#'}
                onClick={() => read(n.id)}
                className={cn('flex items-start gap-3 p-4 transition hover:bg-surface-low', n.unread && 'bg-olive-soft/20')}
              >
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', n.unread ? 'bg-forest text-gold-light' : 'bg-surface text-muted')}>
                  <Icon name={n.icon} />
                </span>
                <span className="grid flex-1 gap-0.5">
                  <span className={cn('text-body', n.unread ? 'font-semibold text-ink' : 'text-ink-soft')}>{n.text}</span>
                  <span className="text-caption text-muted">{n.at}</span>
                </span>
                {n.unread ? <span className="mt-2 size-2.5 shrink-0 rounded-full bg-pending" aria-label="غير مقروء" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="notifications_off" title="ما فيه إشعارات" body="لما ترسل العائلة إضافات أو تُعتمد إضافاتك، يوصلك خبر هنا." />
      )}
    </AppShell>
  );
}
