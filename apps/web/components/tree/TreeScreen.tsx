'use client';

import type { LineagePerson } from '@sulalah/tree-engine';
import { Button, Chip, Icon, IconButton, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Viewer } from '@sulalah/domain';
import { useEffect, useMemo, useState } from 'react';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { StatePage } from '@/components/States';
import { TreeExplorer } from '@/components/TreeExplorer';
import {
  currentTreeId,
  actAs,
  actingName,
  allows,
  byId,
  canAddUnder,
  canReview,
  childrenOf,
  demoReviewer,
  fitsPlan,
  isMine,
  liveTree,
  newId,
  num,
  planLimits,
  stamp,
  update,
  usedNames,
  useDemo,
  type Person,
} from '@/lib/demo-store';
import { sendDrafts as sendAll } from '@/lib/live-actions';
import { AddPersonSheet, type PersonDraft } from './AddPersonSheet';
import { ReviewPanel } from './ReviewPanel';
import { ShareSheet } from './ShareSheet';

export type TreeMode = 'owner' | 'contribute' | 'visitor' | 'reviewer';

const t = (p = '') => `/trees/${currentTreeId()}${p}`;

const viewerOf: Record<TreeMode, Viewer> = {
  owner: 'owner',
  contribute: 'contributor',
  visitor: 'visitor',
  reviewer: 'reviewer',
};
const modeOf: Record<Viewer, TreeMode> = {
  owner: 'owner',
  contributor: 'contribute',
  visitor: 'visitor',
  reviewer: 'reviewer',
};

/**
 * S07 and the screens that live on the tree: adding and editing people (S09), contribution
 * mode (S14), reviewing a submission on the tree (S17) and the share sheet (S21).
 */
export function TreeScreen({
  as,
  reviewId,
  focusId,
}: {
  as?: TreeMode;
  reviewId?: string;
  focusId?: string;
}) {
  const s = useDemo();
  // A link with `?as=` opens the tree as that role, and the role sticks for the other pages.
  useEffect(() => {
    if (as) actAs(viewerOf[as]);
  }, [as]);
  const mode: TreeMode = as && s.as !== viewerOf[as] ? as : modeOf[s.as];
  const router = useRouter();
  const [form, setForm] = useState<{
    father: Person;
    gender: 'male' | 'female';
    editing?: Person;
  } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [flash, setFlash] = useState<{ text: string; n: number }>();
  const [current, setCurrent] = useState<LineagePerson | null>(null);
  const say = (text: string) => setFlash((f) => ({ text, n: (f?.n ?? 0) + 1 }));

  const contributing = mode === 'contribute';
  const visitor = mode === 'visitor';
  const branch = contributing ? s.myBranch : undefined;
  const actor = actingName(s);
  const owner = allows(s, { type: 'person.edit' });
  /** Whether an addition under `fatherId` goes in straight away or waits on review. */
  const direct = (fatherId: string) => owner || (mode === 'reviewer' && canReview(s, fatherId));

  // What a visitor sees follows the privacy settings.
  const people = useMemo(() => {
    if (!visitor) return s.people;
    const parents = new Set(s.people.map((p) => p.fatherId));
    return s.people
      .filter((p) => p.status === 'approved')
      .filter((p) => s.settings.showDeceased || !p.deceased || parents.has(p.id))
      .map((p) =>
        p.gender === 'female' && !s.settings.showDaughtersToVisitors ? { ...p, name: 'ابنة' } : p,
      );
  }, [s.people, s.settings, visitor]);

  const submission =
    reviewId && allows(s, { type: 'review.view' })
      ? s.submissions.find((x) => x.id === reviewId)
      : undefined;
  const pendingSubs = s.submissions.filter((x) => x.status === 'pending');
  const nextSub = pendingSubs.find((x) => x.id !== reviewId)?.id;
  const [start] = useState(() => ({ id: submission?.fatherId ?? focusId ?? branch ?? null, n: 1 }));
  const m = byId(s.people);
  const drafts = s.drafts.map((id) => m.get(id)).filter((p): p is Person => !!p);

  const save = (father: Person, editing: Person | undefined, d: PersonDraft) => {
    if (editing) {
      update((st) => ({
        ...st,
        people: st.people.map((p) => (p.id === editing.id ? { ...p, ...d } : p)),
        log: [
          {
            id: newId('l'),
            who: actor,
            action: 'edit',
            text: `عدّل بيانات ${d.name}`,
            personId: editing.id,
            at: stamp(),
          },
          ...st.log,
        ],
      }));
      say('حفظنا التعديل');
      setForm(null);
      return;
    }
    if (!fitsPlan(s)) {
      say(`وصلت الشجرة لحد باقتها: ${num(planLimits(s).maxPersons)} اسم. يرفعها المالك من صفحة الباقة`);
      return;
    }
    const id = newId('p');
    const pending = !direct(father.id);
    update((st) => ({
      ...st,
      people: [
        ...st.people,
        {
          id,
          ...d,
          fatherId: father.id,
          status: pending ? 'proposed' : 'approved',
          addedBy: actor,
          addedAt: stamp(),
          ...(pending ? {} : { approvedBy: actor }),
        },
      ],
      drafts: pending ? [...st.drafts, id] : st.drafts,
      log: pending
        ? st.log
        : [
            {
              id: newId('l'),
              who: actor,
              action: 'add',
              text: `أضاف ${d.name} تحت ${father.name}`,
              personId: father.id,
              at: stamp(),
            },
            ...st.log,
          ],
    }));
  };

  const remove = (p: Person) => {
    const before = s.people;
    update((st) => ({
      ...st,
      people: st.people.filter((x) => x.id !== p.id),
      drafts: st.drafts.filter((x) => x !== p.id),
      log: [
        {
          id: newId('l'),
          who: actor,
          action: 'delete',
          text: `حذف ${p.name}`,
          personId: p.fatherId ?? undefined,
          at: stamp(),
        },
        ...st.log,
      ],
    }));
    setForm(null);
    setUndo({ text: `حذفنا ${p.name}`, run: () => update((st) => ({ ...st, people: before })) });
  };
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null);

  const [sending, setSending] = useState(false);
  const sendDrafts = async () => {
    setSending(true);
    try {
      const n = await sendAll();
      if (n) say('أرسلناها للاعتماد. تظهر خضراء أول ما تُعتمد');
    } catch {
      say(navigator.onLine ? 'تعذّر الإرسال، حاول مرة ثانية' : 'ما فيه اتصال. إضافاتك محفوظة على جهازك');
    } finally {
      setSending(false);
    }
  };

  // ---------- Top bar per mode ----------
  let headerEnd: React.ReactNode;
  if (visitor) {
    headerEnd = (
      <Chip tone="neutral" icon="visibility">
        عرض فقط
      </Chip>
    );
  } else if (contributing) {
    headerEnd = (
      <>
        {branch ? (
          <Chip tone="olive" icon="call_split" className="max-md:hidden">
            غصنك: {m.get(branch)?.name}
          </Chip>
        ) : null}
        <Link href={t('/contributions')} className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}>
          <Icon name="inventory_2" />
          <span className="max-sm:hidden">مساهماتي</span>
          <span className="rounded-full bg-surface-high px-1.5 text-caption">
            {num(s.submissions.filter((x) => isMine(s, x)).length)}
          </span>
        </Link>
      </>
    );
  } else {
    const waiting = pendingSubs.filter((x) => canReview(s, x.fatherId)).length;
    headerEnd = (
      <>
        <Link
          href={t('/review')}
          aria-label={`الإضافات الواردة، ${waiting}`}
          className="relative flex size-10 items-center justify-center rounded-full text-forest hover:bg-surface"
        >
          <Icon name="fact_check" />
          {waiting ? (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-pending text-[0.6rem] font-bold text-white">
              {waiting}
            </span>
          ) : null}
        </Link>
        {owner ? (
          <Link
            href={t('/settings')}
            aria-label="إعدادات الشجرة"
            className="flex size-10 items-center justify-center rounded-full text-forest hover:bg-surface max-sm:hidden"
          >
            <Icon name="more_horiz" />
          </Link>
        ) : null}
        <span className="mx-1 hidden h-6 w-px bg-line/50 sm:block" />
        <Button
          size="sm"
          className="rounded-xl"
          onClick={() =>
            setForm({ father: (current as Person) ?? m.get(s.tree.rootId)!, gender: 'male' })
          }
        >
          <Icon name="person_add" />
          <span className="hidden sm:inline">إضافة فرد</span>
        </Button>
      </>
    );
  }

  const panel = form ? (
    <AddPersonSheet
      key={`${form.father.id}-${form.editing?.id ?? form.gender}`}
      father={form.father}
      gender={form.gender}
      editing={form.editing}
      siblings={childrenOf(s.people, form.father.id)}
      contributor={!form.editing && !direct(form.father.id)}
      hasChildren={form.editing ? childrenOf(s.people, form.editing.id).length > 0 : false}
      onSave={(d) => save(form.father, form.editing, d)}
      onDelete={form.editing ? () => remove(form.editing!) : undefined}
      onClose={() => setForm(null)}
    />
  ) : sharing ? (
    <ShareSheet onClose={() => setSharing(false)} onCopied={say} />
  ) : submission && submission.status === 'pending' ? (
    <ReviewPanel
      key={submission.id}
      submission={submission}
      people={s.people}
      reviewer={actor}
      outOfScope={!canReview(s, submission.fatherId)}
      nextId={nextSub}
      onDone={say}
      onClose={() => router.replace(t())}
    />
  ) : undefined;

  const limit = planLimits(s).maxPersons;
  const note =
    contributing && branch && !m.get(branch) ? (
      <span>
        غصنك ما عاد موجودًا في الشجرة.{' '}
        <Link href={t('/join')} className="font-semibold text-forest underline">
          اختر غصنك من جديد
        </Link>
      </span>
    ) : owner && usedNames(s) >= limit * 0.9 ? (
      <span>
        {usedNames(s) >= limit ? 'وصلت الشجرة لحد باقتها' : 'اقتربت الشجرة من حد باقتها'}:{' '}
        {num(usedNames(s))} من {num(limit)} اسم.{' '}
        <Link href={t('/plan')} className="font-semibold text-forest underline">
          الباقة
        </Link>
      </span>
    ) : contributing && !branch ? (
      <span>
        ما اخترت غصنك بعد.{' '}
        <Link href={t('/join')} className="font-semibold text-forest underline">
          اختر غصنك
        </Link>
      </span>
    ) : mode === 'reviewer' ? (
      (() => {
        const live = liveTree();
        const r = demoReviewer(s);
        const scope = live ? live.scope : !r || r.scope === 'all' ? [] : r.scope;
        return !scope.length
          ? 'أنت مدقق للشجرة كاملة'
          : `أنت مدقق لغصن ${scope.map((id) => m.get(id)?.name ?? '').join(' وغصن ')}. إضافاتك خارجه تنتظر المالك.`;
      })()
    ) : undefined;

  if (visitor && !allows(s, { type: 'tree.view' })) {
    return (
      <StatePage
        icon="lock"
        title="الشجرة مقفلة على أهلها"
        body={
          'المالك ما فتحها لروابط المشاهدة. يقدر يفتحها من إعدادات الخصوصية: "ومن معه رابط المشاهدة".'
        }
        action={<RoleSwitcher />}
      />
    );
  }

  return (
    <>
      <TreeExplorer
        people={people}
        unions={s.tree.unions}
        rootId={s.tree.rootId}
        ancestors={s.tree.ancestors}
        title={s.tree.title}
        back={visitor ? undefined : { href: contributing ? '/trees' : '/trees', label: 'أشجاري' }}
        headerEnd={
          <>
            <RoleSwitcher className="max-md:hidden" />
            {headerEnd}
          </>
        }
        notice={note}
        onAdd={
          visitor ? undefined : (father, gender) => setForm({ father: father as Person, gender })
        }
        canAdd={owner ? undefined : (p) => canAddUnder(s, p.id)}
        addBlockedNote={
          contributing
            ? branch
              ? `هذا خارج غصنك. تقدر تضيف داخل غصن ${m.get(branch)?.name} فقط.`
              : 'اختر غصنك أولًا عشان تقدر تضيف.'
            : undefined
        }
        personActions={(p) => (
          <div className="flex flex-wrap gap-2">
            <Link
              href={t(`/people/${p.id}`)}
              className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}
            >
              <Icon name="badge" />
              الملف الشخصي
            </Link>
            {(owner || (p.status === 'proposed' && s.drafts.includes(p.id))) &&
            p.id !== s.tree.rootId ? (
              <button
                type="button"
                className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}
                onClick={() =>
                  setForm({
                    father: m.get(p.fatherId ?? '') ?? m.get(s.tree.rootId)!,
                    gender: p.gender,
                    editing: p as Person,
                  })
                }
              >
                <Icon name="edit" />
                تعديل
              </button>
            ) : null}
          </div>
        )}
        panel={panel}
        selectRequest={start}
        onSelectionChange={(p) => {
          setCurrent(p);
          if (p && (sharing || (form && !form.editing && form.father.id !== p.id))) {
            setSharing(false);
            setForm(null);
          }
        }}
        onShare={allows(s, { type: 'invite.manage' }) ? () => setSharing(true) : undefined}
        pendingHref={allows(s, { type: 'review.view' }) ? t('/review') : undefined}
        flash={flash}
      />

      <RoleSwitcher
        up
        className="fixed end-3 bottom-[calc(96px+env(safe-area-inset-bottom,0px))] z-30 md:hidden"
      />

      {!visitor && drafts.length ? (
        <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] animate-rise items-center gap-3 rounded-2xl border border-pending/40 bg-card py-2 ps-4 pe-2 shadow-float">
          <span className="flex items-center gap-2 text-body font-semibold text-pending">
            <Icon name="edit_note" />
            {num(drafts.length)}{' '}
            {drafts.length > 2 ? 'إضافات' : drafts.length === 2 ? 'إضافتان' : 'إضافة'} لم تُرسل
          </span>
          <Button size="sm" className="rounded-xl" disabled={sending} onClick={sendDrafts}>
            {sending ? 'نرسلها…' : 'أرسلها للاعتماد'}
          </Button>
        </div>
      ) : null}

      {undo ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-40 mx-auto flex w-fit animate-rise items-center gap-3 rounded-full bg-forest py-2 ps-5 pe-2 text-body text-ivory shadow-toast"
        >
          {undo.text}
          <button
            type="button"
            className="rounded-full bg-ivory/15 px-3 py-1 text-caption font-semibold"
            onClick={() => {
              undo.run();
              setUndo(null);
            }}
          >
            تراجع
          </button>
          <IconButton label="إغلاق" className="size-7 text-ivory" onClick={() => setUndo(null)}>
            <Icon name="close" className="text-[1rem]" />
          </IconButton>
        </div>
      ) : null}
    </>
  );
}
