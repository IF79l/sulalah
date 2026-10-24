'use client';

import { Icon, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell, EmptyState } from '@/components/AppShell';
import { backendOn } from '@/lib/backend';
import { lineage, num, planLimits, update, useDemo, when, type Notice } from '@/lib/demo-store';
import { describe, readNotices, refreshNotices, useNoticeList } from '@/lib/notices';

/** S19: what happened on my trees, newest first. */
export function Notifications() {
  const s = useDemo();
  const liveList = useNoticeList();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (backendOn) refreshNotices().catch(() => setFailed(true));
  }, []);

  // Real notifications come from the server; the sample family's live in the browser.
  const notices: Notice[] | null = backendOn
    ? (liveList?.map((n) => {
        const d = describe(n);
        return { id: n.id, icon: d.icon, text: d.text, href: d.href, at: n.at, unread: !n.read };
      }) ?? null)
    : s.notices;
  const unread = notices?.filter((n) => n.unread).length ?? 0;
  const used = lineage(s.people, s.tree.rootId).length;
  const limit = planLimits(s).maxPersons;
  const near = !backendOn && used / limit >= 0.9;
  const read = (id?: string) => {
    if (backendOn) {
      void readNotices(id ? [id] : undefined);
      return;
    }
    update((st) => ({
      ...st,
      notices: st.notices.map((n) => (!id || n.id === id ? { ...n, unread: false } : n)),
    }));
  };

  return (
    <AppShell
      need="member"
      title="الإشعارات"
      subtitle={!notices ? ' ' : unread ? `${num(unread)} غير مقروءة` : 'كلها مقروءة'}
      actions={
        unread ? (
          <button
            type="button"
            onClick={() => read()}
            className="text-caption font-semibold text-olive hover:underline"
          >
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
      {!notices ? (
        failed ? (
          <EmptyState icon="cloud_off" title="ما قدرنا نجيب الإشعارات" body="تأكد من اتصالك وارجع لها بعد شوي." />
        ) : (
          <p role="status" className="py-10 text-center text-body text-muted">
            نجيب الإشعارات…
          </p>
        )
      ) : notices.length ? (
        <ul className="grid overflow-hidden rounded-2xl border border-line/40 bg-card">
          {notices.map((n) => (
            <li key={n.id} className="border-b border-line/30 last:border-0">
              <Link
                href={n.href ?? '#'}
                onClick={() => read(n.id)}
                className={cn(
                  'flex items-start gap-3 p-4 transition hover:bg-surface-low',
                  n.unread && 'bg-olive-soft/20',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    n.unread ? 'bg-forest text-gold-light' : 'bg-surface text-muted',
                  )}
                >
                  <Icon name={n.icon} />
                </span>
                <span className="grid flex-1 gap-0.5">
                  <span
                    className={cn(
                      'text-body',
                      n.unread ? 'font-semibold text-ink' : 'text-ink-soft',
                    )}
                  >
                    {n.text}
                  </span>
                  <span className="text-caption text-muted">{when(n.at)}</span>
                </span>
                {n.unread ? (
                  <span
                    className="mt-2 size-2.5 shrink-0 rounded-full bg-pending"
                    aria-label="غير مقروء"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="notifications_off"
          title="ما فيه إشعارات"
          body="لما ترسل العائلة إضافات أو تُعتمد إضافاتك، يوصلك خبر هنا."
        />
      )}
    </AppShell>
  );
}
