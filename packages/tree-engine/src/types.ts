export type Vec3 = readonly [number, number, number];

export type NodeStatus = 'approved' | 'proposed';

/** The minimum the engine needs to know about a person. */
export interface LineagePerson {
  id: string;
  name: string;
  gender: 'male' | 'female';
  fatherId?: string | null;
  motherId?: string | null;
  status: NodeStatus;
}

export interface LineageUnion {
  aId: string;
  bId: string;
}

export interface LineageNode {
  person: LineagePerson;
  parentId: string | null;
  children: LineageNode[];
  spouseIds: string[];
  depth: number;
  /** Size of this subtree including the node itself; drives branch length and thickness. */
  weight: number;
}

export interface Lineage {
  root: LineageNode;
  byId: Map<string, LineageNode>;
  /** People that could not be placed under the root (missing father or a cycle). */
  orphans: LineagePerson[];
}

export interface BranchGeometry {
  personId: string;
  parentId: string | null;
  depth: number;
  status: NodeStatus;
  /** Catmull-Rom control points from the parent's attachment point to the tip. */
  points: Vec3[];
  radiusStart: number;
  radiusEnd: number;
  /** Where the person's leaf and name label sit. */
  tip: Vec3;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  radius: number;
}

export interface TreeLayout {
  branches: BranchGeometry[];
  byId: Map<string, BranchGeometry>;
  /** Bounds of each person's whole sub-branch, used by the camera to frame it. */
  subtreeBounds: Map<string, Bounds>;
  bounds: Bounds;
}
