import { seededRandom } from './random';
import type { BranchGeometry, Bounds, Lineage, LineageNode, TreeLayout, Vec3 } from './types';

export interface LayoutOptions {
  trunkHeight: number;
  trunkRadius: number;
  /** Branch length at depth 1; deeper branches shrink by `lengthDecay`. */
  baseLength: number;
  lengthDecay: number;
  /** Angle from the parent direction, in radians. */
  spread: number;
}

export const defaultLayoutOptions: LayoutOptions = {
  trunkHeight: 6,
  trunkRadius: 0.55,
  baseLength: 4.2,
  lengthDecay: 0.72,
  spread: 0.85,
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const UP: Vec3 = [0, 1, 0];

/**
 * Turns a lineage into deterministic 3D branch geometry.
 * The same lineage always yields the same tree; random jitter is seeded by person id.
 */
export function layoutTree(lineage: Lineage, options: Partial<LayoutOptions> = {}): TreeLayout {
  const o = { ...defaultLayoutOptions, ...options };
  const branches: BranchGeometry[] = [];
  // Absolute (not relative) sizing: growth in one branch never resizes unrelated branches.
  const radiusFor = (weight: number) => Math.min(o.trunkRadius, 0.04 + 0.06 * Math.sqrt(weight));

  const trunk: BranchGeometry = {
    personId: lineage.root.person.id,
    parentId: null,
    depth: 0,
    status: lineage.root.person.status,
    points: [
      [0, 0, 0],
      [0.15, o.trunkHeight * 0.4, -0.1],
      [-0.1, o.trunkHeight * 0.75, 0.1],
      [0, o.trunkHeight, 0],
    ],
    radiusStart: o.trunkRadius * 1.35,
    radiusEnd: radiusFor(lineage.root.weight) * 0.8,
    tip: [0, o.trunkHeight, 0],
  };
  branches.push(trunk);

  const grow = (node: LineageNode, origin: Vec3, direction: Vec3) => {
    const count = node.children.length;
    node.children.forEach((child, i) => {
      const rand = seededRandom(child.person.id);
      const azimuth = i * GOLDEN_ANGLE + node.depth * 1.3 + (rand() - 0.5) * 0.4;
      const tilt = o.spread * (count === 1 ? 0.55 : 1) + (rand() - 0.5) * 0.2;
      const dir = rotateAway(direction, tilt, azimuth);
      const length =
        o.baseLength *
        Math.pow(o.lengthDecay, child.depth - 1) *
        (0.85 + 0.15 * Math.min(1, Math.log10(child.weight) / 2));
      const end = add(origin, scale(dir, length));
      // A gentle upward curve makes branches read as wood, not as lines.
      const bend = scale(UP, length * 0.18);
      const p1 = add(add(origin, scale(dir, length * 0.33)), scale(bend, 0.4));
      const p2 = add(add(origin, scale(dir, length * 0.66)), bend);
      const geometry: BranchGeometry = {
        personId: child.person.id,
        parentId: node.person.id,
        depth: child.depth,
        status: child.person.status,
        points: [origin, p1, p2, end],
        radiusStart: radiusFor(node.weight) * 0.85,
        radiusEnd: radiusFor(child.weight) * 0.7,
        tip: end,
      };
      branches.push(geometry);
      grow(child, end, normalize(sub(end, p2)));
    });
  };
  grow(lineage.root, trunk.tip, UP);

  const byId = new Map(branches.map((b) => [b.personId, b]));
  const subtreeBounds = new Map<string, Bounds>();
  const collect = (node: LineageNode): Vec3[] => {
    const own = byId.get(node.person.id)?.points ?? [];
    const pts = [...own, ...node.children.flatMap(collect)];
    subtreeBounds.set(node.person.id, boundsOf(pts));
    return pts;
  };
  collect(lineage.root);

  return { branches, byId, subtreeBounds, bounds: boundsOf(branches.flatMap((b) => b.points)) };
}

function rotateAway(dir: Vec3, tilt: number, azimuth: number): Vec3 {
  // Build an orthonormal basis around `dir`, then tilt away from it at the given azimuth.
  const helper: Vec3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(dir, helper));
  const v = cross(dir, u);
  const s = Math.sin(tilt);
  return normalize(
    add(
      scale(dir, Math.cos(tilt)),
      add(scale(u, s * Math.cos(azimuth)), scale(v, s * Math.sin(azimuth))),
    ),
  );
}

export function boundsOf(points: readonly Vec3[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, p[k]!);
      max[k] = Math.max(max[k]!, p[k]!);
    }
  }
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return { min, max, center, radius: Math.max(0.5, length(sub(max, center))) };
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1));
