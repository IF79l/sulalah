import type { PlanId } from '@sulalah/domain';

const leaf = 'M0 0C5-5 12-5 16 0C12 5 5 5 0 0Z';

/** One leaf on a twig, at (x, y), turned by `r` degrees; `d` orders its entrance. */
function Leaf({ x, y, r, d, tone = 'son' }: { x: number; y: number; r: number; d: number; tone?: 'son' | 'daughter' }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d={leaf} className="plan-leaf" data-tone={tone} style={{ ['--d' as string]: d }} />
    </g>
  );
}

/** A tree of a given size: a trunk, its forks and a crown of leaves. */
function Tree({ x, s, d0 = 0 }: { x: number; s: number; d0?: number }) {
  const h = 54 * s;
  return (
    <g transform={`translate(${x} 92)`}>
      <path
        pathLength={1}
        className="plan-stroke"
        style={{ ['--d' as string]: d0 }}
        d={`M0 0C-1 ${-h * 0.4} 1 ${-h * 0.7} 0 ${-h}M0 ${-h * 0.55}C${-8 * s} ${-h * 0.7} ${-14 * s} ${-h * 0.78} ${-18 * s} ${-h * 0.9}M0 ${-h * 0.62}C${8 * s} ${-h * 0.76} ${14 * s} ${-h * 0.82} ${18 * s} ${-h * 0.95}`}
      />
      {[
        [-20, -0.92, -150],
        [-24, -0.8, 160],
        [-12, -1.02, -120],
        [-6, -0.88, -135],
        [-2, -1.1, -95],
        [4, -0.92, -60],
        [9, -1.05, -70],
        [19, -0.97, -40],
        [24, -0.84, 0],
        [-16, -0.7, 175],
        [15, -0.72, 15],
      ].map(([lx, ly, r], k) => (
        <Leaf key={k} x={lx! * s} y={ly! * h} r={r!} d={d0 + 2 + k * 0.6} tone={k % 3 === 1 ? 'daughter' : 'son'} />
      ))}
    </g>
  );
}

/** The plan's size as a picture: a sapling, a full tree, a grove. Drawn in when scrolled to. */
export function PlanArt({ plan }: { plan: PlanId }) {
  return (
    <svg viewBox="0 0 160 100" className="h-28 w-auto md:h-32" aria-hidden="true">
      <path d="M8 92H152" className="plan-ground" />
      {plan === 'family' ? (
        <g transform="translate(80 92) scale(1.6)">
          <path pathLength={1} className="plan-stroke" style={{ ['--d' as string]: 0 }} d="M0 0C-1-12 2-22 0-36M0-22C-6-28-10-30-14-30" />
          <Leaf x={0} y={-36} r={-80} d={2} />
          <Leaf x={-14} y={-30} r={-160} d={2.6} tone="daughter" />
          <Leaf x={1} y={-16} r={-20} d={3.2} />
        </g>
      ) : plan === 'extended' ? (
        <Tree x={80} s={1.15} />
      ) : (
        <>
          <Tree x={42} s={0.8} d0={1} />
          <Tree x={118} s={0.85} d0={1.5} />
          <Tree x={80} s={1.15} />
        </>
      )}
    </svg>
  );
}
