'use client';

import { Button, Icon, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NoAccess, Sprouting, StatePage } from '@/components/States';
import { appEnv } from '@/lib/backend';
import { closeLive, liveTree, openLive } from '@/lib/demo-store';
import { retrySave, startSaving, stopSaving, unsaved, useSaveStatus } from '@/lib/live-tree';
import { supabase } from '@/lib/supabase/client';
import { loadTreeFile } from '@/lib/tree-cloud';
import { treeKey } from '@/lib/tree-keys';

type Phase = 'loading' | 'no-access' | 'empty' | 'no-key' | 'failed' | 'ready';

/**
 * Opens a real tree for every page under /trees/[id]: checks the membership, gets the tree's
 * key from the server, opens the sealed file into the store, and keeps it saved while the
 * person works.
 */
export function LiveTreeGate({ treeId, children }: { treeId: string; children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() =>
    liveTree()?.treeId === treeId ? 'ready' : 'loading',
  );
  /** What went wrong, shown on the staging copy so a failure can be told apart. */
  const [why, setWhy] = useState<string>();

  const open = async () => {
    const db = supabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/trees/${treeId}`)}`);
      return;
    }
    const [member, tree, profile] = await Promise.all([
      db
        .from('tree_members')
        .select('role, scope_person_ids, branch_person_id')
        .eq('tree_id', treeId)
        .eq('user_id', user.id)
        .maybeSingle(),
      db.from('trees').select('plan').eq('id', treeId).maybeSingle(),
      db.from('profiles').select('first_name, father_name, notify').eq('id', user.id).maybeSingle(),
    ]);
    if (member.error || tree.error) {
      setWhy((member.error ?? tree.error)?.code);
      return setPhase('failed');
    }
    if (!member.data || !tree.data) return setPhase('no-access');

    try {
      const key = await treeKey(treeId);
      // Planted before the platform kept keys: nothing can open it.
      if (!key) return setPhase('no-key');
      const loaded = await loadTreeFile(treeId, key);
      if (!loaded) return setPhase('empty');
      openLive(
        {
          treeId,
          role: member.data.role,
          scope: member.data.scope_person_ids,
          branch: member.data.branch_person_id ?? undefined,
          plan: tree.data.plan,
          me: {
            first: profile.data?.first_name ?? '',
            father: profile.data?.father_name ?? '',
            phone: (user.phone ?? '').slice(-9),
            notify: profile.data?.notify ?? 'app',
          },
        },
        loaded.file,
        key,
      );
      startSaving(treeId, key, loaded.version, loaded.file);
      setPhase('ready');
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setWhy(err.code ?? err.message);
      setPhase('failed');
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (started.current || phase !== 'loading') return;
    started.current = true;
    void open();
    // Runs once per tree; the layout remounts this gate when the tree changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (unsaved()) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (phase === 'loading') return <Sprouting />;
  if (phase === 'no-access') return <NoAccess />;
  if (phase === 'failed')
    return (
      <StatePage
        icon="cloud_off"
        title="ما قدرنا نفتح الشجرة"
        body={`تأكد من اتصالك وحاول مرة ثانية.${appEnv === 'staging' && why ? ` (${why})` : ''}`}
        action={
          <Button
            onClick={() => {
              setPhase('loading');
              void open();
            }}
          >
            حاول مرة ثانية
          </Button>
        }
      />
    );
  if (phase === 'no-key')
    return (
      <StatePage
        icon="park"
        title="هذي شجرة تجريبية قديمة"
        body="زُرعت قبل التحديث الأخير، فما تنفتح. ازرع شجرة جديدة."
        action={
          <Link href="/trees/new" className={buttonClass('primary')}>
            ازرع شجرة
          </Link>
        }
      />
    );
  if (phase === 'empty')
    return (
      <StatePage
        icon="park"
        title="الشجرة ما حُفظت بعد"
        body="انقطع الحفظ وقت إنشائها. ازرعها من جديد من أشجارك."
        action={
          <Link href="/trees/new" className={buttonClass('primary')}>
            ازرع شجرة
          </Link>
        }
      />
    );
  return (
    <>
      {children}
      <SaveBadge />
    </>
  );
}

/** A small note at the bottom while a change is on its way to the server, or stuck. */
function SaveBadge() {
  const status = useSaveStatus();
  const [justSaved, setJustSaved] = useState(false);
  const last = useRef(status);
  useEffect(() => {
    if (last.current === 'saving' && status === 'saved') {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1800);
      last.current = status;
      return () => clearTimeout(t);
    }
    last.current = status;
  }, [status]);
  useEffect(() => {
    const back = () => retrySave();
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, []);

  if (status === 'readonly' || (status === 'saved' && !justSaved)) return null;
  const text = {
    saving: 'نحفظ التغيير…',
    saved: 'حُفظ مشفّرًا',
    offline: 'بلا اتصال، نحفظ أول ما يرجع',
    failed: 'تعذّر الحفظ',
  }[status];
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold-light/40 bg-card/95 px-4 py-2 text-caption font-semibold text-forest shadow-float backdrop-blur-sm"
    >
      <Icon
        name={status === 'saving' ? 'progress_activity' : status === 'saved' ? 'lock' : 'cloud_off'}
        className={cn('text-[1.1rem]', status === 'saving' && 'animate-spin')}
      />
      {text}
      {status === 'failed' ? (
        <button type="button" className="text-olive underline" onClick={retrySave}>
          أعد المحاولة
        </button>
      ) : null}
    </div>
  );
}

/** For the sample trees: puts the sample back if a real tree was open a moment ago. */
export function SampleTreeGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => !liveTree());
  useEffect(() => {
    stopSaving();
    closeLive();
    setReady(true);
  }, []);
  return ready ? children : <Sprouting />;
}
