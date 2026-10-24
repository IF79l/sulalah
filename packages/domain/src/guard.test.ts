import { describe, expect, it } from 'vitest';
import { takeIn } from './collab';
import { checkSave, countedNames, type SaveContext } from './guard';
import type { TreeFile, TreeFilePerson } from './treefile';

// محمد ← عبدالله ← نورة، ومحمد ← سعد ← صالح. Badr reviews سعد's branch only.
const base: TreeFile = {
  format: 'sulalah-tree',
  version: 1,
  tree: { id: 't1', title: 'شجرة', family: 'السهلي', rootId: 'm', ancestors: [] },
  people: [
    { id: 'm', name: 'محمد', gender: 'male', fatherId: null, status: 'approved' },
    { id: 'a', name: 'عبدالله', gender: 'male', fatherId: 'm', status: 'approved' },
    { id: 's', name: 'سعد', gender: 'male', fatherId: 'm', status: 'approved' },
    { id: 'n', name: 'نورة', gender: 'female', fatherId: 'a', status: 'approved' },
    { id: 'old', name: 'صالح', gender: 'male', fatherId: 's', status: 'approved' },
    { id: 'w', name: 'هيا', gender: 'female', fatherId: null, status: 'approved' },
    // Waiting buds: one under سعد, one under عبدالله.
    { id: 'bs', name: 'فهد', gender: 'male', fatherId: 's', status: 'proposed', submissionId: 'sub-s' },
    { id: 'ba', name: 'ماجد', gender: 'male', fatherId: 'a', status: 'proposed', submissionId: 'sub-a' },
  ],
  unions: [{ aId: 's', bId: 'w' }],
  submissions: [
    { id: 'sub-s', contributor: 'خالد', by: 'u-k', fatherId: 's', personIds: ['bs'], at: 't', status: 'pending' },
    { id: 'sub-a', contributor: 'خالد', by: 'u-k', fatherId: 'a', personIds: ['ba'], at: 't', status: 'pending' },
  ],
  updatedAt: '2026-10-24T00:00:00Z',
};

const owner: SaveContext = { role: 'owner', userId: 'u-o', scope: [], maxPersons: 50, paused: false };
const reviewer: SaveContext = { role: 'reviewer', userId: 'u-b', scope: ['s'], maxPersons: 50, paused: false };
const wholeTree: SaveContext = { ...reviewer, scope: [] };

const person = (id: string, fatherId: string | null, over: Partial<TreeFilePerson> = {}): TreeFilePerson => ({
  id,
  name: `اسم ${id}`,
  gender: 'male',
  fatherId,
  status: 'approved',
  ...over,
});
const withPeople = (f: TreeFile, ...people: TreeFilePerson[]): TreeFile => ({
  ...f,
  people: [...f.people, ...people],
});
const approve = (f: TreeFile, subId: string): TreeFile => {
  const sub = f.submissions.find((x) => x.id === subId)!;
  return {
    ...f,
    people: f.people.map((p) =>
      sub.personIds.includes(p.id) ? { ...p, status: 'approved', submissionId: undefined } : p,
    ),
    submissions: f.submissions.map((x) => (x.id === subId ? { ...x, status: 'approved' } : x)),
  };
};
const reject = (f: TreeFile, subId: string): TreeFile => {
  const sub = f.submissions.find((x) => x.id === subId)!;
  return {
    ...f,
    people: f.people.filter((p) => !sub.personIds.includes(p.id)),
    submissions: f.submissions.map((x) => (x.id === subId ? { ...x, status: 'rejected' } : x)),
  };
};

describe('counting names', () => {
  it('counts the root and everyone with a father, buds included, not wives', () => {
    expect(countedNames(base.people, 'm')).toBe(7);
  });
});

describe('the plan', () => {
  it('lets the owner plant a tree inside the plan, and refuses one bigger than it', () => {
    expect(checkSave(null, base, owner)).toBeNull();
    expect(checkSave(null, base, { ...owner, maxPersons: 6 })).toBe('plan_full');
  });

  it('stops a tree from growing past its plan', () => {
    const ctx = { ...owner, maxPersons: 8 };
    const one = withPeople(base, person('c1', 'old'));
    expect(checkSave(base, one, ctx)).toBeNull();
    expect(checkSave(one, withPeople(one, person('c2', 'old')), ctx)).toBe('plan_full');
  });

  it('lets a tree already over a smaller plan be tidied, just not grow', () => {
    const ctx = { ...owner, maxPersons: 3 };
    const renamed = { ...base, people: base.people.map((p) => (p.id === 'a' ? { ...p, name: 'عبدالرحمن' } : p)) };
    expect(checkSave(base, renamed, ctx)).toBeNull();
    expect(checkSave(base, reject(base, 'sub-a'), ctx)).toBeNull();
    expect(checkSave(base, withPeople(base, person('c1', 'old')), ctx)).toBe('plan_full');
  });

  it('counts a wife given a father as one more name', () => {
    const ctx = { ...owner, maxPersons: 7 };
    const moved = { ...base, people: base.people.map((p) => (p.id === 'w' ? { ...p, fatherId: 'a' } : p)) };
    expect(checkSave(base, moved, ctx)).toBe('plan_full');
  });

  describe('when it lapsed', () => {
    const paused = { ...owner, paused: true };
    it('refuses new names, buds taken in and approvals, for everyone', () => {
      expect(checkSave(base, withPeople(base, person('c1', 'old')), paused)).toBe('plan_paused');
      expect(checkSave(base, approve(base, 'sub-s'), paused)).toBe('plan_paused');
      expect(checkSave(base, approve(base, 'sub-s'), { ...wholeTree, paused: true })).toBe('plan_paused');
      const intake = takeIn(base, {
        format: 'sulalah-submission',
        version: 1,
        id: 'sub-new',
        treeId: 't1',
        contributor: 'خالد',
        fatherId: 'old',
        people: [person('k1', 'old', { status: 'proposed' })],
        at: 't',
      }, 'u-k');
      expect(checkSave(base, intake.file!, paused)).toBe('plan_paused');
    });
    it('still lets the owner fix names, delete and turn down buds', () => {
      const renamed = { ...base, people: base.people.map((p) => (p.id === 'n' ? { ...p, name: 'نوره' } : p)) };
      expect(checkSave(base, renamed, paused)).toBeNull();
      expect(checkSave(base, reject(base, 'sub-a'), paused)).toBeNull();
    });
  });
});

describe('who may change what', () => {
  it('never lets a contributor write the tree file', () => {
    expect(checkSave(base, base, { ...owner, role: 'contributor' })).toBe('not_allowed');
  });
  it('lets only the owner plant', () => {
    expect(checkSave(null, base, wholeTree)).toBe('not_allowed');
  });
  it('keeps renames, deletions, the trunk and the settings to the owner', () => {
    const renamed = { ...base, people: base.people.map((p) => (p.id === 'old' ? { ...p, name: 'صالحة' } : p)) };
    expect(checkSave(base, renamed, wholeTree)).toBe('owner_only');
    expect(checkSave(base, renamed, owner)).toBeNull();
    const deleted = { ...base, people: base.people.filter((p) => p.id !== 'old') };
    expect(checkSave(base, deleted, wholeTree)).toBe('owner_only');
    expect(checkSave(base, { ...base, tree: { ...base.tree, title: 'غيرها' } }, wholeTree)).toBe('owner_only');
    const settings = { showDaughtersToVisitors: true, showDeceased: true, showBirthYears: true };
    expect(checkSave(base, { ...base, settings }, wholeTree)).toBe('owner_only');
  });
  it('does not mistake default settings written out for a change', () => {
    const settings = { showDaughtersToVisitors: false, showDeceased: true, showBirthYears: true };
    expect(checkSave(base, { ...base, settings }, wholeTree)).toBeNull();
  });
  it('lets a whole-tree reviewer approve and add anywhere', () => {
    expect(checkSave(base, approve(base, 'sub-a'), wholeTree)).toBeNull();
    expect(checkSave(base, withPeople(base, person('c1', 'n')), wholeTree)).toBeNull();
  });
});

describe("a reviewer's branch", () => {
  it('lets them approve, turn down and add inside it', () => {
    expect(checkSave(base, approve(base, 'sub-s'), reviewer)).toBeNull();
    expect(checkSave(base, reject(base, 'sub-s'), reviewer)).toBeNull();
    expect(checkSave(base, withPeople(base, person('c1', 'old')), reviewer)).toBeNull();
    expect(checkSave(base, withPeople(base, person('c1', 's')), reviewer)).toBeNull();
  });

  it('refuses approving or turning down outside it', () => {
    expect(checkSave(base, approve(base, 'sub-a'), reviewer)).toBe('outside_scope');
    expect(checkSave(base, reject(base, 'sub-a'), reviewer)).toBe('outside_scope');
    const marked = {
      ...base,
      submissions: base.submissions.map((x) => (x.id === 'sub-a' ? { ...x, status: 'changes' as const } : x)),
    };
    expect(checkSave(base, marked, reviewer)).toBe('outside_scope');
  });

  it('refuses adding straight into the tree outside it', () => {
    expect(checkSave(base, withPeople(base, person('c1', 'n')), reviewer)).toBe('outside_scope');
    expect(checkSave(base, withPeople(base, person('c1', 'm')), reviewer)).toBe('outside_scope');
  });

  it('refuses taking in someone else\'s submission outside it', () => {
    const r = takeIn(base, {
      format: 'sulalah-submission',
      version: 1,
      id: 'sub-k',
      treeId: 't1',
      contributor: 'خالد',
      fatherId: 'a',
      people: [person('k1', 'a', { status: 'proposed' })],
      at: 't',
    }, 'u-k');
    expect(checkSave(base, r.file!, reviewer)).toBe('outside_scope');
    expect(checkSave(base, r.file!, owner)).toBeNull();
  });

  it('lets them propose outside it, for the owner to decide, and take it back', () => {
    const proposed = {
      ...withPeople(base, person('p1', 'a', { status: 'proposed', submissionId: 'mine' })),
      submissions: [
        { id: 'mine', contributor: 'بدر', by: 'u-b', fatherId: 'a', personIds: ['p1'], at: 't', status: 'pending' as const },
        ...base.submissions,
      ],
    };
    expect(checkSave(base, proposed, reviewer)).toBeNull();
    expect(checkSave(proposed, base, reviewer)).toBeNull();
    // But not approve their own proposal there, nor pass a proposal off as approved.
    expect(checkSave(proposed, approve(proposed, 'mine'), reviewer)).toBe('outside_scope');
    const sneaky = {
      ...proposed,
      people: proposed.people.map((p) => (p.id === 'p1' ? { ...p, status: 'approved' as const } : p)),
    };
    expect(checkSave(base, sneaky, reviewer)).toBe('outside_scope');
  });

  it('does not let them claim someone else\'s submission as their own', () => {
    const claimed = {
      ...base,
      submissions: base.submissions.map((x) => (x.id === 'sub-a' ? { ...x, by: 'u-b' } : x)),
    };
    expect(checkSave(base, claimed, reviewer)).toBe('outside_scope');
  });

  it('follows a wife to her husband\'s branch', () => {
    const wife = person('w2', null, { gender: 'female' });
    const inside = { ...withPeople(base, wife), unions: [...base.unions, { aId: 'old', bId: 'w2' }] };
    expect(checkSave(base, inside, reviewer)).toBeNull();
    const outside = { ...withPeople(base, wife), unions: [...base.unions, { aId: 'a', bId: 'w2' }] };
    expect(checkSave(base, outside, reviewer)).toBe('outside_scope');
  });

  it('refuses moving a bud out of it', () => {
    const moved = { ...base, people: base.people.map((p) => (p.id === 'bs' ? { ...p, fatherId: 'a' } : p)) };
    expect(checkSave(base, moved, reviewer)).toBe('outside_scope');
  });
});
