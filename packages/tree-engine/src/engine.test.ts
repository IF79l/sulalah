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
