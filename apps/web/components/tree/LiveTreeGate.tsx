'use client';

import { TreeFileError, keyFromRecoveryCode } from '@sulalah/domain';
import { Button, Field, Icon, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NoAccess, Sprouting, StatePage } from '@/components/States';
import { closeLive, liveTree, openLive } from '@/lib/demo-store';
import { retrySave, startSaving, stopSaving, unsaved, useSaveStatus } from '@/lib/live-tree';
import {
  hasOpenAccount,
  loadKeyring,
  openTreeKey,
  passkeysPossible,
  sealTreeKeyForMe,
  sealedTreeKey,
} from '@/lib/passkey';
import { supabase } from '@/lib/supabase/client';
import { loadTreeFile } from '@/lib/tree-cloud';
import { deviceKey, keepKey } from '@/lib/tree-keys';

type Phase = 'loading' | 'locked' | 'no-access' | 'empty' | 'failed' | 'ready';

/**
 * Opens a real tree for every page under /trees/[id]: checks the membership, finds this
 * device's key (or asks for the recovery code), opens the sealed file into the store, and
 * keeps it saved while the person works.
 */
export function LiveTreeGate({ treeId, children }: { treeId: string; children: ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() =>
    liveTree()?.treeId === treeId ? 'ready' : 'loading',
  );
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [opening, setOpening] = useState(false);
  /** This person's tree key sealed for their passkey, when they have one. */
  const [sealed, setSealed] = useState<string>();
  const [typing, setTyping] = useState(false);

  const open = async (typedKey?: string) => {
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
    if (member.error || tree.error) return setPhase('failed');
    if (!member.data || !tree.data) return setPhase('no-access');

    const key = typedKey ?? deviceKey(treeId);
    if (!key) {
      const [mine] = await Promise.all([
        sealedTreeKey(treeId).catch(() => undefined),
        loadKeyring().catch(() => undefined),
      ]);
      setSealed(passkeysPossible() ? mine : undefined);
      return setPhase('locked');
    }
    try {
      const loaded = await loadTreeFile(treeId, key);
      if (!loaded) return setPhase('empty');
      if (typedKey) keepKey(treeId, typedKey);
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
      // Opened with a code or this device's copy: keep one for the passkey too, if it is open.
      if (hasOpenAccount())
        void sealedTreeKey(treeId).then((s) => (s ? undefined : sealTreeKeyForMe(treeId, key)));
    } catch (e) {
      if (e instanceof TreeFileError && e.code === 'wrong-key') {
        setCodeError(typedKey ? 'هذا الرمز ما يفتح هذه الشجرة' : undefined);
        setPhase('locked');
      } else setPhase('failed');
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
        body="تأكد من اتصالك وحاول مرة ثانية."
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
  if (phase === 'locked')
    return (
      <StatePage
        icon="key"
        title="افتح الشجرة على هذا الجهاز"
        body={
          sealed
            ? 'أسماء العائلة مشفّرة، ومفتاحها محفوظ ببصمتك. أكّد ببصمتك أو وجهك وتنفتح.'
            : 'أسماء العائلة مشفّرة، ومفتاحها عند العائلة فقط. اكتب رمز الاسترجاع، أو افتح رابط الدعوة اللي وصلك.'
        }
        action={
          sealed && !typing ? (
            <div className="grid w-full max-w-sm gap-3">
              <Button
                disabled={opening}
                onClick={async () => {
                  setOpening(true);
                  setCodeError(undefined);
                  try {
                    await open(await openTreeKey(treeId, sealed));
                  } catch {
                    setCodeError('ما اكتمل التأكيد. حاول مرة ثانية.');
                  }
                  setOpening(false);
                }}
              >
                <Icon
                  name={opening ? 'progress_activity' : 'fingerprint'}
                  className={cn(opening && 'animate-spin')}
                />
                {opening ? 'نفتح الشجرة…' : 'افتح ببصمتك'}
              </Button>
              {codeError ? (
                <p role="alert" className="text-caption text-danger">
                  {codeError}
                </p>
              ) : null}
              <button
                type="button"
                className="text-caption font-medium text-olive hover:underline"
                onClick={() => {
                  setCodeError(undefined);
                  setTyping(true);
                }}
              >
                عندي رمز استرجاع
              </button>
            </div>
          ) : (
            <form
              className="grid w-full max-w-sm gap-3 text-start"
              onSubmit={async (e) => {
                e.preventDefault();
                let key: string;
                try {
                  key = keyFromRecoveryCode(code);
                } catch {
                  setCodeError('الرمز 52 حرفًا ورقمًا، تأكد منه');
                  return;
                }
                setOpening(true);
                await open(key);
                setOpening(false);
              }}
            >
              <Field
                label="رمز الاسترجاع"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={codeError}
                placeholder="XXXX-XXXX-…"
                autoComplete="off"
                spellCheck={false}
              />
              <Button type="submit" disabled={opening || !code.trim()}>
                {opening ? 'نفتح الشجرة…' : 'افتح الشجرة'}
              </Button>
              <Link href="/trees" className={cn(buttonClass('ghost'), 'justify-self-center')}>
                ارجع لأشجاري
              </Link>
            </form>
          )
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
