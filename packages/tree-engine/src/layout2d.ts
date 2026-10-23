import { seededRandom } from './random';
import type { Box, Branch2D, Lineage, LineageNode, PersonMark, TreeLayout2D, Vec2 } from './types';

export interface Layout2DOptions {
  trunkHeight: number;
  trunkWidth: number;
  /** Smallest canopy radius; it grows automatically so leaves never crowd. */
  minCanopyRadius: number;
  /** Space each leaf needs along its ring, in world units. */
  leafSpacing: number;
  /** Half-width of the canopy fan, in radians from straight up. */
  fanAngle: number;
}

export const defaultLayout2DOptions: Layout2DOptions = {
  trunkHeight: 260,
  trunkWidth: 92,
  minCanopyRadius: 320,
  leafSpacing: 86,
  fanAngle: (105 * Math.PI) / 180,
};

/** How many leaves (childless people) hang under a node; sets its share of the canopy. */
function leafCount(node: LineageNode, memo: Map<string, number>): number {
  const hit = memo.get(node.person.id);
  if (hit !== undefined) return hit;
  const n =
    node.children.length === 0 ? 1 : node.children.reduce((s, c) => s + leafCount(c, memo), 0);
  memo.set(node.person.id, n);
  return n;
}

function maxDepth(node: LineageNode): number {
  return node.children.reduce((m, c) => Math.max(m, maxDepth(c)), node.depth);
}

/**
 * Lays the family out as a tree seen from the front: the root ancestor is the trunk,
 * every father is a branch, and each of his children is a leaf (or a further branch
 * if they have children of their own). Output is deterministic for the same data.
 */
export function layoutTree2D(
  lineage: Lineage,
  options: Partial<Layout2DOptions> = {},
): TreeLayout2D {
  const o = { ...defaultLayout2DOptions, ...options };
  const memo = new Map<string, number>();
  const total = leafCount(lineage.root, memo);
  const depthMax = Math.max(1, maxDepth(lineage.root));
  const ringOf = (depth: number) => Math.pow(depth / depthMax, 0.72);

  // Grow the canopy until the tightest ring has room for every leaf on it.
  const wedge = (2 * o.fanAngle) / total;
  let radius = o.minCanopyRadius;
  const walkForRadius = (node: LineageNode) => {
    if (node.depth > 0 && node.children.length === 0) {
      radius = Math.max(radius, o.leafSpacing / (wedge * ringOf(node.depth)));
    }
    node.children.forEach(walkForRadius);
  };
  walkForRadius(lineage.root);
  radius = Math.min(radius, 6000);

  const trunkTop: Vec2 = [0, -o.trunkHeight];
  const canopyCenter: Vec2 = [0, -o.trunkHeight - radius * 0.12];
  const pointAt = (angle: number, r: number): Vec2 => [
    canopyCenter[0] + r * Math.sin(angle),
    canopyCenter[1] - r * Math.cos(angle) * 0.92,
  ];
  const widthFor = (node: LineageNode) =>
    Math.min(o.trunkWidth * 0.7, 6 + 5.5 * Math.sqrt(memo.get(node.person.id) ?? 1));

  const branches: Branch2D[] = [];
  const marks: PersonMark[] = [];
  const root = lineage.root;

  branches.push({
    personId: root.person.id,
    parentId: null,
    kind: 'trunk',
    depth: 0,
    status: root.person.status,
    curve: [[0, 0], [10, -o.trunkHeight * 0.35], [-8, -o.trunkHeight * 0.7], trunkTop],
    widthStart: o.trunkWidth * 1.25,
    widthEnd: o.trunkWidth * 0.72,
  });
  marks.push(markFor(root, 'root', [0, -o.trunkHeight * 0.45], 0));

  const place = (node: LineageNode, from: Vec2, fromAngle: number, start: number, end: number) => {
    let cursor = start;
    for (const child of node.children) {
      const share = ((memo.get(child.person.id) ?? 1) / total) * 2 * o.fanAngle;
      const rand = seededRandom(child.person.id);
      const mid = cursor + share / 2 + (rand() - 0.5) * share * 0.18;
      const isLeaf = child.children.length === 0;
      const r =
        radius * ringOf(child.depth) * (isLeaf ? 0.96 + rand() * 0.08 : 0.94 + rand() * 0.06);
      const to = pointAt(mid, r);
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      // Leave the parent along its own heading, arrive pointing outward: reads as grown wood.
      const c1: Vec2 = [
        from[0] + Math.sin(fromAngle) * len * 0.42,
        from[1] - Math.cos(fromAngle) * len * 0.42,
      ];
      const c2: Vec2 = [to[0] - Math.sin(mid) * len * 0.3, to[1] + Math.cos(mid) * len * 0.3];
      branches.push({
        personId: child.person.id,
        parentId: node.person.id,
        kind: isLeaf ? 'twig' : 'limb',
        depth: child.depth,
        status: child.person.status,
        curve: [from, c1, c2, to],
        widthStart: isLeaf ? 3 : widthFor(node) * 0.82,
        widthEnd: isLeaf ? 1.5 : widthFor(child) * 0.7,
      });
      marks.push(markFor(child, isLeaf ? 'leaf' : 'fork', to, mid));
      if (!isLeaf) place(child, to, mid, cursor, cursor + share);
      cursor += share;
    }
  };
  place(root, trunkTop, 0, -o.fanAngle, o.fanAngle);

  const markById = new Map(marks.map((m) => [m.personId, m]));
  const subtreeBox = new Map<string, Box>();
  const collect = (node: LineageNode): Vec2[] => {
    const own = markById.get(node.person.id)?.position;
    const pts = [...(own ? [own] : []), ...node.children.flatMap(collect)];
    subtreeBox.set(node.person.id, pad(boxOf(pts), 70));
    return pts;
  };
  collect(root);
  subtreeBox.set(root.person.id, pad(boxOf([[0, 0], ...marks.map((m) => m.position)]), 90));

  return {
    branches,
    marks,
    markById,
    subtreeBox,
    box: subtreeBox.get(root.person.id)!,
    canopyRadius: radius,
    trunkTop,
  };
}

function markFor(
  node: LineageNode,
  kind: PersonMark['kind'],
  position: Vec2,
  angle: number,
): PersonMark {
  return {
    personId: node.person.id,
    name: node.person.name,
    gender: node.person.gender,
    status: node.person.status,
    deceased: node.person.deceased ?? false,
    depth: node.depth,
    kind,
    position,
    angle,
    spouseIds: node.spouseIds,
  };
}

export function boxOf(points: readonly Vec2[]): Box {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of points) {
    b.minX = Math.min(b.minX, x);
    b.minY = Math.min(b.minY, y);
    b.maxX = Math.max(b.maxX, x);
    b.maxY = Math.max(b.maxY, y);
  }
  return b;
}

const pad = (b: Box, p: number): Box => ({
  minX: b.minX - p,
  minY: b.minY - p,
  maxX: b.maxX + p,
  maxY: b.maxY + p,
});

/** Point on a cubic Bezier at t. */
export function bezierPoint(c: Branch2D['curve'], t: number): Vec2 {
  const u = 1 - t;
  const [p0, p1, p2, p3] = c;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/**
 * Closed SVG path for a tapered branch, drawn up to `progress` (0..1) so a new branch can grow.
 * Built by offsetting the centre curve to both sides.
 */
export function branchOutline(branch: Branch2D, progress = 1, samples = 18): string {
  const end = Math.max(0.001, Math.min(1, progress));
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * end;
    const p = bezierPoint(branch.curve, t);
    const q = bezierPoint(branch.curve, Math.min(1, t + 0.01));
    const dx = q[0] - p[0] || 1e-6;
    const dy = q[1] - p[1];
    const n = Math.hypot(dx, dy);
    const w = (branch.widthStart + (branch.widthEnd - branch.widthStart) * t) / 2;
    left.push([p[0] - (dy / n) * w, p[1] + (dx / n) * w]);
    right.push([p[0] + (dy / n) * w, p[1] - (dx / n) * w]);
  }
  const f = (v: Vec2) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  return `M${left.map(f).join('L')}L${right.reverse().map(f).join('L')}Z`;
}
