import type { Lineage, LineageNode, LineagePerson, LineageUnion } from './types';

/**
 * Builds the paternal lineage tree that the branches follow.
 * Mothers and spouses are attached as relations, never as child branches.
 */
export function buildLineage(
  people: readonly LineagePerson[],
  rootId: string,
  unions: readonly LineageUnion[] = [],
): Lineage {
  const people_ = new Map(people.map((p) => [p.id, p]));
  const rootPerson = people_.get(rootId);
  if (!rootPerson) throw new Error(`Root person ${rootId} not found`);

  const childrenOf = new Map<string, LineagePerson[]>();
  for (const p of people) {
    if (p.id === rootId || !p.fatherId) continue;
    const list = childrenOf.get(p.fatherId) ?? [];
    list.push(p);
    childrenOf.set(p.fatherId, list);
  }

  const spouses = new Map<string, string[]>();
  for (const u of unions) {
    spouses.set(u.aId, [...(spouses.get(u.aId) ?? []), u.bId]);
    spouses.set(u.bId, [...(spouses.get(u.bId) ?? []), u.aId]);
  }

  const byId = new Map<string, LineageNode>();
  const visit = (person: LineagePerson, parentId: string | null, depth: number): LineageNode => {
    const node: LineageNode = {
      person,
      parentId,
      children: [],
      spouseIds: spouses.get(person.id) ?? [],
      depth,
      weight: 1,
    };
    byId.set(person.id, node);
    // Stable order: approved first, then by id, so adding a sibling never reshuffles the others.
    const kids = [...(childrenOf.get(person.id) ?? [])].sort(
      (a, b) =>
        Number(a.status === 'proposed') - Number(b.status === 'proposed') ||
        a.id.localeCompare(b.id),
    );
    for (const kid of kids) {
      if (byId.has(kid.id)) continue;
      const child = visit(kid, person.id, depth + 1);
      node.children.push(child);
      node.weight += child.weight;
    }
    return node;
  };

  const root = visit(rootPerson, null, 0);
  const orphans = people.filter((p) => !byId.has(p.id) && !isSpouseOnly(p, spouses));
  return { root, byId, orphans };
}

function isSpouseOnly(person: LineagePerson, spouses: Map<string, string[]>): boolean {
  return !person.fatherId && (spouses.get(person.id)?.length ?? 0) > 0;
}

/** Ancestors from the root down to the given person, e.g. محمد ← متروك ← سالم. */
export function pathTo(lineage: Lineage, personId: string): LineageNode[] {
  const path: LineageNode[] = [];
  let node = lineage.byId.get(personId);
  while (node) {
    path.unshift(node);
    node = node.parentId ? lineage.byId.get(node.parentId) : undefined;
  }
  return path;
}

/** True if making `childId` a child of `parentId` would create a cycle. */
export function wouldCreateCycle(lineage: Lineage, childId: string, parentId: string): boolean {
  return childId === parentId || pathTo(lineage, parentId).some((n) => n.person.id === childId);
}
