import { describe, expect, it } from 'vitest';
import {
  openSubmission,
  openText,
  randomToken,
  sealSubmission,
  sealText,
  sha256Hex,
  takeIn,
  takeOut,
  viewKeyFor,
  visitorsCopy,
  type SubmissionFile,
} from './collab';
import { generateTreeKey, mergeTreeFiles, openTree, sealTree, type TreeFile } from './treefile';

const file: TreeFile = {
  format: 'sulalah-tree',
  version: 1,
  tree: { id: 't1', title: 'شجرة', family: 'السهلي', rootId: 'm', ancestors: [] },
  people: [
    { id: 'm', name: 'محمد', gender: 'male', fatherId: null, status: 'approved', deceased: true },
    { id: 'a', name: 'عبدالله', gender: 'male', fatherId: 'm', status: 'approved', birthYear: 1950 },
    { id: 's', name: 'سعد', gender: 'male', fatherId: 'm', status: 'approved' },
    { id: 'n', name: 'نورة', gender: 'female', fatherId: 'a', status: 'approved' },
    { id: 'old', name: 'صالح', gender: 'male', fatherId: 's', status: 'approved', deceased: true },
    { id: 'x', name: 'مقترح', gender: 'male', fatherId: 'a', status: 'proposed' },
  ],
  unions: [],
  submissions: [],
  updatedAt: '2026-10-24T00:00:00Z',
};

const sub = (over: Partial<SubmissionFile> = {}): SubmissionFile => ({
  format: 'sulalah-submission',
  version: 1,
  id: 'sub1',
  treeId: 't1',
  contributor: 'ماجد بن سعد',
  fatherId: 's',
  people: [
    { id: 'p1', name: 'فهد', gender: 'male', fatherId: 's', status: 'proposed' },
    { id: 'p2', name: 'ريم', gender: 'female', fatherId: 'p1', status: 'approved' },
  ],
  at: '2026-10-24T10:00:00Z',
  ...over,
});

describe('small sealed values', () => {
  it('round trips and refuses another context', async () => {
    const key = generateTreeKey();
    const sealed = await sealText('tok', key, 'invite:t1');
    expect(await openText(sealed, key, 'invite:t1')).toBe('tok');
    await expect(openText(sealed, key, 'invite:t2')).rejects.toThrow('wrong-key');
  });
  it('makes unguessable tokens and hashes them like the database', async () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('the visitors copy', () => {
  it('opens only with the view key, which is not the tree key', async () => {
    const key = generateTreeKey();
    const viewKey = await viewKeyFor(key, 't1');
    expect(viewKey).not.toBe(key);
    expect(await viewKeyFor(key, 't1')).toBe(viewKey);
    const sealed = await sealTree(visitorsCopy(file), viewKey);
    expect((await openTree(sealed, viewKey)).people.length).toBeGreaterThan(0);
    await expect(openTree(sealed, key)).rejects.toThrow('wrong-key');
  });
  it('follows the privacy settings', () => {
    const hidden = visitorsCopy(file);
    expect(hidden.people.find((p) => p.id === 'n')?.name).toBe('ابنة');
    expect(hidden.people.some((p) => p.id === 'x')).toBe(false);
    expect(hidden.people.find((p) => p.id === 'a')?.birthYear).toBe(1950);
    const strict = visitorsCopy({
      ...file,
      settings: { showDaughtersToVisitors: true, showDeceased: false, showBirthYears: false },
    });
    expect(strict.people.find((p) => p.id === 'n')?.name).toBe('نورة');
    // The departed founder stays because others hang from him; childless Saleh goes.
    expect(strict.people.some((p) => p.id === 'm')).toBe(true);
    expect(strict.people.some((p) => p.id === 'old')).toBe(false);
    expect(strict.people.find((p) => p.id === 'a')?.birthYear).toBeUndefined();
  });
});

describe('submissions', () => {
  it('seal to their own path', async () => {
    const key = generateTreeKey();
    const sealed = await sealSubmission(sub(), key, 'u1');
    expect((await openSubmission(sealed, key, 't1', 'u1', 'sub1')).people).toHaveLength(2);
    await expect(openSubmission(sealed, key, 't1', 'u2', 'sub1')).rejects.toThrow();
  });

  it('are taken in as proposed, under the father', () => {
    const r = takeIn(file, sub(), 'u1', { branch: 's' });
    expect(r.problem).toBeUndefined();
    const p2 = r.file!.people.find((p) => p.id === 'p2')!;
    expect(p2.status).toBe('proposed');
    expect(p2.submissionId).toBe('sub1');
    expect(r.file!.submissions[0]).toMatchObject({ id: 'sub1', by: 'u1', status: 'pending' });
    expect(takeIn(r.file!, sub(), 'u1').problem).toBe('known');
  });

  it('refuse what would break the tree', () => {
    expect(takeIn(file, sub({ fatherId: 'n' }), 'u1').problem).toBe('no-father');
    expect(takeIn(file, sub({ fatherId: 'x' }), 'u1').problem).toBe('no-father');
    expect(takeIn(file, sub(), 'u1', { branch: 'a' }).problem).toBe('outside-branch');
    expect(takeIn(file, sub(), 'u1', { branch: null }).problem).toBe('outside-branch');
    const clash = sub({
      people: [{ id: 'a', name: 'فهد', gender: 'male', fatherId: 's', status: 'proposed' }],
    });
    expect(takeIn(file, clash, 'u1').problem).toBe('taken-id');
    const loose = sub({
      people: [{ id: 'p1', name: 'فهد', gender: 'male', fatherId: 'a', status: 'proposed' }],
    });
    expect(takeIn(file, loose, 'u1').problem).toBe('bad-person');
    const motherAsFather = sub({
      people: [
        { id: 'p1', name: 'ريم', gender: 'female', fatherId: 's', status: 'proposed' },
        { id: 'p2', name: 'فهد', gender: 'male', fatherId: 'p1', status: 'proposed' },
      ],
    });
    expect(takeIn(file, motherAsFather, 'u1').problem).toBe('bad-person');
    expect(takeIn(file, sub(), 'u1', { limit: 7 }).problem).toBe('too-many');
  });

  it('warn about a sibling with the same name', () => {
    const r = takeIn(
      file,
      sub({ people: [{ id: 'p1', name: 'صالح', gender: 'male', fatherId: 's', status: 'proposed' }] }),
      'u1',
    );
    expect(r.file!.submissions[0]!.warnings?.[0]).toContain('صالح');
  });

  it('replace the earlier one after a request for changes', () => {
    const first = takeIn(file, sub(), 'u1').file!;
    const sentBack: TreeFile = {
      ...first,
      submissions: first.submissions.map((x) => ({ ...x, status: 'changes' as const })),
    };
    const fixed = takeIn(
      sentBack,
      sub({
        id: 'sub2',
        replaces: 'sub1',
        people: [{ id: 'p1', name: 'فهد', gender: 'male', fatherId: 's', status: 'proposed' }],
      }),
      'u1',
    ).file!;
    expect(fixed.submissions.map((x) => x.id)).toEqual(['sub2']);
    expect(fixed.people.filter((p) => p.id.startsWith('p')).map((p) => p.id)).toEqual(['p1']);
    // Someone else cannot replace it.
    expect(
      takeIn(sentBack, sub({ id: 'sub3', replaces: 'sub1' }), 'u2').problem,
    ).toBe('taken-id');
  });

  it('can be taken back while they wait', () => {
    const r = takeIn(file, sub(), 'u1').file!;
    const back = takeOut(r, 'sub1');
    expect(back.submissions).toHaveLength(0);
    expect(back.people).toHaveLength(file.people.length);
  });
});

describe('merging the new parts of the file', () => {
  it('keeps both sides of the log and the latest settings', () => {
    const base = { ...file, log: [] };
    const local: TreeFile = {
      ...base,
      settings: { showDaughtersToVisitors: true, showDeceased: true, showBirthYears: true },
      log: [{ id: 'l1', who: 'أ', action: 'add', text: 'أضاف', at: '2026-10-24T10:00:00Z' }],
    };
    const remote: TreeFile = {
      ...base,
      log: [{ id: 'l2', who: 'ب', action: 'approve', text: 'اعتمد', at: '2026-10-24T11:00:00Z' }],
    };
    const merged = mergeTreeFiles(base, local, remote);
    expect(merged.log?.map((l) => l.id)).toEqual(['l2', 'l1']);
    expect(merged.settings?.showDaughtersToVisitors).toBe(true);
  });
});
