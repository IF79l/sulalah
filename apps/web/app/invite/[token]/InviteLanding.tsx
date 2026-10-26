'use client';

import { DemoPoster } from '@/components/DemoTree';
import { Button, Icon, Logo, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { acceptInvite, myUserId, previewInvite } from '@/lib/collab-cloud';
import { generations, lineage, num, useDemo } from '@/lib/demo-store';

type Problem = 'expired' | 'used-up' | 'full' | 'stopped' | 'missing' | 'failed';

const problems = (from: string): Record<Problem, [string, string, string]> => ({
  expired: [
    'timer_off',
    'انتهت صلاحية هذا الرابط',
    `اطلب رابطًا جديدًا من ${from} في قروب العائلة.`,
  ],
  'used-up': [
    'link_off',
    'هذا الرابط استُخدم بالكامل',
    `وصل الرابط لعدد مرات الاستخدام المحدد. اطلب من ${from} رابطًا جديدًا.`,
  ],
  full: [
    'forest',
    'مقاعد المدققين مكتملة',
    `باقة الشجرة وصلت لحدها من المدققين. تقدر تبلّغ ${from} يرفع الباقة أو يحرر مقعدًا.`,
  ],
  stopped: ['link_off', 'هذا الرابط موقوف', `أوقفه ${from}. اطلب منه رابطًا جديدًا.`],
  missing: ['search_off', 'ما لقينا هذا الرابط', 'تأكد إنك نسخته كاملًا من رسالة الدعوة.'],
  failed: ['cloud_off', 'ما قدرنا نفتح الدعوة', 'تأكد من اتصالك وحاول مرة ثانية.'],
});

/** The blurred tree behind every invite card, and the card itself. */
function InviteFrame({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-forest-deep">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-110 opacity-60 blur-[6px]"
      >
        <DemoPoster />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-forest-deep/30 via-forest-deep/60 to-forest-deep/95"
      />

      <header className="relative z-10 flex justify-center pt-[calc(20px+env(safe-area-inset-top,0px))]">
        <Logo onDark />
      </header>

      <div className="relative z-10 flex flex-1 items-end justify-center px-4 pt-10 pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:items-center">
        <section className="w-full max-w-md animate-rise rounded-[1.75rem] border border-gold-light/40 bg-card/95 p-6 shadow-float backdrop-blur-md sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}

function ProblemCard({ problem, from }: { problem: Problem; from: string }) {
  const [icon, title, body] = problems(from)[problem];
  return (
    <div className="grid justify-items-center gap-3 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface text-muted">
        <Icon name={icon} className="text-[2rem]" />
      </span>
      <h1 className="text-h2 font-bold text-forest">{title}</h1>
      <p className="text-body leading-relaxed text-muted">{body}</p>
      <Link href="/" className={cn(buttonClass('quiet'), 'mt-2')}>
        تعرّف على سُلالة
      </Link>
    </div>
  );
}

const contributeSteps = [
  ['call_split', 'تختار غصنك', 'اسم أبيك أو اسمك إذا كنت مسجّلًا.'],
  ['person_add', 'تضيف أبناءك وأحفادك', 'كل واحد باسمه، في مكانه الصحيح.'],
  ['eco', 'يعتمدها المالك فتخضرّ', 'وتظهر لكل العائلة على الشجرة.'],
];
const reviewSteps = [
  ['fact_check', 'تراجع إضافات العائلة', 'على الشجرة نفسها، اسمًا اسمًا.'],
  ['check_circle', 'تعتمد الصحيح', 'فيخضرّ في الشجرة لكل العائلة.'],
  ['edit_note', 'وتطلب تعديل الباقي', 'وتوصل ملاحظتك لمن أرسلها.'],
];

function Steps({ steps }: { steps: string[][] }) {
  return (
    <ol className="grid gap-3 border-y border-line/40 py-5">
      {steps.map(([icon, title, body]) => (
        <li key={title} className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-olive-soft/70 text-on-olive-soft">
            <Icon name={icon!} className="text-[1.15rem]" />
          </span>
          <span className="grid">
            <span className="text-body font-semibold text-forest">{title}</span>
            <span className="text-caption text-muted">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** S12 on the sample family: what a relative sees after tapping the link in the family group. */
export function InviteLanding({ state }: { state: 'ok' | 'expired' | 'used-up' | 'full' }) {
  const s = useDemo();
  const people = lineage(s.people, s.tree.rootId).length;
  return (
    <InviteFrame>
      {state !== 'ok' ? (
        <ProblemCard problem={state} from="فيصل" />
      ) : (
        <div className="grid gap-5">
          <div className="flex items-center gap-3">
            <Medallion name="فيصل خالد" />
            <p className="text-body text-ink-soft">
              <strong className="text-forest">فيصل بن خالد</strong> يدعوك للمساهمة في
            </p>
          </div>
          <div className="grid gap-1">
            <h1 className="font-title text-[2.25rem]/[1.4] text-forest">{s.tree.title}</h1>
            <p className="text-body text-muted">
              {num(people)} فردًا · {num(generations(s.people, s.tree.rootId))} أجيال
            </p>
          </div>
          <Steps steps={contributeSteps} />
          <Link
            href="/login?invite=1"
            className={cn(buttonClass('primary'), 'h-13 w-full text-body-lg')}
          >
            <Icon name="phone_iphone" />
            انضم برقم جوالك
          </Link>
          <p className="text-center text-caption text-muted">
            ما تحتاج كلمة مرور. يوصلك رمز على واتساب.
          </p>
        </div>
      )}
    </InviteFrame>
  );
}

/**
 * S12 on a real tree. The link is only a token: once the person signs in with their phone code
 * and joins, the tree opens for them like for any member. The tree's name is in the sealed
 * file, so the card names the person who sent it.
 */
export function LiveInvite({ token }: { token: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<
    | { at: 'loading' }
    | { at: 'problem'; problem: Problem; from: string }
    | {
        at: 'ready';
        kind: 'contribute' | 'review';
        from: string;
        signedIn: boolean;
        /** Why the link stopped working, for when joining turns out not to be a return. */
        problem?: Problem;
      }
  >({ at: 'loading' });
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const [row, me] = await Promise.all([previewInvite(token), myUserId()]);
        if (gone) return;
        if (!row) return setPhase({ at: 'problem', problem: 'missing', from: '' });
        const from = row.inviter || 'صاحب الشجرة';
        if (row.kind === 'view') {
          router.replace(`/view/${token}`);
          return;
        }
        // A member who opens an old link is let back into their tree, so only strangers see
        // the problem.
        if (!row.valid && !me)
          return setPhase({ at: 'problem', problem: row.problem ?? 'stopped', from });
        setPhase({
          at: 'ready',
          kind: row.kind,
          from,
          signedIn: !!me,
          ...(row.valid ? {} : { problem: (row.problem as Problem | null) ?? 'stopped' }),
        });
      } catch {
        if (!gone) setPhase({ at: 'problem', problem: 'failed', from: '' });
      }
    })();
    return () => {
      gone = true;
    };
  }, [router, token]);

  const join = async () => {
    setJoining(true);
    try {
      const treeId = await acceptInvite(token);
      router.replace(
        phase.at === 'ready' && phase.kind === 'contribute'
          ? `/trees/${treeId}/join`
          : `/trees/${treeId}`,
      );
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      setJoining(false);
      setPhase({
        at: 'problem',
        problem: /reviewer limit/.test(text)
          ? 'full'
          : /not valid/.test(text)
            ? ((phase.at === 'ready' && phase.problem) || 'expired')
            : 'failed',
        from: phase.at === 'ready' ? phase.from : '',
      });
    }
  };

  if (phase.at === 'loading')
    return (
      <InviteFrame>
        <p role="status" className="py-10 text-center text-body font-semibold text-forest">
          نفتح الدعوة…
        </p>
      </InviteFrame>
    );
  if (phase.at === 'problem')
    return (
      <InviteFrame>
        <ProblemCard problem={phase.problem} from={phase.from || 'صاحب الشجرة'} />
      </InviteFrame>
    );

  const review = phase.kind === 'review';
  return (
    <InviteFrame>
      <div className="grid gap-5">
        <div className="flex items-center gap-3">
          <Medallion name={phase.from} />
          <p className="text-body text-ink-soft">
            <strong className="text-forest">{phase.from}</strong>{' '}
            {review ? 'يدعوك لتكون مدققًا في' : 'يدعوك للمساهمة في'}
          </p>
        </div>
        <div className="grid gap-1">
          <h1 className="font-title text-[2.25rem]/[1.4] text-forest">شجرة العائلة</h1>
          <p className="flex items-center gap-1.5 text-caption text-muted">
            <Icon name="lock" className="text-[1rem]" />
            أسماؤها مشفّرة، وتظهر لك أول ما تنضم.
          </p>
        </div>
        <Steps steps={review ? reviewSteps : contributeSteps} />
        {phase.signedIn ? (
          <Button className="h-13 w-full text-body-lg" disabled={joining} onClick={join}>
            <Icon name={review ? 'verified_user' : 'group_add'} />
            {joining ? 'ننضم…' : 'انضم للشجرة'}
          </Button>
        ) : (
          <>
            <Link
              href={`/login?invite=${encodeURIComponent(token)}`}
              className={cn(buttonClass('primary'), 'h-13 w-full text-body-lg')}
            >
              <Icon name="phone_iphone" />
              انضم برقم جوالك
            </Link>
            <p className="text-center text-caption text-muted">
              ما تحتاج كلمة مرور. يوصلك رمز على واتساب.
            </p>
          </>
        )}
      </div>
    </InviteFrame>
  );
}
