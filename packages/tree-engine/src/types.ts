export type NodeStatus = 'approved' | 'proposed';

/** The minimum the engine needs to know about a person. */
export interface LineagePerson {
  id: string;
  name: string;
  gender: 'male' | 'female';
  fatherId?: string | null;
  motherId?: string | null;
  status: NodeStatus;
  deceased?: boolean;
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

export type Vec2 = readonly [number, number];

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * A wooden limb (trunk or father branch) or a thin twig that holds a single leaf.
 * Coordinates are SVG-style: x to the right, y down, the trunk base at (0, 0).
 */
export interface Branch2D {
  personId: string;
  parentId: string | null;
  kind: 'trunk' | 'limb' | 'twig';
  depth: number;
  status: NodeStatus;
  /** Cubic Bezier: start, control 1, control 2, end. */
  curve: readonly [Vec2, Vec2, Vec2, Vec2];
  widthStart: number;
  widthEnd: number;
}

/** What is drawn for a person at the end of their branch. */
export interface PersonMark {
  personId: string;
  name: string;
  gender: 'male' | 'female';
  status: NodeStatus;
  deceased: boolean;
  depth: number;
  /** A father with children gets a fork badge on his branch; everyone else is a leaf. */
  kind: 'root' | 'fork' | 'leaf';
  position: Vec2;
  /** Direction the leaf points, in radians, 0 = straight up, clockwise positive. */
  angle: number;
  spouseIds: string[];
}

export interface TreeLayout2D {
  branches: Branch2D[];
  marks: PersonMark[];
  markById: Map<string, PersonMark>;
  /** Box around each person and their whole sub-branch; the camera frames these. */
  subtreeBox: Map<string, Box>;
  box: Box;
  /** Horizontal radius of the canopy. */
  canopyRadius: number;
  /** The egg-shaped crown every leaf sits inside. */
  canopy: { center: Vec2; rx: number; ry: number };
  trunkTop: Vec2;
  trunkHeight: number;
  trunkWidth: number;
}
