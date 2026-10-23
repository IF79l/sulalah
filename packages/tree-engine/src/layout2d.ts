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
/** Widest fan, in radians, so leaves never fold back over their father's own branch. */
const LEAF_SPREAD = 2.5;
/** Gap between rows of leaves, base to base. */
const LEAF_ROW = 92;
/** From a leaf's base to its middle, and the width a leaf needs beside its neighbour. */
const LEAF_REACH = 40;
const LEAF_SLOT = 64;

/** How many leaves (childless people) hang under a node; sets how thick its wood is. */
function leafCount(node: LineageNode, memo: Map<string, number>): number {
  const hit = memo.get(node.person.id);
  if (hit !== undefined) return hit;
  const n =
    node.children.length === 0 ? 1 : node.children.reduce((s, c) => s + leafCount(c, memo), 0);
  memo.set(node.person.id, n);
  return n;
}

/** Rows of a father's leaf fan, innermost first: how far out each row sits and how many it holds. */
function fanRows(count: number): { reach: number; n: number }[] {
  const rows: { reach: number; n: number }[] = [];
  for (let row = 0, left = count; left > 0; row++) {
    const reach = LEAF_BASE + row * LEAF_ROW;
    const fit = Math.max(1, Math.floor((LEAF_SPREAD * (reach + LEAF_REACH)) / LEAF_SLOT));
    const n = Math.min(fit, left);
    rows.push({ reach, n });
    left -= n;
  }
  return rows;
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
    // Fill rows outward: each row holds as many leaves as fit side by side on its arc,
    // so a large family grows a fuller fan instead of stacking leaves on each other.
    const slots: { angle: number; reach: number }[] = [];
    fanRows(leaves.length).forEach(({ reach, n }, row) => {
      const step = Math.min(LEAF_STEP, LEAF_SPREAD / Math.max(1, n - 1));
      const offset = row % 2 ? step / 2 : 0;
      for (let i = 0; i < n; i++)
        slots.push({ angle: heading + (i - (n - 1) / 2) * step + offset, reach });
    });
    leaves.forEach((leaf, i) => {
      const rand = seededRandom(leaf.person.id);
      const angle = slots[i]!.angle + (rand() - 0.5) * 0.06;
      const reach = slots[i]!.reach + rand() * 5;
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
  settleCrown(marks, branches);

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
  const TWIG_R = 12;
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
  const nd = nf + 3 * nl;
  const dx = new Float64Array(nd);
  const dy = new Float64Array(nd);
  const dr = new Float64Array(nd);
  const pfx = new Float64Array(nf);
  const pfy = new Float64Array(nf);
  const carryX = new Float64Array(nf);
  const carryY = new Float64Array(nf);
  const plx = new Float64Array(nl);
  const ply = new Float64Array(nl);
  const key = (gx: number, gy: number) => gx * 100003 + gy;
  // Who a disc belongs to, as a family: a fork's own family is itself; a leaf's is its father.
  const leafOf = (d: number) => ((d - nf) / 3) | 0;
  const isTwig = (d: number) => d >= nf && (d - nf) % 3 === 2;
  const family = (d: number) => (d < nf ? d : fatherOf[leafOf(d)]!);
  const rounds = Math.round(Math.max(16, Math.min(200, 160000 / Math.max(1, nd))));

  const pushDisc = (d: number, x: number, y: number, kin: boolean) => {
    if (d < nf) {
      pfx[d]! += x;
      pfy[d]! += y;
      return;
    }
    const leaf = leafOf(d);
    const f = fatherOf[leaf]!;
    // Siblings only spread their own fan. A clash with another family mostly moves the
    // family as a whole, so a fan keeps to its own father instead of mixing with the next.
    const own = kin || f < 0 ? 1 : 0.3;
    plx[leaf]! += x * own;
    ply[leaf]! += y * own;
    if (!kin && f >= 0) {
      pfx[f]! += x * 0.7;
      pfy[f]! += y * 0.7;
    }
  };

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < nf; i++) {
      dx[i] = fx[i]!;
      dy[i] = fy[i]!;
      dr[i] = MEDAL_R;
    }
    for (let i = 0; i < nl; i++) {
      for (let k = 0; k < 2; k++) {
        const d = nf + 3 * i + k;
        dx[d] = lx[i]! + Math.sin(la[i]!) * along[k]!;
        dy[d] = ly[i]! - Math.cos(la[i]!) * along[k]!;
        dr[d] = LEAF_R;
      }
      // The twig's middle, so another family's leaves keep off it and twigs never cross.
      const f = fatherOf[i]!;
      const d = nf + 3 * i + 2;
      dx[d] = f >= 0 ? (fx[f]! + lx[i]!) / 2 : lx[i]!;
      dy[d] = f >= 0 ? (fy[f]! + ly[i]!) / 2 : ly[i]!;
      dr[d] = f >= 0 ? TWIG_R : 0;
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
            // A leaf's discs are one blade; a father and his own fan are placed together, and
            // twigs only keep clear of other families.
            if (a >= nf && b >= nf && leafOf(a) === leafOf(b)) continue;
            const kin = famA === family(b);
            if (kin && (a < nf !== b < nf || isTwig(a) || isTwig(b))) continue;
            const ex = dx[b]! - x;
            const ey = dy[b]! - y;
            const dist = Math.sqrt(ex * ex + ey * ey) || 0.01;
            const gap = dr[a]! + dr[b]!;
            if (dist >= gap) continue;
            const f = (gap - dist) / 2 / dist;
            pushDisc(a, -ex * f, -ey * f, kin);
            pushDisc(b, ex * f, ey * f, kin);
            moved = true;
          }
        }
    }
    if (!moved) break;
    // Forks are listed fathers first, so a father's move can carry his sons' families with it.
    for (let i = 0; i < nf; i++) {
      const p = forkFather[i]!;
      const mx = pfx[i]! * 0.7 + (p >= 0 ? carryX[p]! * 0.6 : 0);
      const my = pfy[i]! * 0.7 + (p >= 0 ? carryY[p]! * 0.6 : 0);
      carryX[i] = mx;
      carryY[i] = my;
      if (mx === 0 && my === 0) continue;
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
