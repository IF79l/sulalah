import { seededRandom } from './random';
import type { Box, Branch2D, Lineage, LineageNode, PersonMark, TreeLayout2D, Vec2 } from './types';

export interface Layout2DOptions {
  trunkHeight: number;
  trunkWidth: number;
  /** Horizontal room kept between neighbouring families. */
  familyGap: number;
  /** How far a son's medallion sits above his father's, before climbing for outer sons. */
  climb: number;
}

export const defaultLayout2DOptions: Layout2DOptions = {
  trunkHeight: 460,
  trunkWidth: 150,
  familyGap: 16,
  climb: 120,
};

/** Leaf blade length and width, matching the renderer. */
const LEAF_LENGTH = 66;
const LEAF_WIDTH = 44;
/** Leaves pair up along a father's stem: first pair this far above him, then every STEP. */
const STEM_START = 40;
const STEM_STEP = 54;
/** Angle a stem leaf opens away from the stem, in radians. */
const LEAF_OPEN = 0.95;
/** Largest father's medallion radius the renderer draws. */
const MEDAL = 38;
/** Height of one row of a family's outline, in world units. */
const BAND = 16;

/**
 * A family's outline: for each horizontal band, the leftmost and rightmost x it occupies,
 * relative to the father. Packing compares outlines band by band, so a tall thin family and a
 * short wide one can sit close where their shapes allow.
 */
type Outline = Map<number, [number, number]>;

function addSpan(o: Outline, yTop: number, yBottom: number, x0: number, x1: number) {
  for (let b = Math.floor(yTop / BAND); b <= Math.floor(yBottom / BAND); b++) {
    const cur = o.get(b);
    o.set(b, cur ? [Math.min(cur[0], x0), Math.max(cur[1], x1)] : [x0, x1]);
  }
}

function merge(into: Outline, from: Outline, dx: number, dy: number) {
  const shift = Math.round(dy / BAND);
  for (const [b, [x0, x1]] of from) {
    const k = b + shift;
    const cur = into.get(k);
    into.set(k, cur ? [Math.min(cur[0], x0 + dx), Math.max(cur[1], x1 + dx)] : [x0 + dx, x1 + dx]);
  }
}

/** Smallest shift right (side 1) or left (side -1) that keeps `next` clear of `placed`. */
function clearance(placed: Outline, next: Outline, dy: number, side: 1 | -1, gap: number) {
  const shift = Math.round(dy / BAND);
  let best = side === 1 ? -Infinity : Infinity;
  for (const [b, [x0, x1]] of next) {
    for (let k = b + shift - 1; k <= b + shift + 1; k++) {
      const p = placed.get(k);
      if (!p) continue;
      best = side === 1 ? Math.max(best, p[1] + gap - x0) : Math.min(best, p[0] - gap - x1);
    }
  }
  return Number.isFinite(best) ? best : 0;
}

function widthOf(o: Outline): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [x0, x1] of o.values()) {
    lo = Math.min(lo, x0);
    hi = Math.max(hi, x1);
  }
  return hi - lo;
}

/** Where a father's i-th of k leaves attaches on his stem, and which way it opens. */
function stemSlot(i: number, k: number): { y: number; angle: number } {
  // The last leaf of an odd family crowns the stem, pointing straight up.
  if (k % 2 === 1 && i === k - 1)
    return { y: -(STEM_START + Math.floor(i / 2) * STEM_STEP + STEM_STEP * 0.75), angle: 0 };
  const side = i % 2 === 0 ? 1 : -1;
  return {
    y: -(STEM_START + Math.floor(i / 2) * STEM_STEP + (i % 2) * (STEM_STEP / 2)),
    angle: side * LEAF_OPEN,
  };
}

/** The father's own column: his medallion and the leaves along his stem. */
function columnOutline(k: number): Outline {
  const o: Outline = new Map();
  addSpan(o, -MEDAL, MEDAL, -MEDAL, MEDAL);
  for (let i = 0; i < k; i++) {
    const { y, angle } = stemSlot(i, k);
    const tipX = Math.sin(angle) * LEAF_LENGTH;
    const tipY = y - Math.cos(angle) * LEAF_LENGTH;
    const w = LEAF_WIDTH / 2 + 4;
    addSpan(
      o,
      Math.min(y, tipY) - w,
      Math.max(y, tipY) + 4,
      Math.min(0, tipX) - w,
      Math.max(0, tipX) + w,
    );
  }
  return o;
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
 * Lays the family out as a tree seen from the front, growing upward: the root ancestor is the
 * trunk, every father is a branch with his name on a medallion, and his childless children are
 * leaves paired up the stem that rises from it. His sons who have children of their own branch
 * off to either side and climb, the outer ones higher, so the crown rises like a real tree.
 *
 * Families are packed bottom-up by their real outlines: each son's whole family is slid as
 * close to his brothers as their shapes allow, never closer. So no two families overlap or
 * interleave, yet the crown stays dense. Output is deterministic for the same data.
 */
export function layoutTree2D(
  lineage: Lineage,
  options: Partial<Layout2DOptions> = {},
): TreeLayout2D {
  const o = { ...defaultLayout2DOptions, ...options };
  const root = lineage.root;
  const memo = new Map<string, number>();
  leafCount(root, memo);

  // Bottom-up: each family's outline, and where each son sits relative to his father.
  const offset = new Map<string, Vec2>();
  const outlineOf = (node: LineageNode): Outline => {
    const own = node === root ? rootOutline(o.trunkWidth) : columnOutline(leavesOf(node).length);
    const sons = forksOf(node);
    const shapes = sons.map((s) => outlineOf(s));
    const all: Outline = new Map(own);
    // Sons go to whichever side of the stem is lighter so far, the first ones closest and lowest.
    const sides: Outline[] = [new Map(own), new Map(own)];
    const load = [0, 0];
    const ranks = [0, 0];
    sons.forEach((son, i) => {
      const s = load[0]! <= load[1]! ? 0 : 1;
      const side: 1 | -1 = s === 0 ? 1 : -1;
      const rand = seededRandom(son.person.id);
      const dy = -(o.climb * (node === root ? 1.35 : 1) + ranks[s]! * 60 + rand() * 14);
      ranks[s]!++;
      let dx = clearance(sides[s]!, shapes[i]!, dy, side, o.familyGap);
      // Even with room to spare, a son leans out a little so his branch reads as his own.
      dx = side === 1 ? Math.max(dx, 46) : Math.min(dx, -46);
      offset.set(son.person.id, [dx, dy]);
      merge(sides[s]!, shapes[i]!, dx, dy);
      merge(all, shapes[i]!, dx, dy);
      load[s]! += widthOf(shapes[i]!);
    });
    return all;
  };
  const crown = outlineOf(root);
  // Stand the crown centred over the trunk.
  {
    let lo = Infinity;
    let hi = -Infinity;
    for (const [x0, x1] of crown.values()) {
      lo = Math.min(lo, x0);
      hi = Math.max(hi, x1);
    }
    const shift = -(lo + hi) / 2;
    for (const son of forksOf(root)) {
      const [dx, dy] = offset.get(son.person.id)!;
      offset.set(son.person.id, [dx + shift, dy]);
    }
    for (const [b, [x0, x1]] of [...crown]) crown.set(b, [x0 + shift, x1 + shift]);
  }

  const trunkTop: Vec2 = [0, -o.trunkHeight];
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
    curve: [[0, 0], [6, -o.trunkHeight * 0.35], [-6, -o.trunkHeight * 0.7], trunkTop],
    widthStart: o.trunkWidth,
    widthEnd: o.trunkWidth * 0.62,
  });
  marks.push(markFor(root, 'root', [0, trunkTop[1] + 100], 0));

  /** A father's childless children, paired up the stem above his medallion. */
  const stem = (node: LineageNode, at: Vec2) => {
    const leaves = leavesOf(node);
    leaves.forEach((leaf, i) => {
      const slot = stemSlot(i, leaves.length);
      const rand = seededRandom(leaf.person.id);
      const angle = slot.angle + (rand() - 0.5) * 0.08;
      const to: Vec2 = [at[0], at[1] + slot.y];
      const mid: Vec2 = [at[0], at[1] + slot.y / 2];
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

  const place = (node: LineageNode, at: Vec2) => {
    stem(node, at);
    for (const son of forksOf(node)) {
      const [dx, dy] = offset.get(son.person.id)!;
      const to: Vec2 = [at[0] + dx, at[1] + dy];
      let origin = at;
      if (node === root) {
        // The outermost sons leave the trunk a little lower, as on a real tree.
        const low = Math.min(1, Math.abs(dx) / 900);
        origin = [Math.sign(dx) * o.trunkWidth * 0.12 * low, trunkTop[1] + 110 * low];
      }
      // Out from the father, then curving up into the son: every branch climbs.
      const c1: Vec2 = [lerp(origin[0], to[0], 0.5), lerp(origin[1], to[1], 0.2)];
      const c2: Vec2 = [to[0], lerp(origin[1], to[1], 0.62)];
      branches.push({
        personId: son.person.id,
        parentId: node.person.id,
        kind: 'limb',
        depth: son.depth,
        status: son.person.status,
        curve: [origin, c1, c2, to],
        widthStart: widthFor(son) * (node === root ? 1.5 : 1.1),
        widthEnd: widthFor(son) * 0.72,
      });
      marks.push(markFor(son, 'fork', to, Math.atan2(to[0] - c2[0], -(to[1] - c2[1]))));
      place(son, to);
    }
  };
  place(root, trunkTop);
  settleCrown(marks, branches);

  const markById = new Map(marks.map((m) => [m.personId, m]));
  const subtreeBox = new Map<string, Box>();
  const collect = (node: LineageNode): Vec2[] => {
    const own = markById.get(node.person.id)?.position;
    const pts = [...(own ? [own] : []), ...node.children.flatMap(collect)];
    subtreeBox.set(node.person.id, pad(boxOf(pts), 100));
    return pts;
  };
  collect(root);
  const all = boxOf([[-o.trunkWidth * 1.4, 40], ...marks.map((m) => m.position)]);
  subtreeBox.set(root.person.id, pad({ ...all, minY: all.minY - LEAF_LENGTH }, 90));

  // The soft backdrop behind the crown follows the packed outline.
  let minX = 0;
  let maxX = 0;
  let minB = 0;
  for (const [b, [x0, x1]] of crown) {
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minB = Math.min(minB, b);
  }
  const crownTop = trunkTop[1] + minB * BAND;
  const rx = Math.max(200, (maxX - minX) / 2);
  const ry = Math.max(200, (trunkTop[1] + 60 - crownTop) / 2);
  const center: Vec2 = [(minX + maxX) / 2, crownTop + ry];

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

/** Above the trunk the root's sons must clear the top of the trunk itself. */
function rootOutline(trunkWidth: number): Outline {
  const o: Outline = new Map();
  addSpan(o, -10, 200, -trunkWidth * 0.4, trunkWidth * 0.4);
  return o;
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
  const MEDAL_R = 40;
  const LEAF_R = 19;
  const along = [20, 48];
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
    // Leaves sit fixed on their father's stem, so a push on a leaf moves his whole family.
    const f = fatherOf[(d - nf) >> 1]!;
    if (f >= 0) {
      pfx[f]! += x;
      pfy[f]! += y;
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
