import { describe, expect, it } from 'vitest';
import {
  branchOutline,
  buildLineage,
  demoFamily,
  flyTo,
  layoutTree2D,
  pathTo,
  viewForBox,
  wouldCreateCycle,
  type LineagePerson,
  type TreeLayout2D,
} from './index';

const sprout = (id: string, fatherId: string): LineagePerson => ({
  id,
  name: id,
  gender: 'male',
  fatherId,
  status: 'proposed',
});

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
    const lineage = buildLineage(
      [...demoFamily, sprout('fahad', 'salem'), sprout('m2', 'fahad')],
      'mohammed',
    );
    expect(lineage.byId.get('m2')?.parentId).toBe('fahad');
    expect(lineage.byId.get('fahad')?.depth).toBe(3);
  });
});

/** Smallest distance between any two leaves, sampled at the base half and tip half of each blade. */
function closestLeaves(layout: TreeLayout2D): number {
  const tips = layout.marks
    .filter((m) => m.kind === 'leaf')
    .flatMap((m) =>
      [24, 58].map((a) => [
        m.position[0] + Math.sin(m.angle) * a,
        m.position[1] - Math.cos(m.angle) * a,
        layout.marks.indexOf(m),
      ]),
    );
  let closest = Infinity;
  for (let i = 0; i < tips.length; i++)
    for (let j = i + 1; j < tips.length; j++)
      if (tips[i]![2] !== tips[j]![2])
        closest = Math.min(
          closest,
          Math.hypot(tips[i]![0]! - tips[j]![0]!, tips[i]![1]! - tips[j]![1]!),
        );
  return closest;
}

describe('2D layout', () => {
  const layout = layoutTree2D(buildLineage(demoFamily, 'mohammed'));

  it('makes fathers branches and childless children leaves', () => {
    expect(layout.markById.get('mohammed')?.kind).toBe('root');
    expect(layout.markById.get('matrouk')?.kind).toBe('fork');
    expect(layout.markById.get('hessa')?.kind).toBe('leaf');
    expect(layout.branches.find((b) => b.personId === 'hessa')?.kind).toBe('twig');
  });

  it('grows every branch from its father', () => {
    for (const b of layout.branches) {
      if (!b.parentId || b.parentId === 'mohammed') continue;
      expect(b.curve[0]).toEqual(layout.markById.get(b.parentId)?.position);
    }
  });

  it('keeps the canopy above the trunk', () => {
    for (const m of layout.marks) if (m.kind !== 'root') expect(m.position[1]).toBeLessThan(0);
  });

  it('is deterministic', () => {
    expect(layoutTree2D(buildLineage(demoFamily, 'mohammed')).marks).toEqual(layout.marks);
  });

  it('turns a new child into a leaf and its father into a branch', () => {
    const next = layoutTree2D(buildLineage([...demoFamily, sprout('fahad', 'hessa')], 'mohammed'));
    expect(next.markById.get('hessa')?.kind).toBe('fork');
    expect(next.markById.get('fahad')?.status).toBe('proposed');
  });

  it('keeps named leaves from piling on top of each other', () => {
    expect(closestLeaves(layout)).toBeGreaterThan(40);
  });

  it('keeps a big family of leaves apart when many are added to one father', () => {
    const many = [
      ...Array.from({ length: 14 }, (_, i) => sprout(`kid-${i}`, 'yousef-s0')),
      ...Array.from({ length: 10 }, (_, i) => sprout(`girl-kid-${i}`, 'yousef-d0')),
    ];
    const next = layoutTree2D(buildLineage([...demoFamily, ...many], 'mohammed'));
    expect(closestLeaves(next)).toBeGreaterThan(40);
  });

  it('draws a closed outline that can be partly grown', () => {
    const b = layout.branches[1]!;
    expect(branchOutline(b)).toMatch(/^M.*Z$/);
    expect(branchOutline(b, 0.3).length).toBeGreaterThan(10);
  });
});

describe('camera', () => {
  it('flies between views and lands exactly', () => {
    const layout = layoutTree2D(buildLineage(demoFamily, 'mohammed'));
    const from = viewForBox(layout.box, 1.6);
    const to = viewForBox(layout.subtreeBox.get('matrouk')!, 1.6);
    const path = flyTo(from, to);
    expect(path.at(0).width).toBeCloseTo(from.width);
    expect(path.at(1).cx).toBeCloseTo(to.cx);
    expect(path.at(1).width).toBeCloseTo(to.width);
    expect(to.width).toBeLessThan(from.width);
  });
});
