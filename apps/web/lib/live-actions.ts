'use client';

/**
 * Actions on the tree that reach other people: sending additions for review and telling a
 * contributor what became of theirs. On the sample tree they only change the store; on a real
 * tree they also send the sealed files and the notifications.
 */
import type { SubmissionFile } from '@sulalah/domain';
import {
  notifyMember,
  notifySubmission,
  sendSubmission,
  withdrawSubmission,
} from '@/lib/collab-cloud';
import {
  actingName,
  byId,
  currentTreeId,
  getState,
  liveTree,
  newId,
  pathTo,
  stamp,
  update,
  type Person,
  type Submission,
} from '@/lib/demo-store';
import { afterSave } from '@/lib/live-tree';

/** Splits the unsent drafts by the approved person each group hangs from. */
function draftGroups(people: Person[], drafts: string[]) {
  const m = byId(people);
  const mine = new Set(drafts);
  const groups = new Map<string, Person[]>();
  for (const id of drafts) {
    const p = m.get(id);
    if (!p) continue;
    let anchor = p.fatherId ?? undefined;
    while (anchor && mine.has(anchor)) anchor = m.get(anchor)?.fatherId ?? undefined;
    if (!anchor) continue;
    groups.set(anchor, [...(groups.get(anchor) ?? []), p]);
  }
  return groups;
}

/**
 * Sends every unsent draft for review, one submission per father they hang from. Answers how
 * many people went out.
 */
export async function sendDrafts(): Promise<number> {
  const st = getState();
  const live = liveTree();
  const groups = draftGroups(st.people, st.drafts);
  const who = actingName(st);
  const sent: Submission[] = [];
  const replaced = st.draftReplaces
    ? st.submissions.find((x) => x.id === st.draftReplaces)
    : undefined;

  // One failed upload stops the rest, but what already went out is recorded below, so a
  // second try does not send it twice.
  let failure: unknown;
  for (const [fatherId, people] of groups) {
    if (failure) break;
    const id = newId('sub').replace(/[^A-Za-z0-9_-]/g, '');
    const replaces = replaced && replaced.fatherId === fatherId ? replaced.id : undefined;
    // A contributor cannot write the tree file: their additions travel as a sealed file.
    if (live && live.role === 'contributor') {
      const file: SubmissionFile = {
        format: 'sulalah-submission',
        version: 1,
        id,
        treeId: live.treeId,
        contributor: who,
        fatherId,
        people: people.map((p) => ({
          id: p.id,
          name: p.name,
          gender: p.gender,
          fatherId: p.fatherId,
          status: 'proposed',
          deceased: p.deceased,
          birthYear: p.birthYear,
          deathYear: p.deathYear,
          kunya: p.kunya || undefined,
          bio: p.bio || undefined,
        })),
        at: stamp(),
        replaces,
      };
      try {
        await sendSubmission(live.treeId, st.treeKey!, file);
      } catch (e) {
        failure = e;
        break;
      }
    }
    sent.push({
      id,
      contributor: who,
      by: live?.userId,
      fatherId,
      personIds: people.map((p) => p.id),
      at: stamp(),
      status: 'pending',
      replaces,
    });
  }
  if (!sent.length) {
    if (failure) throw failure;
    return 0;
  }

  const m = byId(st.people);
  const n = sent.reduce((a, x) => a + x.personIds.length, 0);
  const goneSubs = new Set(sent.map((x) => x.replaces).filter(Boolean));
  update((s) => ({
    ...s,
    people: s.people
      .filter((p) => !(p.submissionId && goneSubs.has(p.submissionId) && !s.drafts.includes(p.id)))
      .map((p) => {
        const x = sent.find((y) => y.personIds.includes(p.id));
        return x ? { ...p, submissionId: x.id, addedBy: who } : p;
      }),
    submissions: [...sent, ...s.submissions.filter((x) => !goneSubs.has(x.id))],
    // The sample tree has no server, so its owner hears of it right here.
    notices: live
      ? s.notices
      : [
          {
            id: newId('n'),
            icon: 'person_add',
            text: `أرسل ${who} ${n} إضافات لغصن ${m.get(sent[0]!.fatherId)?.name ?? ''}`,
            at: 'الآن',
            unread: true,
            href: `/trees/${currentTreeId()}/review`,
          },
          ...s.notices,
        ],
    log: [
      {
        id: newId('l'),
        who,
        action: 'add',
        text: `أرسل ${n} إضافات للاعتماد`,
        personId: sent[0]!.fatherId,
        at: stamp(),
      },
      ...s.log,
    ],
    drafts: s.drafts.filter((id) => !sent.some((x) => x.personIds.includes(id))),
    draftReplaces: undefined,
  }));

  if (live)
    for (const x of sent)
      void notifySubmission(
        live.treeId,
        pathTo(st.people, x.fatherId).map((p) => p.id),
        x.personIds.length,
      ).catch(() => {});
  if (failure) throw failure;
  return n;
}

/** Takes back a submission nobody has reviewed yet. */
export async function withdraw(id: string) {
  const live = liveTree();
  if (live?.role === 'contributor') await withdrawSubmission(live.treeId, id);
  update((st) => {
    const sub = st.submissions.find((x) => x.id === id);
    return {
      ...st,
      people: st.people.filter((p) => !sub?.personIds.includes(p.id)),
      submissions: st.submissions.filter((x) => x.id !== id),
    };
  });
}

/**
 * Brings a submission sent back for changes into the drafts, to fix and send again; the new
 * one replaces it once it is taken in.
 */
export function reopenForChanges(id: string) {
  update((st) => {
    const sub = st.submissions.find((x) => x.id === id);
    if (!sub) return st;
    const have = new Set(st.people.map((p) => p.id));
    return {
      ...st,
      drafts: [...new Set([...st.drafts, ...sub.personIds.filter((p) => have.has(p))])],
      draftReplaces: sub.id,
    };
  });
}

/** Tells the contributor what became of their submission. */
export function tellContributor(
  sub: Submission,
  what: 'approved' | 'partly_approved' | 'changes' | 'rejected',
  kept: number,
) {
  const live = liveTree();
  if (!live || !sub.by) return;
  const to = sub.by;
  // Only once the server took the review: a refused one must not reach the contributor.
  afterSave(() => void notifyMember(live.treeId, to, what, kept, sub.fatherId).catch(() => {}));
}
