import { Person, ProposedPerson, Gender } from '../types';

export interface BotanicalLeaf {
  x: number;
  y: number;
  angle: number; // degrees
  scale: number;
  isSpouse?: boolean;
}

export interface BotanicalNode {
  id: string;
  person: Person | {
    id: string;
    fullName: string;
    shortName: string;
    gender: Gender;
    generation: number;
    fatherId?: string;
    birthYear?: number;
    isApproved: boolean;
    isDeceased?: boolean;
    occupation?: string;
  };
  isProposed?: boolean;
  isNewSprout?: boolean; // recently added, trigger growth animation
  generation: number;
  
  // Coordinates at tip of branch where leaf & marker attach
  x: number;
  y: number;
  
  // Parent connection
  parentX: number;
  parentY: number;
  parentAngle: number;
  
  // Geometry
  bezierPath: string;
  branchThickness: number;
  colorTheme: string;
  
  // Hierarchy
  branchRootId: string;
  childrenIds: string[];
  spouse?: Person | null;
  
  // Subtree bounding envelope for camera focus
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    centerX: number;
    centerY: number;
  };
  
  // Foliage
  leaves: BotanicalLeaf[];
}

export interface BotanicalTreeLayout {
  nodes: BotanicalNode[];
  rootNode: BotanicalNode;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  trunkPath: string;
  rootFlairPaths: string[];
  canopyClusters: Array<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    color: string;
    opacity: number;
  }>;
}

// Tree Root Anchor Position in 2400x1600 botanical coordinate space
const ROOT_X = 1200;
const ROOT_Y = 1350;
const TRUNK_CROWN_Y = 880;

/**
 * Computes deterministic, natural botanical layout for the family tree.
 * Every person is a physical branch, twig, or leaf.
 */
export function computeBotanicalTree(
  people: Person[],
  proposedPeople: ProposedPerson[] = [],
  rootPersonId: string,
  newSproutId?: string | null
): BotanicalTreeLayout {
  const peopleMap = new Map<string, Person>();
  people.forEach(p => peopleMap.set(p.id, p));

  const rootPerson = peopleMap.get(rootPersonId);
  if (!rootPerson) {
    throw new Error(`Root person ${rootPersonId} not found in database`);
  }

  // Children mapping (biological parent_child)
  const childrenMap = new Map<string, string[]>();
  people.forEach(p => {
    if (p.fatherId) {
      const arr = childrenMap.get(p.fatherId) || [];
      arr.push(p.id);
      childrenMap.set(p.fatherId, arr);
    }
  });

  // Attach proposed people to childrenMap
  const proposedMap = new Map<string, ProposedPerson>();
  proposedPeople.forEach(prop => {
    proposedMap.set(prop.tempId, prop);
    const parentId = prop.relativeToId;
    if (parentId && prop.relationship !== 'spouse') {
      const arr = childrenMap.get(parentId) || [];
      if (!arr.includes(prop.tempId)) {
        arr.push(prop.tempId);
        childrenMap.set(parentId, arr);
      }
    }
  });

  // Spouse lookup
  const spouseMap = new Map<string, Person>();
  people.forEach(p => {
    if (p.spouseIds && p.spouseIds.length > 0) {
      const s = peopleMap.get(p.spouseIds[0]);
      if (s) spouseMap.set(p.id, s);
    }
  });

  // Root Node setup (Founding Ancestor at base of trunk crown)
  const rootNode: BotanicalNode = {
    id: rootPerson.id,
    person: rootPerson,
    isProposed: false,
    generation: 1,
    x: ROOT_X,
    y: TRUNK_CROWN_Y,
    parentX: ROOT_X,
    parentY: ROOT_Y,
    parentAngle: -90,
    bezierPath: `M ${ROOT_X} ${ROOT_Y} C ${ROOT_X - 20} 1180, ${ROOT_X + 25} 1020, ${ROOT_X} ${TRUNK_CROWN_Y}`,
    branchThickness: 42,
    colorTheme: '#42382C',
    branchRootId: rootPerson.id,
    childrenIds: childrenMap.get(rootPerson.id) || [],
    spouse: spouseMap.get(rootPerson.id) || null,
    bounds: {
      minX: ROOT_X - 180,
      maxX: ROOT_X + 180,
      minY: TRUNK_CROWN_Y - 100,
      maxY: ROOT_Y,
      centerX: ROOT_X,
      centerY: (TRUNK_CROWN_Y + ROOT_Y) / 2
    },
    leaves: [
      { x: ROOT_X - 35, y: TRUNK_CROWN_Y + 15, angle: -45, scale: 1 },
      { x: ROOT_X + 35, y: TRUNK_CROWN_Y + 10, angle: 45, scale: 1.1 }
    ]
  };

  const allNodes: BotanicalNode[] = [rootNode];

  // Specific handcrafted angles and distances for Gen 2 (The Primary Boughs of Sidr Tree)
  // to ensure majestic, natural Arabian tree silhouette
  const gen2Angles: Record<string, { angle: number; length: number; curvature: number }> = {
    'p-matrook': { angle: -44, length: 390, curvature: -35 },    // Major Left Bough
    'p-dayfallah': { angle: -8, length: 420, curvature: 18 },    // Majestic Center-Right Bough
    'p-abdullah': { angle: 36, length: 410, curvature: 42 },     // Major Right Bough
    'p-sarah': { angle: -68, length: 280, curvature: -45 }       // Lower Left spreading Bough
  };

  // Recursive Branch Generation
  function processChildren(
    parentId: string,
    parentX: number,
    parentY: number,
    parentAngle: number,
    depth: number,
    branchRootId: string
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    const kids = childrenMap.get(parentId) || [];
    if (kids.length === 0) {
      return { minX: parentX, maxX: parentX, minY: parentY, maxY: parentY };
    }

    let bMinX = parentX;
    let bMaxX = parentX;
    let bMinY = parentY;
    let bMaxY = parentY;

    const kidCount = kids.length;

    kids.forEach((kidId, idx) => {
      const isApprovedPerson = peopleMap.has(kidId);
      const isProp = proposedMap.has(kidId);

      let kidPerson: any;
      if (isApprovedPerson) {
        kidPerson = peopleMap.get(kidId)!;
      } else if (isProp) {
        const p = proposedMap.get(kidId)!;
        kidPerson = {
          id: p.tempId,
          fullName: p.fullName,
          shortName: p.shortName,
          gender: p.gender,
          generation: depth + 1,
          fatherId: p.relativeToId,
          birthYear: p.birthYear,
          isApproved: false
        };
      } else {
        return;
      }

      let branchAngle = 0;
      let branchLength = 0;
      let branchThickness = 0;
      let curvature = 0;

      if (depth === 1) {
        // Gen 2: Primary Bough
        const preset = gen2Angles[kidId];
        if (preset) {
          branchAngle = preset.angle;
          branchLength = preset.length;
          curvature = preset.curvature;
        } else {
          // Fallback spread across tree crown
          const spread = 110;
          const startAngle = -55;
          const step = kidCount > 1 ? spread / (kidCount - 1) : 0;
          branchAngle = startAngle + idx * step;
          branchLength = 360;
          curvature = branchAngle * 0.4;
        }
        branchThickness = 24;
      } else if (depth === 2) {
        // Gen 3: Secondary Sub-Branch
        const spread = kidCount > 1 ? 55 : 0;
        const offset = (idx - (kidCount - 1) / 2) * (spread / Math.max(kidCount - 1, 1));
        branchAngle = parentAngle + offset * 0.85;
        branchLength = 220 + (idx % 2 === 0 ? 30 : -20);
        branchThickness = 14;
        curvature = (offset > 0 ? 15 : -15);
      } else if (depth === 3) {
        // Gen 4: Twig
        const spread = kidCount > 1 ? 48 : 0;
        const offset = (idx - (kidCount - 1) / 2) * (spread / Math.max(kidCount - 1, 1));
        branchAngle = parentAngle + offset * 0.9;
        branchLength = 150 + (idx % 2 === 0 ? 20 : -10);
        branchThickness = 8;
        curvature = (offset > 0 ? 10 : -10);
      } else {
        // Gen 5+: Fine Terminal Twigs
        const spread = kidCount > 1 ? 40 : 0;
        const offset = (idx - (kidCount - 1) / 2) * (spread / Math.max(kidCount - 1, 1));
        branchAngle = parentAngle + offset;
        branchLength = 110;
        branchThickness = 5;
        curvature = (offset > 0 ? 8 : -8);
      }

      // Calculate endpoint of branch using trigonometry
      const rad = (branchAngle - 90) * (Math.PI / 180);
      const tipX = Math.round(parentX + branchLength * Math.cos(rad));
      const tipY = Math.round(parentY + branchLength * Math.sin(rad));

      // Calculate organic Bézier control points
      const midDist = branchLength * 0.55;
      const perpRad = rad + Math.PI / 2;
      const curveOffset = curvature;

      const cp1X = Math.round(parentX + midDist * 0.4 * Math.cos(rad) + curveOffset * 0.5 * Math.cos(perpRad));
      const cp1Y = Math.round(parentY + midDist * 0.4 * Math.sin(rad) + curveOffset * 0.5 * Math.sin(perpRad));
      const cp2X = Math.round(parentX + midDist * 0.85 * Math.cos(rad) + curveOffset * Math.cos(perpRad));
      const cp2Y = Math.round(parentY + midDist * 0.85 * Math.sin(rad) + curveOffset * Math.sin(perpRad));

      const bezierPath = `M ${parentX} ${parentY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tipX} ${tipY}`;

      // Organic sidr leaves attached around tip
      const leaves: BotanicalLeaf[] = [
        { x: tipX - 16, y: tipY - 8, angle: branchAngle - 35, scale: 0.95 },
        { x: tipX + 14, y: tipY - 12, angle: branchAngle + 30, scale: 0.9 },
        { x: tipX, y: tipY - 22, angle: branchAngle, scale: 1.05 }
      ];

      // Add spouse leaf if exists
      const kidSpouse = isApprovedPerson ? spouseMap.get(kidId) || null : null;
      if (kidSpouse) {
        leaves.push({
          x: tipX + 32,
          y: tipY + 4,
          angle: branchAngle + 65,
          scale: 0.9,
          isSpouse: true
        });
      }

      const assignedBranchRoot = depth === 1 ? kidId : branchRootId;

      // Recurse children
      const subBounds = processChildren(
        kidId,
        tipX,
        tipY,
        branchAngle,
        depth + 1,
        assignedBranchRoot
      );

      const nodeMinX = Math.min(tipX - 70, subBounds.minX);
      const nodeMaxX = Math.max(tipX + 70, subBounds.maxX);
      const nodeMinY = Math.min(tipY - 50, subBounds.minY);
      const nodeMaxY = Math.max(tipY + 50, subBounds.maxY);

      bMinX = Math.min(bMinX, nodeMinX);
      bMaxX = Math.max(bMaxX, nodeMaxX);
      bMinY = Math.min(bMinY, nodeMinY);
      bMaxY = Math.max(bMaxY, nodeMaxY);

      const node: BotanicalNode = {
        id: kidId,
        person: kidPerson,
        isProposed: !isApprovedPerson,
        isNewSprout: kidId === newSproutId,
        generation: depth + 1,
        x: tipX,
        y: tipY,
        parentX,
        parentY,
        parentAngle: branchAngle,
        bezierPath,
        branchThickness,
        colorTheme: !isApprovedPerson ? '#B59A6B' : depth === 1 ? '#42382C' : '#5A4D3B',
        branchRootId: assignedBranchRoot,
        childrenIds: childrenMap.get(kidId) || [],
        spouse: kidSpouse,
        bounds: {
          minX: nodeMinX,
          maxX: nodeMaxX,
          minY: nodeMinY,
          maxY: nodeMaxY,
          centerX: (nodeMinX + nodeMaxX) / 2,
          centerY: (nodeMinY + nodeMaxY) / 2
        },
        leaves
      };

      allNodes.push(node);
    });

    return { minX: bMinX, maxX: bMaxX, minY: bMinY, maxY: bMaxY };
  }

  // Generate branches from root
  const treeSubtreeBounds = processChildren(
    rootPerson.id,
    rootNode.x,
    rootNode.y,
    -90,
    1,
    rootPerson.id
  );

  rootNode.bounds.minX = Math.min(rootNode.bounds.minX, treeSubtreeBounds.minX);
  rootNode.bounds.maxX = Math.max(rootNode.bounds.maxX, treeSubtreeBounds.maxX);
  rootNode.bounds.minY = Math.min(rootNode.bounds.minY, treeSubtreeBounds.minY);

  // Natural organic trunk path (Wide base tapering to crown)
  const trunkPath = `
    M ${ROOT_X - 60} ${ROOT_Y + 50}
    Q ${ROOT_X - 45} 1180, ${ROOT_X - 30} 1040
    Q ${ROOT_X - 22} 960, ${ROOT_X - 16} ${TRUNK_CROWN_Y}
    L ${ROOT_X + 16} ${TRUNK_CROWN_Y}
    Q ${ROOT_X + 24} 960, ${ROOT_X + 32} 1040
    Q ${ROOT_X + 48} 1180, ${ROOT_X + 68} ${ROOT_Y + 50}
    Z
  `;

  // Root flares spreading into the desert soil
  const rootFlairPaths = [
    `M ${ROOT_X - 55} ${ROOT_Y + 40} Q ${ROOT_X - 110} ${ROOT_Y + 90}, ${ROOT_X - 180} ${ROOT_Y + 120}`,
    `M ${ROOT_X - 25} ${ROOT_Y + 45} Q ${ROOT_X - 45} ${ROOT_Y + 105}, ${ROOT_X - 80} ${ROOT_Y + 140}`,
    `M ${ROOT_X + 25} ${ROOT_Y + 45} Q ${ROOT_X + 55} ${ROOT_Y + 105}, ${ROOT_X + 90} ${ROOT_Y + 140}`,
    `M ${ROOT_X + 60} ${ROOT_Y + 40} Q ${ROOT_X + 120} ${ROOT_Y + 90}, ${ROOT_X + 190} ${ROOT_Y + 120}`
  ];

  // Distant canopy foliage clouds (Arabian sidr soft green silhouettes)
  const canopyClusters = [
    { cx: 580, cy: 380, rx: 240, ry: 160, color: '#687C58', opacity: 0.22 },
    { cx: 880, cy: 310, rx: 260, ry: 170, color: '#7E946A', opacity: 0.25 },
    { cx: 1240, cy: 320, rx: 280, ry: 180, color: '#687C58', opacity: 0.24 },
    { cx: 1540, cy: 410, rx: 230, ry: 150, color: '#546845', opacity: 0.2 },
    { cx: 420, cy: 460, rx: 190, ry: 130, color: '#7E946A', opacity: 0.18 },
    { cx: 1380, cy: 500, rx: 200, ry: 140, color: '#687C58', opacity: 0.19 }
  ];

  const overallBounds = {
    minX: Math.min(200, rootNode.bounds.minX - 100),
    maxX: Math.max(2200, rootNode.bounds.maxX + 100),
    minY: Math.min(100, rootNode.bounds.minY - 120),
    maxY: ROOT_Y + 160,
    width: 0,
    height: 0
  };
  overallBounds.width = overallBounds.maxX - overallBounds.minX;
  overallBounds.height = overallBounds.maxY - overallBounds.minY;

  return {
    nodes: allNodes,
    rootNode,
    bounds: overallBounds,
    trunkPath,
    rootFlairPaths,
    canopyClusters
  };
}

/**
 * Computes smooth camera transform to frame any branch, sub-tree, or person.
 */
export function getCameraTransformForNode(
  node: BotanicalNode,
  viewportWidth: number,
  viewportHeight: number,
  zoomLevel: 'branch' | 'subbranch' | 'person' = 'branch'
): { x: number; y: number; scale: number } {
  let targetScale = 1.0;
  let targetX = 0;
  let targetY = 0;

  if (zoomLevel === 'person') {
    targetScale = Math.min(2.8, Math.max(2.2, viewportWidth / 600));
    targetX = viewportWidth / 2 - node.x * targetScale;
    targetY = viewportHeight / 2 - node.y * targetScale;
  } else if (zoomLevel === 'subbranch') {
    targetScale = Math.min(2.0, Math.max(1.6, viewportWidth / 800));
    targetX = viewportWidth / 2 - node.bounds.centerX * targetScale;
    targetY = viewportHeight / 2 - node.bounds.centerY * targetScale;
  } else {
    // Zoom on major branch
    const envelopeW = Math.max(node.bounds.maxX - node.bounds.minX, 400);
    const envelopeH = Math.max(node.bounds.maxY - node.bounds.minY, 400);
    const scaleX = (viewportWidth * 0.75) / envelopeW;
    const scaleY = (viewportHeight * 0.75) / envelopeH;
    targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), 1.2), 1.7);
    targetX = viewportWidth / 2 - node.bounds.centerX * targetScale;
    targetY = viewportHeight / 2 - (node.bounds.centerY - 40) * targetScale;
  }

  return { x: targetX, y: targetY, scale: targetScale };
}
