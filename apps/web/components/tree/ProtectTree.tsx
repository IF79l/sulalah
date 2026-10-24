'use client';

import { recoveryCode } from '@sulalah/domain';
import { Button, Icon, cn } from '@sulalah/ui';
import { useEffect, useState } from 'react';
import {
  PasskeyUnavailable,
  createAccountPasskey,
  hasOpenAccount,
  loadKeyring,
  passkeysPossible,
  sealTreeKeyForMe,
  unlockAccount,
} from '@/lib/passkey';

type State = 'loading' | 'ask' | 'working' | 'done' | 'retry' | 'unsupported';

/**
 * After planting: one tap of Face ID or a fingerprint keeps the tree's key with the person's
 * account, so any of their devices opens it. The long recovery code is only a fallback here,
 * and always in the tree's settings.
 */
export function ProtectTree({ treeId, treeKey }: { treeId: string; treeKey: string }) {
  const [state, setState] = useState<State>('loading');
  const [hasPasskey, setHasPasskey] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let gone = false;
    (async () => {
      if (!passkeysPossible()) return setState('unsupported');
      try {
        const ring = await loadKeyring();
        if (gone) return;
        setHasPasskey(ring.passkeys.length > 0);
        // Already unlocked in this visit: nothing to tap.
        if (hasOpenAccount()) {
          await sealTreeKeyForMe(treeId, treeKey);
          if (!gone) setState('done');
        } else setState('ask');
      } catch {
        if (!gone) setState('ask');
      }
    })();
    return () => {
      gone = true;
    };
  }, [treeId, treeKey]);

  const protect = async () => {
    setState('working');
    try {
      if (hasPasskey) await unlockAccount();
      else await createAccountPasskey('');
      await sealTreeKeyForMe(treeId, treeKey);
      setState('done');
    } catch (e) {
      const why = e instanceof PasskeyUnavailable ? e.reason : 'cancelled';
      setState(why === 'unsupported' || why === 'no-prf' ? 'unsupported' : 'retry');
    }
  };

  const code = recoveryCode(treeKey);
  const fallback = state === 'unsupported' || showCode;

  return (
    <div className="grid w-full gap-3 rounded-xl border border-gold-light/40 bg-surface-low p-4 text-start">
      {state === 'done' ? (
        <p className="flex items-center gap-2 text-body font-semibold text-success">
          <Icon name="verified_user" />
          شجرتك محمية ببصمتك، وتفتحها من أي جهاز لك.
        </p>
      ) : state === 'unsupported' ? (
        <p className="text-body text-ink-soft">
          جهازك ما يدعم فتح الشجرة بالبصمة. احفظ رمز الاسترجاع عشان تفتحها من جهاز ثاني.
        </p>
      ) : (
        <>
          <span className="flex items-center gap-2 text-body font-semibold text-forest">
            <Icon name="fingerprint" className="text-olive" />
            احمِ شجرتك ببصمتك
          </span>
          <p className="text-caption leading-relaxed text-muted">
            تفتحها من أي جهاز لك بالبصمة أو الوجه، بدون رموز. والأسماء تبقى مشفّرة، ما يقرأها أحد
            غير عائلتك ولا حتى سُلالة.
          </p>
          <Button onClick={protect} disabled={state === 'working' || state === 'loading'}>
            <Icon
              name={state === 'working' ? 'progress_activity' : 'fingerprint'}
              className={cn(state === 'working' && 'animate-spin')}
            />
            {state === 'working' ? 'لحظة…' : hasPasskey ? 'أكّد ببصمتك' : 'فعّل البصمة'}
          </Button>
          {!hasPasskey ? (
            <p className="text-caption text-muted">
              جهازك بيطلب منك تحفظ البصمة. هذي مرة وحدة بس، وبعدها يكفيك وجهك أو بصمتك.
            </p>
          ) : null}
          {state === 'retry' ? (
            <p role="alert" className="text-caption text-danger">
              ما اكتملت. حاول مرة ثانية، أو احفظ رمز الاسترجاع.
            </p>
          ) : null}
        </>
      )}

      {fallback ? (
        <div className="grid gap-2">
          <code
            dir="ltr"
            className="block rounded-lg bg-card px-3 py-2 text-center font-mono text-[0.8rem] leading-relaxed tracking-wide break-words text-ink"
          >
            {code}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Icon name={copied ? 'check' : 'content_copy'} />
            {copied ? 'نسخناه' : 'انسخ الرمز'}
          </Button>
        </div>
      ) : state !== 'done' ? (
        <button
          type="button"
          className="justify-self-start text-caption font-medium text-olive hover:underline"
          onClick={() => setShowCode(true)}
        >
          أفضّل رمز استرجاع مكتوب
        </button>
      ) : null}
      {state === 'done' ? (
        <p className="text-caption text-muted">
          رمز الاسترجاع الاحتياطي في إعدادات الشجرة إذا احتجته.
        </p>
      ) : null}
    </div>
  );
}
