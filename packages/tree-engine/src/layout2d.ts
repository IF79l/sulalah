import { seededRandom } from './random';
import type { Box, Branch2D, Lineage, LineageNode, PersonMark, TreeLayout2D, Vec2 } from './types';

export interface Layout2DOptions {
  trunkHeight: number;
  trunkWidth: number;
  /** Smallest distance from the crown's centre to the root's sons. */
  innerRadius: number;
  /**
   * How far the crown wraps around its centre, in radians from straight up. Past 90° the
   * lowest leaves hang beside the trunk, like a full family-tree poster.
   */
  fanAngle: number;
  /** Crown height relative to its width; above 1 makes an upright egg. */
  canopyStretch: number;
}

export const defaultLayout2DOptions: Layout2DOptions = {
  trunkHeight: 500,
  trunkWidth: 150,
  innerRadius: 170,
  fanAngle: (112 * Math.PI) / 180,
  canopyStretch: 1.1,
};

/** How far a father's leaves sit from his branch end, and the angle between neighbours. */
const LEAF_BASE = 44;
const LEAF_STEP = 0.6;
/** Widest fan, in radians, so leaves never fold back over their father's own branch. */
const LEAF_SPREAD = 2.2;
/** Gap between rows of leaves, base to base. */
const LEAF_ROW = 92;
/** Blade length, from a leaf's base to its middle, and the width a leaf needs beside its neighbour. */
const LEAF_LENGTH = 80;
const LEAF_REACH = 40;
const LEAF_SLOT = 64;
/** Largest father's medallion radius the renderer draws. */
const MEDAL = 44;

type Slot = { angle: number; reach: number };

/**
 * Where a father's k leaves go, relative to the direction his branch points: rows fill
 * outward, each holding as many leaves as fit side by side on its arc.
 */
function fanSlots(k: number): Slot[] {
  const slots: Slot[] = [];
  let row = 0;
  while (slots.length < k) {
    const reach = LEAF_BASE + row * LEAF_ROW;
    const fit = Math.max(1, Math.floor((LEAF_SPREAD * (reach + LEAF_REACH)) / LEAF_SLOT));
    const n = Math.min(fit, k - slots.length);
    const step = Math.min(LEAF_STEP, LEAF_SPREAD / Math.max(1, n - 1));
    const offset = row % 2 ? step / 2 : 0;
    for (let i = 0; i < n; i++) slots.push({ angle: (i - (n - 1) / 2) * step + offset, reach });
    row++;
  }
  return slots;
}

/** How far a father's fan reaches outward, and how wide it is across. */
function fanSize(k: number): { depth: number; width: number } {
  let depth = MEDAL;
  let half = MEDAL + 10;
  for (const { angle, reach } of fanSlots(k)) {
    const tip = reach + LEAF_LENGTH;
    const a = Math.min(Math.abs(angle), Math.PI / 2);
    depth = Math.max(depth, Math.cos(a) * tip + 20);
    // Half a blade's width past its midrib, on whichever side faces out.
    half = Math.max(half, Math.sin(a) * tip + 30);
  }
  return { depth, width: 2 * half };
}

/** How many leaves (childless people) hang under a node; sets how thick its wood is. */
function leafCount(node: LineageNode, memo: Map<string, number>): number {
  const hit = memo.get(node.person.id);
  if (hit !== undefined) return hit;
  const n =
    node.children.length === 0 ? 1 : node.children.reduce((s, c) => s + leafCount(c, memo), 0);
  memo.set(node.person.id, n);
  return n;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const leavesOf = (node: LineageNode) => node.children.filter((c) => c.children.length === 0);
const forksOf = (node: LineageNode) => node.children.filter((c) => c.children.length > 0);

/**
 * Lays the family out as a tree seen from the front: the root ancestor is the trunk,
 * every father is a branch, and each of his children is a leaf (or a further branch
 * if they have children of their own).
 *
 * Every family owns a slice of the crown that nobody else's wood or leaves enter. Fathers
 * sit on rings round the crown's centre, one generation per ring; each ring is set beyond
 * the leaves of the generation inside it and wide enough to hold its own generation's fans.
 * A father's slice is as wide as his own fan or his sons' slices together, whichever needs
 * more, and his sons divide it. Output is deterministic for the same data.
 */
export function layoutTree2D(
  lineage: Lineage,
  options: Partial<Layout2DOptions> = {},
): TreeLayout2D {
  const o = { ...defaultLayout2DOptions, ...options };
  const root = lineage.root;
  const memo = new Map<string, number>();
  leafCount(root, memo);
  const span = 2 * o.fanAngle;

  // Each son sits just beyond his father's leaves, so a family stays close round its father.
  const fans = new Map<string, { depth: number; width: number }>();
  const base = new Map<string, number>();
  const walk = (node: LineageNode, r: number) => {
    if (node === root) {
      node.children.forEach((c) => walk(c, o.innerRadius));
      return;
    }
    if (node.children.length === 0) return;
    const fan = fanSize(leavesOf(node).length);
    fans.set(node.person.id, fan);
    base.set(node.person.id, r);
    const next = r + fan.depth + MEDAL + 14;
    node.children.forEach((c) => walk(c, next));
  };
  walk(root, 0);

  // Outer generations crowd first, so they move out most and the trunk's sons least,
  // the way a real crown spreads wider as it climbs.
  let deepestFork = 1;
  for (const id of base.keys()) deepestFork = Math.max(deepestFork, lineage.byId.get(id)!.depth);
  const reachOf = (node: LineageNode) => Math.pow(node.depth / deepestFork, 0.7);

  // The slice each father needs: his own fan where he sits, or all his sons' slices.
  const need = new Map<string, number>();
  const needOf = (node: LineageNode, push: number): number => {
    const sons = forksOf(node).reduce((s, c) => s + needOf(c, push), 0);
    const own =
      node === root
        ? 0
        : fans.get(node.person.id)!.width / (base.get(node.person.id)! + push * reachOf(node));
    const n = Math.max(own, sons);
    need.set(node.person.id, n);
    return n;
  };
  // Slices that don't fit round the crown: move the generations outward until they do.
  let push = 0;
  if (needOf(root, 0) > span) {
    let lo = 0;
    let hi = 20000;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (needOf(root, mid) > span) lo = mid;
      else hi = mid;
    }
    push = hi;
  }
  needOf(root, push);
  const radiusOf = (node: LineageNode) => base.get(node.person.id)! + push * reachOf(node);
  let outer = o.innerRadius;
  for (const id of base.keys())
    outer = Math.max(outer, radiusOf(lineage.byId.get(id)!) + fans.get(id)!.depth);

  const stretch = o.canopyStretch;
  // Keep the lowest leaves well above the ground: a big crown stands on a taller trunk.
  const centreRise = o.innerRadius * 1.25;
  const lowest = outer * stretch * Math.max(0, -Math.cos(o.fanAngle));
  const trunkHeight = Math.max(o.trunkHeight, 300 + lowest - centreRise);
  const trunkTop: Vec2 = [0, -trunkHeight];
  const center: Vec2 = [0, trunkTop[1] - centreRise];
  const polar = (phi: number, r: number): Vec2 => [
    center[0] + r * Math.sin(phi),
    center[1] - r * stretch * Math.cos(phi),
  ];
  const widthFor = (node: LineageNode) =>
    Math.min(o.trunkWidth * 0.5, 5 + 6 * Math.sqrt(memo.get(node.person.id) ?? 1));

  const branches: Branch2D[] = [];
  const marks: PersonMark[] = [];

  branches.push({
    personId: root.person.id,
    parentId: null,
    kind: 'trunk',
    depth: 0,
    status: root.person.status,
    curve: [[0, 0], [6, -trunkHeight * 0.35], [-6, -trunkHeight * 0.7], trunkTop],
    widthStart: o.trunkWidth,
    widthEnd: o.trunkWidth * 0.62,
  });
  marks.push(markFor(root, 'root', [0, trunkTop[1] + 100], 0));

  /** A father's childless children fan out round the end of his branch, pointing outward. */
  const leafFan = (node: LineageNode, at: Vec2, heading: number) => {
    const leaves = leavesOf(node);
    const slots = fanSlots(leaves.length);
    leaves.forEach((leaf, i) => {
      const rand = seededRandom(leaf.person.id);
      const angle = heading + slots[i]!.angle + (rand() - 0.5) * 0.05;
      const reach = slots[i]!.reach + rand() * 4;
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

  /** Outward direction from the crown's centre at angle phi, as a heading (0 = up). */
  const outward = (phi: number) => Math.atan2(Math.sin(phi), stretch * Math.cos(phi));

  const place = (
    node: LineageNode,
    from: Vec2,
    phiP: number,
    rP: number,
    start: number,
    width: number,
  ) => {
    const forks = forksOf(node);
    const sum = forks.reduce((s, c) => s + need.get(c.person.id)!, 0);
    let cursor = start;
    for (const child of forks) {
      const share = (need.get(child.person.id)! / sum) * width;
      const rand = seededRandom(child.person.id);
      // A little jitter where the slice has room to spare keeps it from looking ruled.
      const own = fans.get(child.person.id)!.width / radiusOf(child);
      const slack = Math.max(0, share - own);
      const phi = cursor + share / 2 + (rand() - 0.5) * slack * 0.4;
      const r = radiusOf(child) + rand() * 8;
      const to = polar(phi, r);

      let origin = from;
      let c1: Vec2;
      let c2: Vec2;
      if (node === root) {
        // Sons rise out of the trunk; the outermost ones leave it lower down, as on a real tree.
        const low = Math.max(0, Math.min(1, (Math.abs(phi) - 1.4) / 0.6));
        origin = [Math.sign(phi) * o.trunkWidth * 0.14 * low, trunkTop[1] + 120 * low];
        c1 = [lerp(origin[0], to[0], 0.1), lerp(origin[1], to[1], 0.5)];
        c2 = [lerp(origin[0], to[0], 0.6), lerp(origin[1], to[1], 0.9)];
      } else {
        // Follow the crown's rings: out from the father, then sweep round to the son.
        c1 = polar(lerp(phiP, phi, 0.15), lerp(rP, r, 0.5));
        c2 = polar(phi, lerp(rP, r, 0.75));
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
      leafFan(child, to, outward(phi));
      place(child, to, phi, r, cursor, share);
      cursor += share;
    }
  };
  leafFan(root, trunkTop, 0);
  place(root, trunkTop, Math.PI, 0, -o.fanAngle, span);
  settleCrown(marks, branches);

  const markById = new Map(marks.map((m) => [m.personId, m]));
  const subtreeBox = new Map<string, Box>();
  const collect = (node: LineageNode): Vec2[] => {
    const own = markById.get(node.person.id)?.position;
    const pts = [...(own ? [own] : []), ...node.children.flatMap(collect)];
    subtreeBox.set(node.person.id, pad(boxOf(pts), 110));
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
    canopyRadius: outer,
    canopy: { center, rx: outer, ry: outer * stretch },
    trunkTop,
    trunkHeight,
    trunkWidth: o.trunkWidth,
  };
}

/**
 * The rings give every family a slice of the crown, but a family that grows fast (a leaf that
 * gains sons, then grandsons) can outgrow its slice. This settles the crown by pushing apart
 * anything that overlaps: medallions and leaves (each leaf modelled as two discs along its
 * midrib). Part of every push on a leaf moves its whole family, so crowded families drift
 * apart as a group and their fans keep their shape. Branches are then re-drawn to the settled
 * places. Uses a grid so it stays quick for large trees.
 */
function settleCrown(marks: PersonMark[], branches: Branch2D[]) {
  const MEDAL_R = 46;
  const LEAF_R = 23;
  const along = [24, 58];
  const cell = 2 * MEDAL_R;
  const parentOf = new Map(branches.map((b) => [b.personId, b.parentId]));
  const forks = marks.filter((m) => m.kind === 'fork');
  const leaves = marks.filter((m) => m.kind === 'leaf');
  const forkIndex = new Map(forks.map((m, i) => [m.personId, i]));
  const nf = forks.length;
  const nl = leaves.length;
  // Each leaf's father, as a fork index, or -1 when he is the (fixed) root.
  const fatherOf = Int32Array.from(leaves, (m) => forkIndex.get(parentOf.get(m.personId)!) ?? -1);
  const forkFather = Int32Array.from(forks, (m) => forkIndex.get(parentOf.get(m.personId)!) ?? -1);
  const fx = Float64Array.from(forks, (m) => m.position[0]);
  const fy = Float64Array.from(forks, (m) => m.position[1]);
  const lx = Float64Array.from(leaves, (m) => m.position[0]);
  const ly = Float64Array.from(leaves, (m) => m.position[1]);
  const la = Float64Array.from(leaves, (m) => m.angle);
  const fx0 = fx.slice();
  const fy0 = fy.slice();
  const kids: number[][] = forks.map(() => []);
  fatherOf.forEach((f, i) => f >= 0 && kids[f]!.push(i));

  // Discs: forks first (one each), then two per leaf. owner < nf is a fork, else a leaf.
  const nd = nf + 2 * nl;
  const dx = new Float64Array(nd);
  const dy = new Float64Array(nd);
  const dr = new Float64Array(nd);
  const pfx = new Float64Array(nf);
  const pfy = new Float64Array(nf);
  const plx = new Float64Array(nl);
  const ply = new Float64Array(nl);
  const key = (gx: number, gy: number) => gx * 100003 + gy;
  // Who a disc belongs to, as a family: a fork's own family is itself; a leaf's is its father.
  const family = (d: number) => (d < nf ? d : fatherOf[(d - nf) >> 1]!);
  const rounds = Math.round(Math.max(16, Math.min(200, 160000 / Math.max(1, nd))));

  const pushDisc = (d: number, x: number, y: number) => {
    if (d < nf) {
      pfx[d]! += x;
      pfy[d]! += y;
      return;
    }
    const leaf = (d - nf) >> 1;
    const f = fatherOf[leaf]!;
    // Most of the push spreads the fan; the rest moves the family as a whole.
    plx[leaf]! += x * (f >= 0 ? 0.65 : 1);
    ply[leaf]! += y * (f >= 0 ? 0.65 : 1);
    if (f >= 0) {
      pfx[f]! += x * 0.35;
      pfy[f]! += y * 0.35;
    }
  };

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < nf; i++) {
      dx[i] = fx[i]!;
      dy[i] = fy[i]!;
      dr[i] = MEDAL_R;
    }
    for (let i = 0; i < nl; i++)
      for (let k = 0; k < 2; k++) {
        const d = nf + 2 * i + k;
        dx[d] = lx[i]! + Math.sin(la[i]!) * along[k]!;
        dy[d] = ly[i]! - Math.cos(la[i]!) * along[k]!;
        dr[d] = LEAF_R;
      }
    const grid = new Map<number, number[]>();
    for (let d = 0; d < nd; d++) {
      const k = key(Math.floor(dx[d]! / cell), Math.floor(dy[d]! / cell));
      const bucket = grid.get(k);
      if (bucket) bucket.push(d);
      else grid.set(k, [d]);
    }
    pfx.fill(0);
    pfy.fill(0);
    plx.fill(0);
    ply.fill(0);
    let moved = false;
    for (let a = 0; a < nd; a++) {
      const x = dx[a]!;
      const y = dy[a]!;
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      const famA = family(a);
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get(key(gx + ox, gy + oy));
          if (!bucket) continue;
          for (const b of bucket) {
            if (b <= a) continue;
            // A leaf's two discs are one blade; a father and his own fan are placed together.
            if (a >= nf && b >= nf && (a - nf) >> 1 === (b - nf) >> 1) continue;
            if (a < nf !== b < nf && famA === family(b)) continue;
            const ex = dx[b]! - x;
            const ey = dy[b]! - y;
            const dist = Math.sqrt(ex * ex + ey * ey) || 0.01;
            const gap = dr[a]! + dr[b]!;
            if (dist >= gap) continue;
            const f = (gap - dist) / 2 / dist;
            pushDisc(a, -ex * f, -ey * f);
            pushDisc(b, ex * f, ey * f);
            moved = true;
          }
        }
    }
    if (!moved) break;
    for (let i = 0; i < nf; i++) {
      if (pfx[i] === 0 && pfy[i] === 0) continue;
      const mx = pfx[i]! * 0.7;
      const my = pfy[i]! * 0.7;
      fx[i]! += mx;
      fy[i]! += my;
      for (const leaf of kids[i]!) {
        lx[leaf]! += mx;
        ly[leaf]! += my;
      }
    }
    for (let i = 0; i < nl; i++) {
      if (plx[i] === 0 && ply[i] === 0) continue;
      lx[i]! += plx[i]! * 0.7;
      ly[i]! += ply[i]! * 0.7;
      const f = fatherOf[i]!;
      if (f < 0) continue;
      // Keep every leaf clear of its own father's medallion.
      const ex = lx[i]! - fx[f]!;
      const ey = ly[i]! - fy[f]!;
      const dist = Math.hypot(ex, ey) || 0.01;
      if (dist < LEAF_BASE) {
        lx[i] = fx[f]! + (ex / dist) * LEAF_BASE;
        ly[i] = fy[f]! + (ey / dist) * LEAF_BASE;
      }
      la[i] = Math.atan2(ex, -ey);
    }
  }

  // Re-draw the wood to the settled places.
  const byId = new Map(branches.map((b) => [b.personId, b]));
  forks.forEach((m, i) => {
    m.position = [fx[i]!, fy[i]!];
    const b = byId.get(m.personId)!;
    const p = forkFather[i]!;
    const [p0, c1, c2] = b.curve;
    const from: Vec2 = p >= 0 ? [fx[p]!, fy[p]!] : p0;
    const ds: Vec2 = p >= 0 ? [fx[p]! - fx0[p]!, fy[p]! - fy0[p]!] : [0, 0];
    const de: Vec2 = [fx[i]! - fx0[i]!, fy[i]! - fy0[i]!];
    b.curve = [from, [c1[0] + ds[0], c1[1] + ds[1]], [c2[0] + de[0], c2[1] + de[1]], m.position];
  });
  leaves.forEach((m, i) => {
    const f = fatherOf[i]!;
    const b = byId.get(m.personId)!;
    const from: Vec2 = f >= 0 ? [fx[f]!, fy[f]!] : b.curve[0];
    m.position = [lx[i]!, ly[i]!];
    m.angle = la[i]!;
    const mid: Vec2 = [(from[0] + m.position[0]) / 2, (from[1] + m.position[1]) / 2];
    b.curve = [from, mid, mid, m.position];
  });
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
