import {
  bezierPoint,
  branchOutline,
  buildLineage,
  layoutTree2D,
  pathTo,
  viewForBox,
  type Branch2D,
  type LineagePerson,
  type LineageUnion,
  type PersonMark,
  type TreeLayout2D,
  type View,
} from '@sulalah/tree-engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { treeTheme as T } from './theme';
import { useCamera } from './useCamera';

export interface LivingTreeProps {
  /** Everyone in the tree, plus spouses (who have no father in the tree). */
  people: LineagePerson[];
  rootId: string;
  unions?: LineageUnion[];
  selectedId?: string | null;
  onSelect?: (personId: string | null, path: LineagePerson[]) => void;
  /** Bumped by the host to fly back to the whole tree. */
  fitSignal?: number;
  className?: string;
}

const LEAF_L = 78;
const LEAF_W = 54;
const GROW_MS = 1300;

/**
 * The family tree as a living illustration: the root ancestor is the trunk, each father
 * a branch, each of his children a named leaf. Tap a branch to fly to it; new people grow in.
 */
export function LivingTree({
  people,
  rootId,
  unions = [],
  selectedId = null,
  onSelect,
  fitSignal = 0,
  className,
}: LivingTreeProps) {
  const lineage = useMemo(() => buildLineage(people, rootId, unions), [people, rootId, unions]);
  const layout = useMemo(() => layoutTree2D(lineage), [lineage]);
  const names = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const svg = useRef<SVGSVGElement>(null);
  const cam = useCamera(svg, viewForBox(layout.box, 0.6));
  const aspect = cam.size.w / cam.size.h;
  const pxPerUnit = cam.size.w / cam.view.width;

  // Growth: anyone not seen before grows in from their father's branch.
  const known = useRef<Set<string> | null>(null);
  const [born, setBorn] = useState(new Map<string, number>());
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!known.current) {
      known.current = new Set(people.map((p) => p.id));
      return;
    }
    const fresh = people.filter((p) => !known.current!.has(p.id));
    if (fresh.length === 0) return;
    fresh.forEach((p) => known.current!.add(p.id));
    const t = performance.now();
    setBorn((prev) => new Map([...prev, ...fresh.map((p) => [p.id, t] as const)]));
    const father = fresh[0]?.fatherId;
    const box = father ? layout.subtreeBox.get(father) : undefined;
    if (box) cam.fly(viewForBox(box, aspect, 1.5));
  }, [people]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (born.size === 0) return;
    let raf = 0;
    const tick = (t: number) => {
      setNow(t);
      const growing = [...born.values()].some((b) => t - b < GROW_MS + 600);
      if (growing) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [born]);
  const growth = (id: string) => {
    const b = born.get(id);
    if (b === undefined) return 1;
    return Math.max(0, Math.min(1, (now - b) / GROW_MS));
  };

  // Camera follows the selection; a leaf gets a close-up, a branch gets its whole family.
  useEffect(() => {
    if (cam.size.w <= 1) return;
    cam.fly(shotFor(layout, selectedId, aspect));
  }, [selectedId, fitSignal, cam.size.w > 1]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: string | null) => {
    if (cam.wasDrag()) return;
    const path = id ? pathTo(lineage, id).map((n) => n.person) : [];
    onSelect?.(id, path);
  };

  const onPath = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(pathTo(lineage, selectedId).map((n) => n.person.id));
  }, [lineage, selectedId]);

  const v = cam.view;
  const h = v.width / aspect;
  const viewBox = `${v.cx - v.width / 2} ${v.cy - h / 2} ${v.width} ${h}`;
  const visible = cullBox(v, h);
  const showLeafNames = LEAF_W * pxPerUnit > 16;
  const showForkNames = pxPerUnit > 0.16;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: `radial-gradient(120% 90% at 50% 35%, ${T.skyBottom}, ${T.skyTop})`,
      }}
    >
      <style>{css}</style>
      <svg
        ref={svg}
        className="lt-svg"
        viewBox={viewBox}
        role="tree"
        aria-label="شجرة العائلة"
        onClick={() => select(null)}
        {...cam.handlers}
      >
        <Defs />
        <ellipse
          cx={0}
          cy={layout.trunkTop[1] - layout.canopyRadius * 0.2}
          rx={layout.canopyRadius * 1.05}
          ry={layout.canopyRadius * 0.95}
          fill="url(#lt-glow)"
        />
        <ellipse cx={0} cy={18} rx={layout.canopyRadius * 1.25} ry={70} fill="url(#lt-ground)" />
        <Canopy marks={layout.marks} branches={layout.branches} />
        <Roots trunk={layout.branches[0]!} />

        {layout.branches
          .filter((b) => b.kind !== 'twig' && inView(visible, b.curve[3], b.curve[0]))
          .sort((a, b) => b.widthStart - a.widthStart)
          .map((b) => (
            <path
              key={b.personId}
              d={branchOutline(b, growth(b.personId))}
              fill={b.status === 'proposed' ? 'url(#lt-sprout-wood)' : 'url(#lt-bark)'}
              className={onPath.has(b.personId) ? 'lt-wood lt-on-path' : 'lt-wood'}
              onClick={(e) => {
                e.stopPropagation();
                select(b.personId);
              }}
            />
          ))}

        <ellipse
          cx={layout.trunkTop[0]}
          cy={layout.trunkTop[1] + 6}
          rx={layout.branches[0]!.widthEnd * 0.55}
          ry={layout.branches[0]!.widthEnd * 0.22}
          fill="url(#lt-bark)"
          aria-hidden="true"
        />

        {layout.branches
          .filter((b) => b.kind === 'twig' && inView(visible, b.curve[3]))
          .map((b) => (
            <Twig key={b.personId} branch={b} progress={growth(b.personId)} />
          ))}

        {layout.marks
          .filter((m) => m.kind === 'leaf' && inView(visible, m.position))
          .map((m) => (
            <Leaf
              key={m.personId}
              mark={m}
              grow={Math.max(0, (growth(m.personId) - 0.55) / 0.45)}
              selected={m.personId === selectedId}
              showName={showLeafNames}
              onSelect={select}
            />
          ))}

        {layout.marks
          .filter((m) => m.kind === 'fork' && inView(visible, m.position))
          .map((m) => (
            <Fork
              key={m.personId}
              mark={m}
              selected={m.personId === selectedId}
              showName={showForkNames || onPath.has(m.personId)}
              onSelect={select}
              spouseNames={m.spouseIds.map((id) => names.get(id) ?? '')}
            />
          ))}

        <TrunkName
          mark={layout.marks[0]!}
          selected={selectedId === rootId}
          onSelect={select}
          spouseNames={layout.marks[0]!.spouseIds.map((id) => names.get(id) ?? '')}
          trunkTop={layout.trunkTop}
        />
      </svg>
    </div>
  );
}

function shotFor(layout: TreeLayout2D, id: string | null, aspect: number): View {
  const mark = id ? layout.markById.get(id) : undefined;
  if (!mark || mark.kind === 'root') return viewForBox(layout.box, aspect, 1.04);
  if (mark.kind === 'leaf') {
    const [x, y] = mark.position;
    return viewForBox({ minX: x - 210, maxX: x + 210, minY: y - 230, maxY: y + 190 }, aspect);
  }
  return viewForBox(layout.subtreeBox.get(mark.personId)!, aspect, 1.12);
}

type Cull = { minX: number; maxX: number; minY: number; maxY: number };
const cullBox = (v: View, h: number): Cull => ({
  minX: v.cx - v.width * 0.7,
  maxX: v.cx + v.width * 0.7,
  minY: v.cy - h * 0.7,
  maxY: v.cy + h * 0.7,
});
const inView = (c: Cull, ...pts: readonly (readonly [number, number])[]) =>
  pts.some(([x, y]) => x >= c.minX && x <= c.maxX && y >= c.minY && y <= c.maxY);

function Leaf({
  mark,
  grow,
  selected,
  showName,
  onSelect,
}: {
  mark: PersonMark;
  grow: number;
  selected: boolean;
  showName: boolean;
  onSelect: (id: string) => void;
}) {
  const [x, y] = mark.position;
  const deg = (mark.angle * 180) / Math.PI;
  const tone =
    mark.status === 'proposed'
      ? 'sprout'
      : mark.deceased
        ? 'withered'
        : `leaf-${hashIndex(mark.personId, 4)}`;
  const cx = x + Math.sin(mark.angle) * LEAF_L * 0.52;
  const cy = y - Math.cos(mark.angle) * LEAF_L * 0.52;
  const size = Math.min(14, (LEAF_W * 1.45) / Math.max(3, mark.name.length * 0.55));
  const s = easeOutBack(grow);
  if (grow <= 0) return null;
  return (
    <g
      className={`lt-leaf${selected ? ' lt-selected' : ''}`}
      role="treeitem"
      tabIndex={0}
      aria-label={mark.name}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(mark.personId);
      }}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(mark.personId)}
    >
      <g transform={`translate(${x} ${y}) rotate(${deg}) scale(${s})`}>
        <g className="lt-sway" style={{ animationDelay: `${-hashIndex(mark.personId, 40) / 10}s` }}>
          <path
            d={LEAF_PATH}
            fill={`url(#lt-${tone})`}
            className={mark.status === 'proposed' ? 'lt-proposed' : undefined}
          />
          <path d={`M0 -4 Q 3 ${-LEAF_L * 0.5} 0 ${-LEAF_L * 0.92}`} className="lt-rib" />
        </g>
      </g>
      {showName && grow > 0.6 && (
        <text
          x={cx}
          y={cy + size * 0.35}
          fontSize={size}
          className={mark.deceased ? 'lt-leaf-name lt-dark' : 'lt-leaf-name'}
          style={{ opacity: Math.min(1, (grow - 0.6) / 0.4) }}
        >
          {mark.name}
        </text>
      )}
      {mark.status === 'proposed' && grow >= 1 && (
        <text x={cx} y={cy + LEAF_L * 0.62} fontSize={9.5} className="lt-tag">
          بانتظار الاعتماد
        </text>
      )}
    </g>
  );
}

function Fork({
  mark,
  selected,
  showName,
  onSelect,
  spouseNames,
}: {
  mark: PersonMark;
  selected: boolean;
  showName: boolean;
  onSelect: (id: string) => void;
  spouseNames: string[];
}) {
  const [x, y] = mark.position;
  const w = Math.max(58, mark.name.length * 10 + 26);
  return (
    <g
      className={`lt-fork${selected ? ' lt-selected' : ''}`}
      role="treeitem"
      tabIndex={0}
      aria-label={`غصن ${mark.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(mark.personId);
      }}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(mark.personId)}
    >
      <circle cx={x} cy={y} r={9} className="lt-knot" />
      {showName && (
        <>
          <rect
            x={x - w / 2}
            y={y + 12}
            width={w}
            height={28}
            rx={14}
            className={mark.status === 'proposed' ? 'lt-badge lt-badge-proposed' : 'lt-badge'}
          />
          <text x={x} y={y + 31} className="lt-fork-name">
            {mark.name}
          </text>
          {spouseNames.filter(Boolean).map((n, i) => (
            <Spouse key={n} x={x - w / 2 - 14 - i * 64} y={y + 26} name={n} />
          ))}
        </>
      )}
    </g>
  );
}

function Spouse({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <g className="lt-spouse" aria-label={`الزوجة ${name}`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x} cy={y - 6} rx={3.4} ry={6} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r={3} className="lt-spouse-heart" />
      <text x={x - 12} y={y + 4} className="lt-spouse-name">
        {name}
      </text>
    </g>
  );
}

function TrunkName({
  mark,
  selected,
  onSelect,
  spouseNames,
  trunkTop,
}: {
  mark: PersonMark;
  selected: boolean;
  onSelect: (id: string) => void;
  spouseNames: string[];
  trunkTop: readonly [number, number];
}) {
  const words = mark.name.split(' ');
  const [x, y] = mark.position;
  return (
    <g
      className={`lt-trunk-name${selected ? ' lt-selected' : ''}`}
      role="treeitem"
      tabIndex={0}
      aria-label={`الجذع ${mark.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(mark.personId);
      }}
    >
      {words.map((w, i) => (
        <text key={i} x={x} y={y + (i - (words.length - 1) / 2) * 30} className="lt-root-name">
          {w}
        </text>
      ))}
      {spouseNames.filter(Boolean).map((n, i) => (
        <Spouse key={n} x={trunkTop[0] + 112 + i * 70} y={trunkTop[1] + 22} name={n} />
      ))}
    </g>
  );
}

function Twig({ branch, progress }: { branch: Branch2D; progress: number }) {
  const [p0, p1, p2, p3] = branch.curve;
  const len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) * 1.15;
  return (
    <path
      d={`M${p0[0]} ${p0[1]}C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`}
      className="lt-twig"
      strokeDasharray={progress < 1 ? `${len * progress} ${len}` : undefined}
    />
  );
}

/** Soft masses of foliage behind the branches give the tree a full, upright silhouette. */
function Canopy({ marks, branches }: { marks: PersonMark[]; branches: Branch2D[] }) {
  return (
    <g aria-hidden="true" filter="url(#lt-soft)">
      {branches
        .filter((b) => b.kind === 'limb')
        .map((b) => {
          const [x, y] = bezierPoint(b.curve, 0.62);
          return (
            <circle key={`mid-${b.personId}`} cx={x} cy={y} r={120} fill="url(#lt-canopy-b)" />
          );
        })}
      {marks
        .filter((m) => m.kind !== 'root')
        .map((m) => {
          const k = hashIndex(m.personId, 5);
          return (
            <circle
              key={m.personId}
              cx={m.position[0] + Math.sin(m.angle) * 34}
              cy={m.position[1] - Math.cos(m.angle) * 34}
              r={m.kind === 'leaf' ? 82 + k * 8 : 110 + k * 10}
              fill={k % 2 ? 'url(#lt-canopy-a)' : 'url(#lt-canopy-b)'}
            />
          );
        })}
    </g>
  );
}

function Roots({ trunk }: { trunk: Branch2D }) {
  const roots: Branch2D[] = [-1, 1, -0.45, 0.5].map((s, i) => ({
    ...trunk,
    personId: `root-${i}`,
    curve: [
      [s * 22, -40],
      [s * 40, -6],
      [s * 110, 6],
      [s * (150 + i * 30), 22 + i * 4],
    ],
    widthStart: 34 - i * 5,
    widthEnd: 3,
  }));
  return (
    <g aria-hidden="true">
      {roots.map((r) => (
        <path key={r.personId} d={branchOutline(r)} fill="url(#lt-bark)" opacity={0.9} />
      ))}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <radialGradient id="lt-glow">
        <stop offset="0%" stopColor={T.glow} stopOpacity={0.55} />
        <stop offset="100%" stopColor={T.glow} stopOpacity={0} />
      </radialGradient>
      <filter id="lt-soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="26" />
      </filter>
      <radialGradient id="lt-canopy-a">
        <stop offset="0%" stopColor="#3F7A4B" stopOpacity={0.95} />
        <stop offset="100%" stopColor="#2A5A3A" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="lt-canopy-b">
        <stop offset="0%" stopColor="#557F42" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#2F5E3B" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="lt-ground">
        <stop offset="0%" stopColor="#2C5A3E" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#2C5A3E" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="lt-bark" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor={T.barkDark} />
        <stop offset="55%" stopColor={T.barkLight} />
        <stop offset="100%" stopColor={T.barkDark} />
      </linearGradient>
      <linearGradient id="lt-sprout-wood" x1="0" x2="1">
        <stop offset="0%" stopColor="#9DBA5C" />
        <stop offset="100%" stopColor="#D8EE95" />
      </linearGradient>
      {T.leaves.map(([a, b], i) => (
        <linearGradient key={i} id={`lt-leaf-${i}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      ))}
      <linearGradient id="lt-sprout" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={T.sprout[0]} />
        <stop offset="100%" stopColor={T.sprout[1]} />
      </linearGradient>
      <linearGradient id="lt-withered" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={T.withered[0]} />
        <stop offset="100%" stopColor={T.withered[1]} />
      </linearGradient>
    </defs>
  );
}

const LEAF_PATH = `M0 0C${LEAF_W * 0.62} ${-LEAF_L * 0.18} ${LEAF_W * 0.55} ${-LEAF_L * 0.78} 0 ${-LEAF_L}C${-LEAF_W * 0.5} ${-LEAF_L * 0.8} ${-LEAF_W * 0.64} ${-LEAF_L * 0.2} 0 0Z`;

function hashIndex(id: string, n: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % n;
}

function easeOutBack(t: number): number {
  const c1 = 1.5;
  const u = t - 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + (c1 + 1) * u * u * u + c1 * u * u;
}

const css = `
.lt-svg { direction: rtl; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }
.lt-svg:active { cursor: grabbing; }
.lt-wood { cursor: pointer; transition: filter .4s; }
.lt-wood:hover, .lt-on-path { filter: brightness(1.25) drop-shadow(0 0 6px rgba(227,194,122,.45)); }
.lt-twig { fill: none; stroke: #6E4A2E; stroke-width: 2.4; stroke-linecap: round; }
.lt-leaf { cursor: pointer; outline: none; }
.lt-leaf path:first-child { filter: drop-shadow(0 3px 4px rgba(0,0,0,.28)); transition: filter .3s; }
.lt-leaf:hover path:first-child, .lt-leaf:focus-visible path:first-child { filter: brightness(1.15) drop-shadow(0 0 8px rgba(227,194,122,.6)); }
.lt-selected path:first-child { filter: brightness(1.2) drop-shadow(0 0 10px ${T.gold}); }
.lt-rib { fill: none; stroke: rgba(255,255,255,.28); stroke-width: 1.4; stroke-linecap: round; pointer-events: none; }
.lt-proposed { stroke: ${T.gold}; stroke-width: 2; stroke-dasharray: 5 4; animation: lt-pulse 2.4s ease-in-out infinite; }
.lt-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: lt-sway 5.5s ease-in-out infinite; }
.lt-leaf-name { fill: ${T.inkOnLeaf}; font-family: var(--tree-font, 'Alexandria', 'IBM Plex Sans Arabic', sans-serif); font-weight: 600; text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: rgba(20,50,30,.35); stroke-width: 2px; }
.lt-leaf-name.lt-dark { fill: #3A2A18; stroke: rgba(255,255,255,.25); }
.lt-tag { fill: ${T.gold}; font-family: var(--tree-font, 'IBM Plex Sans Arabic', sans-serif); text-anchor: middle; pointer-events: none; }
.lt-fork { cursor: pointer; outline: none; }
.lt-knot { fill: ${T.barkLight}; stroke: ${T.gold}; stroke-width: 2; }
.lt-badge { fill: ${T.badge}; stroke: rgba(227,194,122,.55); stroke-width: 1.2; }
.lt-badge-proposed { stroke: ${T.gold}; stroke-dasharray: 4 3; }
.lt-fork:hover .lt-badge, .lt-fork:focus-visible .lt-badge, .lt-fork.lt-selected .lt-badge { stroke: ${T.gold}; stroke-width: 2; }
.lt-fork-name { fill: ${T.ink}; font: 600 15px var(--tree-font, 'Alexandria', 'IBM Plex Sans Arabic', sans-serif); text-anchor: middle; pointer-events: none; }
.lt-root-name { fill: ${T.ink}; font: 600 26px var(--tree-font, 'Alexandria', 'IBM Plex Sans Arabic', sans-serif); text-anchor: middle; cursor: pointer; paint-order: stroke; stroke: rgba(40,24,12,.45); stroke-width: 3px; }
.lt-spouse ellipse { fill: #F2B8A8; opacity: .9; }
.lt-spouse-heart { fill: ${T.gold}; }
.lt-spouse-name { fill: #F6D9CF; font: 500 12px var(--tree-font, 'IBM Plex Sans Arabic', sans-serif); text-anchor: start; }
@keyframes lt-sway { 0%,100% { transform: rotate(-2.2deg); } 50% { transform: rotate(2.2deg); } }
@keyframes lt-pulse { 0%,100% { stroke-opacity: 1; } 50% { stroke-opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .lt-sway, .lt-proposed { animation: none; } }
`;
