import { seededRandom } from './random';
import type { Box, Branch2D, Lineage, LineageNode, PersonMark, TreeLayout2D, Vec2 } from './types';

export interface Layout2DOptions {
  trunkHeight: number;
  trunkWidth: number;
  /** Smallest horizontal canopy radius; it grows automatically so leaves never crowd. */
  minCanopyRadius: number;
  /** Space each leaf needs along its ring, in world units. */
  leafSpacing: number;
  /**
   * How far the crown wraps around its centre, in radians from straight up. Past 90° the
   * lowest leaves hang beside the trunk, like a full family-tree poster.
   */
  fanAngle: number;
  /** Crown width relative to its height; below 1 makes an upright egg. */
  canopyAspect: number;
}

export const defaultLayout2DOptions: Layout2DOptions = {
  trunkHeight: 500,
  trunkWidth: 150,
  minCanopyRadius: 420,
  leafSpacing: 64,
  fanAngle: (118 * Math.PI) / 180,
  canopyAspect: 0.92,
};

/** How far a father's leaves sit from his branch end, and the angle between neighbours. */
const LEAF_BASE = 44;
const LEAF_STEP = 0.6;

/** How many leaves (childless people) hang under a node; sets how thick its wood is. */
function leafCount(node: LineageNode, memo: Map<string, number>): number {
  const hit = memo.get(node.person.id);
  if (hit !== undefined) return hit;
  const n =
    node.children.length === 0 ? 1 : node.children.reduce((s, c) => s + leafCount(c, memo), 0);
  memo.set(node.person.id, n);
  return n;
}

/** Depth of the youngest father; leaves hang beyond it. */
function maxForkDepth(node: LineageNode): number {
  if (node.children.length === 0) return 0;
  return node.children.reduce((m, c) => Math.max(m, maxForkDepth(c)), node.depth);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Lays the family out as a tree seen from the front: the root ancestor is the trunk,
 * every father is a branch, and each of his children is a leaf (or a further branch
 * if they have children of their own). The crown is an upright egg filled from the
 * centre outward, one generation per ring. Output is deterministic for the same data.
 */
export function layoutTree2D(
  lineage: Lineage,
  options: Partial<Layout2DOptions> = {},
): TreeLayout2D {
  const o = { ...defaultLayout2DOptions, ...options };
  const memo = new Map<string, number>();
  leafCount(lineage.root, memo);
  // Fathers sit on rings, one generation per ring; their children's leaves cluster round them.
  const forkDepth = Math.max(1, maxForkDepth(lineage.root));
  const ringOf = (depth: number) => 0.14 + 0.86 * Math.pow(depth / forkDepth, 0.85);

  // The crown is sized by area, so it fills in like a poster instead of a thin outer rim.
  const people = lineage.root.weight;
  const area = people * o.leafSpacing * o.leafSpacing * 2;
  const rx = Math.min(
    9000,
    Math.max(o.minCanopyRadius, Math.sqrt((area * o.canopyAspect) / Math.PI)),
  );
  const ry = rx / o.canopyAspect;

  const trunkTop: Vec2 = [0, -o.trunkHeight];
  const center: Vec2 = [0, trunkTop[1] - ry * 0.62];
  const polar = (phi: number, ring: number): Vec2 => [
    center[0] + rx * ring * Math.sin(phi),
    center[1] - ry * ring * Math.cos(phi),
  ];
  const widthFor = (node: LineageNode) =>
    Math.min(o.trunkWidth * 0.5, 5 + 6 * Math.sqrt(memo.get(node.person.id) ?? 1));

  const branches: Branch2D[] = [];
  const marks: PersonMark[] = [];
  const root = lineage.root;

  branches.push({
    personId: root.person.id,
    parentId: null,
    kind: 'trunk',
    depth: 0,
    status: root.person.status,
    curve: [[0, 0], [6, -o.trunkHeight * 0.35], [-6, -o.trunkHeight * 0.7], trunkTop],
    widthStart: o.trunkWidth,
    widthEnd: o.trunkWidth * 0.62,
  });
  marks.push(markFor(root, 'root', [0, trunkTop[1] + o.trunkHeight * 0.2], 0));

  /** A father's childless children fan out round the end of his branch, continuing its heading. */
  const leafFan = (node: LineageNode, at: Vec2, heading: number) => {
    const leaves = node.children.filter((c) => c.children.length === 0);
    const k = leaves.length;
    const twoRows = k > 6;
    const step = Math.min(LEAF_STEP, (twoRows ? 4.4 : 3.4) / Math.max(1, k));
    leaves.forEach((leaf, i) => {
      const rand = seededRandom(leaf.person.id);
      const angle = heading + (i - (k - 1) / 2) * step + (rand() - 0.5) * 0.08;
      const reach = LEAF_BASE + (twoRows && i % 2 ? 62 : 0) + rand() * 6;
      const to: Vec2 = [at[0] + Math.sin(angle) * reach, at[1] - Math.cos(angle) * reach];
      const mid: Vec2 = [
        at[0] + Math.sin(angle) * reach * 0.5,
        at[1] - Math.cos(angle) * reach * 0.5,
      ];
      branches.push({
        personId: leaf.person.id,
        parentId: node.person.id,
        kind: 'twig',
        depth: leaf.depth,
        status: leaf.person.status,
        curve: [at, mid, mid, to],
        widthStart: 3.2,
        widthEnd: 1.6,
      });
      marks.push(markFor(leaf, 'leaf', to, angle));
    });
  };

  const place = (
    node: LineageNode,
    from: Vec2,
    phiP: number,
    ringP: number,
    start: number,
    span: number,
  ) => {
    const forks = node.children.filter((c) => c.children.length > 0);
    const forkWeight = forks.reduce((s, c) => s + c.weight, 0);
    let cursor = start;
    for (const child of forks) {
      const share = (child.weight / forkWeight) * span;
      const rand = seededRandom(child.person.id);
      const phi = cursor + share / 2 + (rand() - 0.5) * share * 0.14;
      const ring = Math.min(1, ringOf(child.depth) * (0.97 + rand() * 0.05));
      const to = polar(phi, ring);

      let origin = from;
      let c1: Vec2;
      let c2: Vec2;
      if (node === root) {
        // Sons rise out of the trunk; the outermost ones leave it lower down, as on a real tree.
        const low = Math.max(0, Math.min(1, (Math.abs(phi) - 1.5) / 0.9));
        origin = [
          Math.sign(phi) * o.trunkWidth * 0.14 * low,
          trunkTop[1] + o.trunkHeight * 0.24 * low,
        ];
        c1 = [lerp(origin[0], to[0], 0.1), lerp(origin[1], to[1], 0.5)];
        c2 = [lerp(origin[0], to[0], 0.6), lerp(origin[1], to[1], 0.9)];
      } else {
        // Follow the crown's rings: out from the father, then sweep round to the son.
        c1 = polar(lerp(phiP, phi, 0.2), lerp(ringP, ring, 0.45));
        c2 = polar(lerp(phiP, phi, 0.8), lerp(ringP, ring, 0.78));
      }
      branches.push({
        personId: child.person.id,
        parentId: node.person.id,
        kind: 'limb',
        depth: child.depth,
        status: child.person.status,
        curve: [origin, c1, c2, to],
        widthStart: widthFor(child) * (node === root ? 1.5 : 1.1),
        widthEnd: widthFor(child) * 0.72,
      });
      marks.push(markFor(child, 'fork', to, phi));
      leafFan(child, to, Math.atan2(to[0] - c2[0], -(to[1] - c2[1])));
      place(child, to, phi, ring, cursor, share);
      cursor += share;
    }
  };
  leafFan(root, trunkTop, 0);
  place(root, trunkTop, Math.PI, 0, -o.fanAngle, 2 * o.fanAngle);
  relaxLeaves(marks, branches);

  const markById = new Map(marks.map((m) => [m.personId, m]));
  const subtreeBox = new Map<string, Box>();
  const collect = (node: LineageNode): Vec2[] => {
    const own = markById.get(node.person.id)?.position;
    const pts = [...(own ? [own] : []), ...node.children.flatMap(collect)];
    subtreeBox.set(node.person.id, pad(boxOf(pts), 80));
    return pts;
  };
  collect(root);
  subtreeBox.set(
    root.person.id,
    pad(boxOf([[-o.trunkWidth * 1.4, 40], ...marks.map((m) => m.position)]), 100),
  );

  return {
    branches,
    marks,
    markById,
    subtreeBox,
    box: subtreeBox.get(root.person.id)!,
    canopyRadius: rx,
    canopy: { center, rx, ry },
    trunkTop,
    trunkHeight: o.trunkHeight,
    trunkWidth: o.trunkWidth,
  };
}

/**
 * Neighbouring fathers' leaf fans can land on top of each other. Nudge leaves apart (and off
 * the fathers' medallions) for a few rounds, re-aiming each twig at its leaf. Uses a grid so
 * it stays fast for large trees.
 */
function relaxLeaves(marks: PersonMark[], branches: Branch2D[], rounds = 24) {
  const reach = 40;
  const leafGap = 54;
  const forkGap = 62;
  const leaves = marks.filter((m) => m.kind === 'leaf');
  const forks = marks.filter((m) => m.kind !== 'leaf');
  const twig = new Map(branches.filter((b) => b.kind === 'twig').map((b) => [b.personId, b]));
  const centre = (m: PersonMark): Vec2 => [
    m.position[0] + Math.sin(m.angle) * reach,
    m.position[1] - Math.cos(m.angle) * reach,
  ];
  const cell = 80;
  const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (let round = 0; round < rounds; round++) {
    const pts = leaves.map(centre);
    const grid = new Map<string, number[]>();
    pts.forEach(([x, y], i) => {
      const k = key(x, y);
      grid.set(k, [...(grid.get(k) ?? []), i]);
    });
    const push: [number, number][] = pts.map(() => [0, 0]);
    let moved = false;
    pts.forEach(([x, y], i) => {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
            if (j <= i) continue;
            const [ox, oy] = pts[j]!;
            const d = Math.hypot(ox - x, oy - y) || 0.01;
            if (d >= leafGap) continue;
            const f = (leafGap - d) / 2 / d;
            push[i]![0] -= (ox - x) * f;
            push[i]![1] -= (oy - y) * f;
            push[j]![0] += (ox - x) * f;
            push[j]![1] += (oy - y) * f;
            moved = true;
          }
    });
    for (const fork of forks) {
      const [fx, fy] = fork.position;
      const gx = Math.floor(fx / cell);
      const gy = Math.floor(fy / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const i of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
            const [x, y] = pts[i]!;
            const d = Math.hypot(x - fx, y - fy) || 0.01;
            if (d >= forkGap) continue;
            push[i]![0] += ((x - fx) * (forkGap - d)) / d;
            push[i]![1] += ((y - fy) * (forkGap - d)) / d;
            moved = true;
          }
    }
    if (!moved) break;
    leaves.forEach((m, i) => {
      const [px, py] = push[i]!;
      if (px === 0 && py === 0) return;
      const b = twig.get(m.personId)!;
      const from = b.curve[0];
      const base: Vec2 = [m.position[0] + px * 0.6, m.position[1] + py * 0.6];
      m.angle = Math.atan2(base[0] - from[0], -(base[1] - from[1]));
      m.position = base;
      const mid: Vec2 = [(from[0] + base[0]) / 2, (from[1] + base[1]) / 2];
      b.curve = [from, mid, mid, base];
    });
  }
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
