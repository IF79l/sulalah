import type { Bounds, TreeLayout, Vec3 } from './types';

export interface CameraShot {
  position: Vec3;
  target: Vec3;
}

/**
 * Where the camera should sit to frame a set of bounds.
 * Renderers animate between shots; this stays free of any 3D library.
 */
export function shotFor(bounds: Bounds, fovDegrees = 45, padding = 1.25): CameraShot {
  const distance = (bounds.radius * padding) / Math.sin(((fovDegrees / 2) * Math.PI) / 180);
  const [cx, cy, cz] = bounds.center;
  // Slightly above and in front, so the branch reads against the canopy behind it.
  return { target: bounds.center, position: [cx, cy + distance * 0.25, cz + distance] };
}

export function shotForBranch(layout: TreeLayout, personId: string): CameraShot | null {
  const bounds = layout.subtreeBounds.get(personId);
  return bounds ? shotFor(bounds) : null;
}

export function shotForTree(layout: TreeLayout): CameraShot {
  return shotFor(layout.bounds, 45, 1.1);
}
