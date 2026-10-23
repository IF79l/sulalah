import type { Box } from './types';

/** A 2D camera: the world point at the centre of the screen and the world width visible. */
export interface View {
  cx: number;
  cy: number;
  width: number;
}

/** The view that fits a box inside a viewport of the given aspect (width / height). */
export function viewForBox(box: Box, aspect: number, padding = 1.08): View {
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  return {
    cx: (box.minX + box.maxX) / 2,
    cy: (box.minY + box.maxY) / 2,
    width: Math.max(w, h * aspect) * padding,
  };
}

/**
 * Smooth zoom-and-pan between two views (van Wijk & Nuij, 2003): the camera pulls back
 * while it travels, so the viewer never loses where they are in the tree.
 * Returns the view at t (0..1) and the path's natural duration in ms.
 */
export function flyTo(
  from: View,
  to: View,
  rho = 1.3,
): { at: (t: number) => View; duration: number } {
  const ux0 = from.cx,
    uy0 = from.cy,
    w0 = from.width;
  const ux1 = to.cx,
    uy1 = to.cy,
    w1 = to.width;
  const dx = ux1 - ux0,
    dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  const rho2 = rho * rho;

  if (d2 < 1e-6) {
    const S = Math.log(w1 / w0) / rho;
    return {
      at: (t) => ({ cx: ux0 + t * dx, cy: uy0 + t * dy, width: w0 * Math.exp(rho * t * S) }),
      duration: Math.max(450, Math.abs(S) * 900),
    };
  }

  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * d2) / (2 * w0 * rho2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * d2) / (2 * w1 * rho2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  return {
    at: (t) => {
      const s = t * S;
      const coshr0 = Math.cosh(r0);
      const u = (w0 / (rho2 * d1)) * (coshr0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return { cx: ux0 + u * dx, cy: uy0 + u * dy, width: (w0 * coshr0) / Math.cosh(rho * s + r0) };
    },
    duration: Math.min(2200, Math.max(600, S * 650)),
  };
}

/** Cinematic ease: quick to leave, slow to settle. */
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
