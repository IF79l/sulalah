'use client';

import type { LineagePerson } from '@sulalah/tree-engine';
import { Button, Chip, Icon, IconButton, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { TreeExplorer } from '@/components/TreeExplorer';
import {
  TREE_ID,
  byId,
  childrenOf,
  inBranch,
  myName,
  newId,
  num,
  update,
  useDemo,
  type Person,
} from '@/lib/demo-store';
import { AddPersonSheet, type PersonDraft } from './AddPersonSheet';
import { ReviewPanel } from './ReviewPanel';
import { ShareSheet } from './ShareSheet';

export type TreeMode = 'owner' | 'contribute' | 'visitor' | 'reviewer';

const t = (p = '') => `/trees/${TREE_ID}${p}`;

/** The reviewer the demo signs in as, with his assigned branch. */
const DEMO_REVIEWER = { name: 'سالم بن متروك', scope: 'matrouk' };

/**
 * S07 and the screens that live on the tree: adding and editing people (S09), contribution
 * mode (S14), reviewing a submission on the tree (S17) and the share sheet (S21).
 */
export function TreeScreen({ mode, reviewId, focusId }: { mode: TreeMode; reviewId?: string; focusId?: string }) {
  const s = useDemo();
  const router = useRouter();
  const [form, setForm] = useState<{ father: Person; gender: 'male' | 'female'; editing?: Person } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [flash, setFlash] = useState<{ text: string; n: number }>();
  const [current, setCurrent] = useState<LineagePerson | null>(null);
  const say = (text: string) => setFlash((f) => ({ text, n: (f?.n ?? 0) + 1 }));

  const contributing = mode === 'contribute';
  const visitor = mode === 'visitor';
  const branch = contributing ? s.myBranch : undefined;
  const actor = mode === 'reviewer' ? DEMO_REVIEWER.name : myName(s);

  // What a visitor sees follows the privacy settings.
  const people = useMemo(() => {
    if (!visitor) return s.people;
    const parents = new Set(s.people.map((p) => p.fatherId));
    return s.people
      .filter((p) => p.status === 'approved')
      .filter((p) => s.settings.showDeceased || !p.deceased || parents.has(p.id))
      .map((p) => (p.gender === 'female' && !s.settings.showDaughtersToVisitors ? { ...p, name: 'ابنة' } : p));
  }, [s.people, s.settings, visitor]);

  const submission = reviewId ? s.submissions.find((x) => x.id === reviewId) : undefined;
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
        log: [{ id: newId('l'), who: actor, action: 'edit', text: `عدّل بيانات ${d.name}`, personId: editing.id, at: 'الآن' }, ...st.log],
      }));
      say('حفظنا التعديل');
      setForm(null);
      return;
    }
    const id = newId('p');
    update((st) => ({
      ...st,
      people: [
        ...st.people,
        {
          id,
          ...d,
          fatherId: father.id,
          status: contributing ? 'proposed' : 'approved',
          addedBy: actor,
          addedAt: 'الآن',
          ...(contributing ? {} : { approvedBy: actor }),
        },
      ],
      drafts: contributing ? [...st.drafts, id] : st.drafts,
      log: contributing
        ? st.log
        : [{ id: newId('l'), who: actor, action: 'add', text: `أضاف ${d.name} تحت ${father.name}`, personId: father.id, at: 'الآن' }, ...st.log],
    }));
  };

  const remove = (p: Person) => {
    const before = s.people;
    update((st) => ({
      ...st,
      people: st.people.filter((x) => x.id !== p.id),
      drafts: st.drafts.filter((x) => x !== p.id),
      log: [{ id: newId('l'), who: actor, action: 'delete', text: `حذف ${p.name}`, personId: p.fatherId ?? undefined, at: 'الآن' }, ...st.log],
    }));
    setForm(null);
    setUndo({ text: `حذفنا ${p.name}`, run: () => update((st) => ({ ...st, people: before })) });
  };
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null);

  const sendDrafts = () => {
    const fatherId = drafts[0]?.fatherId ?? branch ?? s.tree.rootId;
    const sub = newId('sub');
    update((st) => ({
      ...st,
      people: st.people.map((p) => (st.drafts.includes(p.id) ? { ...p, submissionId: sub } : p)),
      submissions: [
        { id: sub, contributor: myName(st), fatherId, personIds: st.drafts, at: 'الآن', status: 'pending' },
        ...st.submissions,
      ],
      notices: [
        {
          id: newId('n'),
          icon: 'person_add',
          text: `أرسل ${myName(st)} ${st.drafts.length} إضافات لغصن ${m.get(fatherId)?.name ?? ''}`,
          at: 'الآن',
          unread: true,
          href: t('/review'),
        },
        ...st.notices,
      ],
      log: [{ id: newId('l'), who: myName(st), action: 'add', text: `أرسل ${st.drafts.length} إضافات للاعتماد`, personId: fatherId, at: 'الآن' }, ...st.log],
      drafts: [],
    }));
    say('أرسلناها للاعتماد. تظهر خضراء أول ما تُعتمد');
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
            {num(s.submissions.filter((x) => x.contributor === myName(s)).length)}
          </span>
        </Link>
      </>
    );
  } else {
    const waiting = pendingSubs.length;
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
        <Link
          href={t('/settings')}
          aria-label="إعدادات الشجرة"
          className="flex size-10 items-center justify-center rounded-full text-forest hover:bg-surface max-sm:hidden"
        >
          <Icon name="more_horiz" />
        </Link>
        <span className="mx-1 hidden h-6 w-px bg-line/50 sm:block" />
        <Button size="sm" className="rounded-xl" onClick={() => setForm({ father: (current as Person) ?? m.get(s.tree.rootId)!, gender: 'male' })}>
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
      contributor={contributing}
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
      outOfScope={mode === 'reviewer' && !inBranch(s.people, submission.fatherId, DEMO_REVIEWER.scope)}
      nextId={nextSub}
      onDone={say}
      onClose={() => router.replace(t())}
    />
  ) : undefined;

  const note = contributing && !branch ? (
    <span>
      ما اخترت غصنك بعد.{' '}
      <Link href={t('/join')} className="font-semibold text-forest underline">
        اختر غصنك
      </Link>
    </span>
  ) : mode === 'reviewer' ? (
    `أنت مدقق لغصن ${m.get(DEMO_REVIEWER.scope)?.name}`
  ) : undefined;

  return (
    <>
      <TreeExplorer
        people={people}
        unions={s.tree.unions}
        rootId={s.tree.rootId}
        ancestors={s.tree.ancestors}
        title={s.tree.title}
        back={visitor ? undefined : { href: contributing ? '/trees' : '/trees', label: 'أشجاري' }}
        headerEnd={headerEnd}
        notice={note}
        onAdd={visitor || mode === 'reviewer' ? undefined : (father, gender) => setForm({ father: father as Person, gender })}
        canAdd={contributing ? (p) => !!branch && inBranch(s.people, p.id, branch) : undefined}
        addBlockedNote={
          contributing
            ? branch
              ? `هذا خارج غصنك. تقدر تضيف داخل غصن ${m.get(branch)?.name} فقط.`
              : 'اختر غصنك أولًا عشان تقدر تضيف.'
            : undefined
        }
        personActions={(p) => (
          <div className="flex flex-wrap gap-2">
            <Link href={t(`/people/${p.id}`)} className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}>
              <Icon name="badge" />
              الملف الشخصي
            </Link>
            {!visitor && mode !== 'reviewer' && (!contributing || (p.status === 'proposed' && s.drafts.includes(p.id))) && p.id !== s.tree.rootId ? (
              <button
                type="button"
                className={cn(buttonClass('quiet', 'sm'), 'rounded-xl')}
                onClick={() => setForm({ father: m.get(p.fatherId ?? '') ?? m.get(s.tree.rootId)!, gender: p.gender, editing: p as Person })}
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
        onShare={visitor ? undefined : () => setSharing(true)}
        pendingHref={t('/review')}
        flash={flash}
      />

      {contributing && drafts.length ? (
        <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] animate-rise items-center gap-3 rounded-2xl border border-pending/40 bg-card py-2 ps-4 pe-2 shadow-float">
          <span className="flex items-center gap-2 text-body font-semibold text-pending">
            <Icon name="edit_note" />
            {num(drafts.length)} {drafts.length > 2 ? 'إضافات' : drafts.length === 2 ? 'إضافتان' : 'إضافة'} لم تُرسل
          </span>
          <Button size="sm" className="rounded-xl" onClick={sendDrafts}>
            أرسلها للاعتماد
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
