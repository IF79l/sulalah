import { describe, expect, it } from 'vitest';
import {
  TreeFileError,
  fromCsv,
  generateTreeKey,
  keyFromRecoveryCode,
  openTree,
  recoveryCode,
  sealTree,
  toCsv,
  type TreeFile,
} from './treefile';

const file: TreeFile = {
  format: 'sulalah-tree',
  version: 1,
  tree: { id: 't1', title: 'شجرة آل السهلي', family: 'السهلي', rootId: 'm', ancestors: ['سليمان', 'حمد', 'السهلي'] },
  people: [
    { id: 'm', name: 'محمد', gender: 'male', fatherId: null, status: 'approved', deceased: true, birthYear: 1921 },
    { id: 'a', name: 'عبدالله', gender: 'male', fatherId: 'm', status: 'approved' },
    { id: 'n', name: 'نورة, "الكبرى"', gender: 'female', fatherId: 'm', status: 'approved', bio: 'سطر\nوسطر' },
    { id: 'p', name: 'سعود', gender: 'male', fatherId: 'a', status: 'proposed' },
  ],
  unions: [],
  submissions: [],
  updatedAt: '2026-10-23T00:00:00Z',
};

describe('sealed tree file', () => {
  it('opens with the right key and keeps every field', async () => {
    const key = generateTreeKey();
    const sealed = await sealTree(file, key);
    expect(JSON.stringify(sealed)).not.toContain('محمد');
    expect(await openTree(sealed, key)).toEqual(file);
  });

  it('refuses a wrong key, a tampered file and a file moved to another tree', async () => {
    const key = generateTreeKey();
    const sealed = await sealTree(file, key);
    await expect(openTree(sealed, generateTreeKey())).rejects.toThrow(TreeFileError);
    const flipped = sealed.data.slice(0, 10) + (sealed.data[10] === 'A' ? 'B' : 'A') + sealed.data.slice(11);
    await expect(openTree({ ...sealed, data: flipped }, key)).rejects.toThrow('wrong-key');
    await expect(openTree({ ...sealed, treeId: 't2' }, key)).rejects.toThrow('wrong-key');
    await expect(openTree({ hello: 1 }, key)).rejects.toThrow('not-a-tree');
  });

  it('turns the key into a recovery code and back, forgiving case and look-alike letters', () => {
    const key = generateTreeKey();
    const code = recoveryCode(key);
    expect(code).toMatch(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/);
    expect(keyFromRecoveryCode(code.toLowerCase().replace(/0/g, 'o'))).toBe(key);
    expect(() => keyFromRecoveryCode('ABCD-EFGH')).toThrow('bad-recovery-code');
  });
});

describe('csv', () => {
  it('round-trips approved people, commas, quotes and line breaks included', () => {
    const csv = toCsv(file.people);
    expect(csv.startsWith('﻿المعرف,الاسم')).toBe(true);
    const back = fromCsv(csv);
    expect(back.issues).toEqual([]);
    expect(back.rootId).toBe('m');
    expect(back.people.map((p) => p.id)).toEqual(['m', 'a', 'n']);
    expect(back.people[2]).toMatchObject({ name: 'نورة, "الكبرى"', gender: 'female', bio: 'سطر\nوسطر' });
    expect(back.people[0]).toMatchObject({ deceased: true, birthYear: 1921 });
  });

  it('reads English headers, tabs and Arabic digits', () => {
    const r = fromCsv('id\tname\tgender\tfather_id\tbirth_year\n1\tمحمد\tmale\t\t١٩٢١\n2\tنورة\tf\t1\t\n');
    expect(r.issues).toEqual([]);
    expect(r.people[0]!.birthYear).toBe(1921);
    expect(r.people[1]).toMatchObject({ gender: 'female', fatherId: '1' });
  });

  it('reports what cannot be placed, by line', () => {
    const r = fromCsv(
      ['المعرف,الاسم,الجنس,معرف الأب', '1,محمد,ذكر,', '2,,ذكر,1', '3,نورة,أنثى,1', '4,سعد,ذكر,3', '5,خالد,ذكر,9', '1,مكرر,ذكر,'].join('\n'),
    );
    const msgs = r.issues.map((i) => `${i.line}: ${i.message}`);
    expect(msgs).toContain('3: صف بدون اسم');
    expect(msgs).toContain('7: المعرف 1 مكرر');
    expect(msgs.some((m) => m.startsWith('5:') && m.includes('أنثى'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('6:') && m.includes('غير موجود'))).toBe(true);
    expect(r.rootId).toBe('1');
  });

  it('catches a lineage that loops back on itself', () => {
    const r = fromCsv('id,name,father_id\n1,أ,\n2,ب,3\n3,ج,2\n');
    expect(r.issues.some((i) => i.message.includes('يرجع لنفسه'))).toBe(true);
  });
});
