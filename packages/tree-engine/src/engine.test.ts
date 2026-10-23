import { describe, expect, it } from 'vitest';
import {
  buildLineage,
  demoFamily,
  layoutTree,
  pathTo,
  shotForBranch,
  wouldCreateCycle,
} from './index';

describe('lineage', () => {
  it('builds the paternal tree from the root', () => {
    const lineage = buildLineage(demoFamily, 'mohammed');
    expect(lineage.root.children.map((c) => c.person.id)).toEqual([
      'abdullah',
      'daifallah',
      'matrouk',
    ]);
    expect(lineage.root.weight).toBe(demoFamily.length);
    expect(pathTo(lineage, 'salem').map((n) => n.person.name)).toEqual([
      'محمد بن عبدالله',
      'متروك',
      'سالم',
    ]);
  });

  it('detects cycles before they are written', () => {
    const lineage = buildLineage(demoFamily, 'mohammed');
    expect(wouldCreateCycle(lineage, 'matrouk', 'salem')).toBe(true);
    expect(wouldCreateCycle(lineage, 'khaled', 'salem')).toBe(false);
  });

  it('attaches a proposed grandson under the right father', () => {
    const people = [
      ...demoFamily,
      {
        id: 'fahad',
        name: 'فهد',
        gender: 'male' as const,
        fatherId: 'salem',
        status: 'proposed' as const,
      },
      {
        id: 'mohammed2',
        name: 'محمد',
        gender: 'male' as const,
        fatherId: 'fahad',
        status: 'proposed' as const,
      },
    ];
    const lineage = buildLineage(people, 'mohammed');
    expect(lineage.byId.get('mohammed2')?.parentId).toBe('fahad');
    expect(lineage.byId.get('fahad')?.depth).toBe(3);
  });
});

describe('layout', () => {
  it('is deterministic', () => {
    const a = layoutTree(buildLineage(demoFamily, 'mohammed'));
    const b = layoutTree(buildLineage(demoFamily, 'mohammed'));
    expect(a.branches).toEqual(b.branches);
  });

  it('does not move existing branches when a sibling-free leaf is added', () => {
    const before = layoutTree(buildLineage(demoFamily, 'mohammed'));
    const after = layoutTree(
      buildLineage(
        [
          ...demoFamily,
          { id: 'fahad', name: 'فهد', gender: 'male', fatherId: 'salem', status: 'proposed' },
        ],
        'mohammed',
      ),
    );
    expect(after.byId.get('khaled')?.tip).toEqual(before.byId.get('khaled')?.tip);
    expect(after.byId.get('fahad')?.points[0]).toEqual(after.byId.get('salem')?.tip);
  });

  it('frames a branch with the camera', () => {
    const layout = layoutTree(buildLineage(demoFamily, 'mohammed'));
    const shot = shotForBranch(layout, 'matrouk');
    expect(shot?.target).toEqual(layout.subtreeBounds.get('matrouk')?.center);
  });
});
