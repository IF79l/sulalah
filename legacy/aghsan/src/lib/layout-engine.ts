import { Person } from '../types';

export interface LayoutNode {
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  isExpanded: boolean;
  hasChildren: boolean;
  childCount: number;
  hiddenDescendantCount: number;
}

export interface LayoutLink {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: 'parent_child' | 'marriage';
  isPending?: boolean;
}

export interface TreeLayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

const NODE_WIDTH = 210;
const NODE_HEIGHT = 88;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 110;

/**
 * Calculates tree layout with expand/collapse states and hierarchical positioning.
 */
export function computeTreeLayout(
  people: Person[],
  rootId: string,
  collapsedNodeIds: Set<string> = new Set()
): TreeLayoutResult {
  const peopleMap = new Map<string, Person>();
  people.forEach(p => peopleMap.set(p.id, p));

  const root = peopleMap.get(rootId);
  if (!root) {
    return {
      nodes: [],
      links: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 }
    };
  }

  // Build parent -> children map
  const childrenMap = new Map<string, string[]>();
  people.forEach(p => {
    if (p.fatherId) {
      const arr = childrenMap.get(p.fatherId) || [];
      arr.push(p.id);
      childrenMap.set(p.fatherId, arr);
    }
  });

  // Calculate descendant counts
  function countDescendants(pId: string): number {
    const kids = childrenMap.get(pId) || [];
    let count = kids.length;
    for (const kid of kids) {
      count += countDescendants(kid);
    }
    return count;
  }

  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];

  // Recursive subtree width calculation for non-overlapping placement
  function calculateSubtreeWidth(personId: string): number {
    const isCollapsed = collapsedNodeIds.has(personId);
    const children = childrenMap.get(personId) || [];

    if (children.length === 0 || isCollapsed) {
      return NODE_WIDTH;
    }

    let totalWidth = 0;
    children.forEach((childId, idx) => {
      const w = calculateSubtreeWidth(childId);
      totalWidth += w;
      if (idx < children.length - 1) {
        totalWidth += HORIZONTAL_GAP;
      }
    });

    return Math.max(NODE_WIDTH, totalWidth);
  }

  // Recursive placement
  function layoutNode(
    personId: string,
    centerX: number,
    depth: number
  ): void {
    const person = peopleMap.get(personId);
    if (!person) return;

    const isCollapsed = collapsedNodeIds.has(personId);
    const children = childrenMap.get(personId) || [];
    const y = depth * (NODE_HEIGHT + VERTICAL_GAP);

    nodes.push({
      person,
      x: centerX - NODE_WIDTH / 2,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      isExpanded: !isCollapsed,
      hasChildren: children.length > 0,
      childCount: children.length,
      hiddenDescendantCount: isCollapsed ? countDescendants(personId) : 0
    });

    // If collapsed, don't layout descendants
    if (isCollapsed || children.length === 0) return;

    // Calculate positions for each child
    const childWidths = children.map(cId => calculateSubtreeWidth(cId));
    const totalChildrenSpan =
      childWidths.reduce((sum, w) => sum + w, 0) +
      (children.length - 1) * HORIZONTAL_GAP;

    let currentLeft = centerX - totalChildrenSpan / 2;

    children.forEach((childId, idx) => {
      const cWidth = childWidths[idx];
      const childCenterX = currentLeft + cWidth / 2;

      // Link from parent to child
      links.push({
        id: `link-${personId}-${childId}`,
        sourceId: personId,
        targetId: childId,
        sourceX: centerX,
        sourceY: y + NODE_HEIGHT,
        targetX: childCenterX,
        targetY: (depth + 1) * (NODE_HEIGHT + VERTICAL_GAP),
        type: 'parent_child'
      });

      layoutNode(childId, childCenterX, depth + 1);
      currentLeft += cWidth + HORIZONTAL_GAP;
    });
  }

  // Start layout from root
  layoutNode(rootId, 0, 0);

  // Compute bounding box
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  if (nodes.length > 0) {
    minX = Math.min(...nodes.map(n => n.x));
    maxX = Math.max(...nodes.map(n => n.x + n.width));
    minY = Math.min(...nodes.map(n => n.y));
    maxY = Math.max(...nodes.map(n => n.y + n.height));
  }

  return {
    nodes,
    links,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(400, maxX - minX + 160),
      height: Math.max(400, maxY - minY + 160)
    }
  };
}
