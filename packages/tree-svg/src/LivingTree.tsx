import {
  bezierPoint,
  boxOf,
  branchOutline,
  buildLineage,
  layoutTree2D,
  pathTo,
  seededRandom,
  viewForBox,
  type Box,
  type Branch2D,
  type LineagePerson,
  type LineageUnion,
  type PersonMark,
  type TreeLayout2D,
  type Vec2,
  type View,
} from '@sulalah/tree-engine';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { treeTheme as T } from './theme';
import { useCamera } from './useCamera';

export interface LivingTreeProps {
  /** Everyone in the tree, plus spouses (who have no father in the tree). */
  people: LineagePerson[];
  rootId: string;
  unions?: LineageUnion[];
  /** Forefathers above the root, nearest first, written down the trunk; the last is the family name. */
  ancestors?: string[];
  /** Heading over the crown, e.g. "شجرة أسرة الراشد". */
  title?: string;
  selectedId?: string | null;
  onSelect?: (personId: string | null, path: LineagePerson[]) => void;
  /** Bumped by the host to fly back to the whole tree. */
  fitSignal?: number;
  className?: string;
}

const LEAF_L = 80;
const LEAF_W = 52;
const GROW_MS = 1300;

/**
 * The family tree as a living poster: the root ancestor is the trunk with his forefathers
 * written down it, each father a branch with his name on a medallion, each of his children
 * a named leaf (green for sons, pink for daughters). Tap to fly in; new people grow in.
 */
export function LivingTree({
  people,
  rootId,
  unions = [],
  ancestors = [],
  title,
  selectedId = null,
  onSelect,
  fitSignal = 0,
  className,
}: LivingTreeProps) {
  const lineage = useMemo(() => buildLineage(people, rootId, unions), [people, rootId, unions]);
  const layout = useMemo(() => layoutTree2D(lineage), [lineage]);
  const filler = useMemo(() => fillerLeaves(layout), [layout]);
  const names = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const titleY = layout.box.minY - 60;
  const fullBox: Box = title
    ? { ...layout.box, minY: Math.min(layout.box.minY, titleY - 90) }
    : layout.box;
  const svg = useRef<SVGSVGElement>(null);
  const cam = useCamera(svg, viewForBox(fullBox, 0.6));
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
    if (father && layout.markById.has(father)) cam.fly(shotFor(layout, fullBox, father, aspect));
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
    cam.fly(shotFor(layout, fullBox, selectedId, aspect));
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
  const showLeafNames = LEAF_W * pxPerUnit > 17;
  const showForkNames = pxPerUnit > 0.14;
  const trunk = layout.branches[0]!;
  const root = layout.marks[0]!;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: T.paper,
        backgroundImage: `${PATTERN}, radial-gradient(110% 80% at 50% 40%, ${T.paper}, ${T.paperDeep})`,
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
          cx={layout.canopy.center[0]}
          cy={layout.canopy.center[1]}
          rx={layout.canopy.rx * 1.08}
          ry={layout.canopy.ry * 1.06}
          fill="url(#lt-crown)"
          pointerEvents="none"
          aria-hidden="true"
        />
        <Ground width={layout.canopy.rx * 1.1} />
        <Trunk trunk={trunk} />

        {layout.branches
          .filter((b) => b.kind === 'limb' && inView(visible, b.curve[3], b.curve[0]))
          .sort((a, b) => b.widthStart - a.widthStart)
          .map((b) => (
            <path
              key={b.personId}
              d={branchOutline(b, growth(b.personId), 22)}
              fill={b.status === 'proposed' ? 'url(#lt-sprout-wood)' : T.bark}
              className={onPath.has(b.personId) ? 'lt-wood lt-on-path' : 'lt-wood'}
              onClick={(e) => {
                e.stopPropagation();
                select(b.personId);
              }}
            />
          ))}
        <ellipse
          cx={layout.trunkTop[0]}
          cy={layout.trunkTop[1] + 10}
          rx={trunk.widthEnd * 0.52}
          ry={trunk.widthEnd * 0.3}
          fill={T.bark}
          aria-hidden="true"
        />

        {layout.branches
          .filter((b) => b.kind === 'twig' && inView(visible, b.curve[3]))
          .map((b) => (
            <Twig key={b.personId} branch={b} progress={growth(b.personId)} />
          ))}

        <Filler leaves={filler} visible={visible} />

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
            <Medallion
              key={m.personId}
              mark={m}
              grow={growth(m.personId)}
              selected={m.personId === selectedId}
              onPath={onPath.has(m.personId)}
              showName={showForkNames || onPath.has(m.personId)}
              onSelect={select}
              spouseNames={m.spouseIds.map((id) => names.get(id) ?? '')}
            />
          ))}

        <TrunkLineage
          mark={root}
          ancestors={ancestors}
          selected={selectedId === rootId}
          onSelect={select}
          spouseNames={root.spouseIds.map((id) => names.get(id) ?? '')}
        />

        {title && (
          <g className="lt-title" aria-hidden="true">
            <text x={0} y={titleY}>
              {title}
            </text>
            <path
              d={`M-260 ${titleY + 34}Q0 ${titleY + 18} 260 ${titleY + 34}`}
              className="lt-title-rule"
            />
            <circle cx={0} cy={titleY + 26} r={6} fill={T.gold} />
          </g>
        )}
      </svg>
    </div>
  );
}

function shotFor(layout: TreeLayout2D, full: Box, id: string | null, aspect: number): View {
  const mark = id ? layout.markById.get(id) : undefined;
  if (!mark) return viewForBox(full, aspect, 1.02);
  if (mark.kind === 'root') {
    const [x, y] = mark.position;
    return viewForBox({ minX: x - 260, maxX: x + 260, minY: y - 260, maxY: 60 }, aspect);
  }
  if (mark.kind === 'leaf') {
    const [x, y] = mark.position;
    return viewForBox({ minX: x - 220, maxX: x + 220, minY: y - 240, maxY: y + 200 }, aspect);
  }
  // A father's close-up: him, his children's leaves and his sons' medallions, readable at a glance.
  // The rest of his line stays in view at the edges, one tap away.
  const family = layout.branches.filter((b) => b.parentId === mark.personId).map((b) => b.curve[3]);
  const box = boxOf([mark.position, ...family]);
  return viewForBox(
    { minX: box.minX - 140, maxX: box.maxX + 140, minY: box.minY - 150, maxY: box.maxY + 110 },
    aspect,
  );
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
  const female = mark.gender === 'female';
  const tone =
    mark.status === 'proposed' ? 'sprout' : mark.deceased ? 'withered' : female ? 'female' : 'male';
  const cx = x + Math.sin(mark.angle) * LEAF_L * 0.5;
  const cy = y - Math.cos(mark.angle) * LEAF_L * 0.5;
  const size = Math.min(14.5, (LEAF_W * 1.5) / Math.max(3, mark.name.length * 0.6));
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
            className={mark.status === 'proposed' ? 'lt-blade lt-proposed' : 'lt-blade'}
          />
          <path d={`M0 -3 Q 2.5 ${-LEAF_L * 0.5} 0 ${-LEAF_L * 0.9}`} className="lt-rib" />
        </g>
      </g>
      {showName && grow > 0.6 && (
        <text
          x={cx}
          y={cy + size * 0.36}
          fontSize={size}
          className={`lt-leaf-name${female ? ' lt-on-female' : ''}`}
          style={{ opacity: Math.min(1, (grow - 0.6) / 0.4) }}
        >
          {mark.name}
        </text>
      )}
      {mark.status === 'proposed' && grow >= 1 && (
        <text x={cx} y={cy + LEAF_L * 0.6} fontSize={10} className="lt-tag">
          بانتظار الاعتماد
        </text>
      )}
    </g>
  );
}

/** A father's name on a round medallion where his branch divides. */
function Medallion({
  mark,
  grow,
  selected,
  onPath,
  showName,
  onSelect,
  spouseNames,
}: {
  mark: PersonMark;
  grow: number;
  selected: boolean;
  onPath: boolean;
  showName: boolean;
  onSelect: (id: string) => void;
  spouseNames: string[];
}) {
  const [x, y] = mark.position;
  const r = Math.max(27, Math.min(44, mark.name.length * 4.4 + 13));
  const size = Math.min(15, (r * 1.75) / Math.max(2.5, mark.name.length * 0.62));
  const cls = [
    'lt-medal',
    mark.deceased && 'lt-medal-deceased',
    mark.status === 'proposed' && 'lt-medal-proposed',
    selected && 'lt-selected',
    onPath && 'lt-medal-path',
  ]
    .filter(Boolean)
    .join(' ');
  if (grow < 0.85) return null;
  return (
    <g
      className={cls}
      role="treeitem"
      tabIndex={0}
      aria-label={`غصن ${mark.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(mark.personId);
      }}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(mark.personId)}
    >
      <circle cx={x} cy={y} r={r} className="lt-medal-face" />
      <circle cx={x} cy={y} r={r - 4.5} className="lt-medal-ring" />
      {showName && (
        <text x={x} y={y + size * 0.36} fontSize={size} className="lt-medal-name">
          {mark.name}
        </text>
      )}
      {showName &&
        spouseNames
          .filter(Boolean)
          .map((n, i) => <Spouse key={n} x={x - r - 16 - i * 70} y={y + r * 0.55} name={n} />)}
    </g>
  );
}

function Spouse({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <g className="lt-spouse" aria-label={`الزوجة ${name}`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x} cy={y - 6.5} rx={4} ry={6.5} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r={3.4} className="lt-spouse-heart" />
      <text x={x - 13} y={y + 4.5} className="lt-spouse-name">
        {name}
      </text>
    </g>
  );
}

/** The root's medallion at the top of the trunk, his forefathers engraved below it. */
function TrunkLineage({
  mark,
  ancestors,
  selected,
  onSelect,
  spouseNames,
}: {
  mark: PersonMark;
  ancestors: string[];
  selected: boolean;
  onSelect: (id: string) => void;
  spouseNames: string[];
}) {
  const [x, y] = mark.position;
  const [first, ...rest] = mark.name.split(' ');
  const r = 66;
  const forefathers = ancestors.slice(0, -1);
  const family = ancestors.at(-1);
  const top = y + r + 54;
  const bottom = -86;
  const step = forefathers.length
    ? Math.min(64, (bottom - 60 - top) / Math.max(1, forefathers.length - 1))
    : 0;
  return (
    <g>
      <g
        className={`lt-root${selected ? ' lt-selected' : ''}`}
        role="treeitem"
        tabIndex={0}
        aria-label={`الجذع ${mark.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(mark.personId);
        }}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(mark.personId)}
      >
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={x + Math.cos(a) * (r + 7)}
              cy={y + Math.sin(a) * (r + 7)}
              r={7}
              fill="url(#lt-gold)"
            />
          );
        })}
        <circle cx={x} cy={y} r={r + 2} fill="url(#lt-gold)" />
        <circle cx={x} cy={y} r={r - 8} className="lt-root-face" />
        <text x={x} y={y + (rest.length ? 2 : 12)} className="lt-root-name">
          {first}
        </text>
        {rest.length > 0 && (
          <text x={x} y={y + 30} className="lt-root-sub">
            {rest.join(' ')}
          </text>
        )}
        {spouseNames.filter(Boolean).map((n, i) => (
          <Spouse key={n} x={x - r - 26 - i * 74} y={y + 8} name={n} />
        ))}
      </g>
      <g aria-hidden="true">
        {forefathers.map((n, i) => (
          <g key={n + i}>
            <text x={x} y={top + i * step} className="lt-engraved">
              {n}
            </text>
            <path d={`M${x - 26} ${top + i * step + 20}h52`} className="lt-engraved-rule" />
          </g>
        ))}
        {family && (
          <text x={x} y={bottom} className="lt-family">
            {family}
          </text>
        )}
      </g>
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

/** The trunk flares into roots at the ground and narrows as it climbs into the crown. */
function Trunk({ trunk }: { trunk: Branch2D }) {
  const d = useMemo(() => trunkOutline(trunk), [trunk]);
  const grooves = useMemo(() => {
    const rand = seededRandom(`bark-${trunk.personId}`);
    return [-0.3, -0.12, 0.08, 0.26].map((k) => {
      const s = 0.08 + rand() * 0.2;
      const e = 0.6 + rand() * 0.3;
      const pts = [s, (s + e) / 2, e].map((t) => {
        const [px, py] = bezierPoint(trunk.curve, t);
        const w = trunk.widthStart + (trunk.widthEnd - trunk.widthStart) * t;
        return [px + k * w + (rand() - 0.5) * 8, py] as const;
      });
      return `M${pts[0]![0]} ${pts[0]![1]}Q${pts[1]![0]} ${pts[1]![1]} ${pts[2]![0]} ${pts[2]![1]}`;
    });
  }, [trunk]);
  const roots = useMemo(
    () =>
      [-1, 1, -0.55, 0.6, -0.2].map((s, i) =>
        branchOutline({
          ...trunk,
          curve: [
            [s * trunk.widthStart * 0.45, -30],
            [s * trunk.widthStart * 0.7, -4],
            [s * trunk.widthStart * 1.1, 8],
            [s * trunk.widthStart * (1.5 + (i % 2) * 0.3), 20 + i * 3],
          ],
          widthStart: 30 - i * 4,
          widthEnd: 2,
        }),
      ),
    [trunk],
  );
  return (
    <g aria-hidden="true">
      {roots.map((r, i) => (
        <path key={i} d={r} fill={T.barkDark} />
      ))}
      <path d={d} fill="url(#lt-bark)" />
      {grooves.map((g, i) => (
        <path key={i} d={g} className="lt-groove" />
      ))}
    </g>
  );
}

function trunkOutline(trunk: Branch2D, samples = 26): string {
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = bezierPoint(trunk.curve, t);
    const flare = 1 + 0.85 * Math.pow(Math.max(0, 1 - t / 0.16), 2);
    const w = ((trunk.widthStart + (trunk.widthEnd - trunk.widthStart) * t) * flare) / 2;
    left.push([p[0] - w, p[1]]);
    right.push([p[0] + w, p[1]]);
  }
  const f = (v: Vec2) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  return `M${left.map(f).join('L')}L${right.reverse().map(f).join('L')}Z`;
}

function Ground({ width }: { width: number }) {
  const blades = useMemo(() => {
    const rand = seededRandom('grass');
    return Array.from({ length: 90 }, () => {
      const x = (rand() * 2 - 1) * width * 0.78;
      const hgt = 14 + rand() * 22;
      const lean = (rand() - 0.5) * 14;
      const y = 26 + Math.abs(x / width) * 14 - rand() * 6;
      return {
        d: `M${x - 3} ${y}Q${x + lean * 0.4} ${y - hgt * 0.6} ${x + lean} ${y - hgt}Q${x + 1} ${y - hgt * 0.4} ${x + 3} ${y}Z`,
        k: rand() < 0.5 ? 0 : 1,
      };
    });
  }, [width]);
  return (
    <g aria-hidden="true" pointerEvents="none">
      <ellipse cx={0} cy={34} rx={width * 0.9} ry={40} fill="url(#lt-grass)" />
      {blades.map((b, i) => (
        <path key={i} d={b.d} fill={T.grass[b.k]} />
      ))}
    </g>
  );
}

interface FillerLeaf {
  x: number;
  y: number;
  deg: number;
  scale: number;
  tone: number;
}

/** Unnamed leaves along the wood, so even a young family reads as a full, healthy tree. */
function fillerLeaves(layout: TreeLayout2D): FillerLeaf[] {
  const out: FillerLeaf[] = [];
  for (const b of layout.branches) {
    if (b.kind === 'trunk') continue;
    const rand = seededRandom(`leafy-${b.personId}`);
    const len = Math.hypot(b.curve[3][0] - b.curve[0][0], b.curve[3][1] - b.curve[0][1]);
    const fromRoot = b.depth === 1;
    if (b.kind === 'twig') {
      // Two small leaves tucked behind each named one thicken the cluster.
      const [x, y] = b.curve[3];
      const heading = Math.atan2(x - b.curve[0][0], -(y - b.curve[0][1]));
      for (const side of [-1, 1]) {
        const a = heading + side * (0.32 + rand() * 0.2);
        out.push({
          x: x + Math.sin(a) * 18,
          y: y - Math.cos(a) * 18,
          deg: (a * 180) / Math.PI,
          scale: 0.5 + rand() * 0.15,
          tone: Math.floor(rand() * 3),
        });
      }
      continue;
    }
    const count = Math.floor(len / 30);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5 + (rand() - 0.5) * 0.5) / count;
      if (t < (fromRoot ? 0.45 : 0.2) || t > 0.85) continue;
      const p = bezierPoint(b.curve, t);
      const q = bezierPoint(b.curve, Math.min(1, t + 0.02));
      const heading = Math.atan2(q[0] - p[0], -(q[1] - p[1]));
      const side = i % 2 === 0 ? 1 : -1;
      const w = (b.widthStart + (b.widthEnd - b.widthStart) * t) / 2;
      const a = heading + side * (0.7 + rand() * 0.4);
      out.push({
        x: p[0] + Math.sin(heading + (side * Math.PI) / 2) * w,
        y: p[1] - Math.cos(heading + (side * Math.PI) / 2) * w,
        deg: (a * 180) / Math.PI,
        scale: 0.42 + rand() * 0.18,
        tone: Math.floor(rand() * 3),
      });
    }
  }
  return out;
}

const Filler = memo(function Filler({ leaves, visible }: { leaves: FillerLeaf[]; visible: Cull }) {
  return (
    <g aria-hidden="true" className="lt-filler">
      {leaves
        .filter((l) => inView(visible, [l.x, l.y]))
        .map((l, i) => (
          <path
            key={i}
            d={LEAF_PATH}
            fill={T.filler[l.tone]}
            transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.deg.toFixed(0)}) scale(${l.scale.toFixed(2)})`}
          />
        ))}
    </g>
  );
});

function Defs() {
  return (
    <defs>
      <radialGradient id="lt-crown">
        <stop offset="0%" stopColor="#CFE3A8" stopOpacity={0.5} />
        <stop offset="75%" stopColor="#DCE7B6" stopOpacity={0.28} />
        <stop offset="100%" stopColor="#E8E6C2" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="lt-grass" cy="35%">
        <stop offset="0%" stopColor={T.grass[0]} stopOpacity={0.95} />
        <stop offset="70%" stopColor={T.grass[1]} stopOpacity={0.55} />
        <stop offset="100%" stopColor={T.grass[1]} stopOpacity={0} />
      </radialGradient>
      <linearGradient id="lt-bark" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor={T.barkDark} />
        <stop offset="45%" stopColor={T.barkLight} />
        <stop offset="62%" stopColor={T.bark} />
        <stop offset="100%" stopColor={T.barkDark} />
      </linearGradient>
      <linearGradient id="lt-gold" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={T.goldLight} />
        <stop offset="55%" stopColor={T.gold} />
        <stop offset="100%" stopColor="#9A7228" />
      </linearGradient>
      <linearGradient id="lt-sprout-wood" x1="0" x2="1">
        <stop offset="0%" stopColor="#B9A57A" />
        <stop offset="100%" stopColor="#E6D6A8" />
      </linearGradient>
      {(
        [
          ['male', T.male],
          ['female', T.female],
          ['sprout', T.sprout],
          ['withered', T.withered],
        ] as const
      ).map(([id, [a, b]]) => (
        <linearGradient key={id} id={`lt-${id}`} x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stopColor={b} />
          <stop offset="100%" stopColor={a} />
        </linearGradient>
      ))}
    </defs>
  );
}

const LEAF_PATH = `M0 0C${LEAF_W * 0.64} ${-LEAF_L * 0.16} ${LEAF_W * 0.58} ${-LEAF_L * 0.74} 0 ${-LEAF_L}C${-LEAF_W * 0.56} ${-LEAF_L * 0.76} ${-LEAF_W * 0.66} ${-LEAF_L * 0.18} 0 0Z`;

// Faint eight-point stars, the geometric ground of a framed nasab poster.
const PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'><g fill='none' stroke='${T.pattern}' stroke-width='1' opacity='.55'><rect x='24' y='24' width='24' height='24'/><rect x='24' y='24' width='24' height='24' transform='rotate(45 36 36)'/><path d='M0 36h12M60 36h12M36 0v12M36 60v12'/></g></svg>`,
)}")`;

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

const font = `var(--tree-font, 'Alexandria', 'IBM Plex Sans Arabic', sans-serif)`;
const css = `
.lt-svg { direction: rtl; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }
.lt-svg:active { cursor: grabbing; }
.lt-wood { cursor: pointer; transition: filter .4s; }
.lt-wood:hover, .lt-on-path { filter: brightness(1.18) drop-shadow(0 0 5px rgba(194,150,58,.55)); }
.lt-twig { fill: none; stroke: ${T.bark}; stroke-width: 2.6; stroke-linecap: round; }
.lt-groove { fill: none; stroke: ${T.barkDark}; stroke-width: 2.5; stroke-linecap: round; opacity: .45; }
.lt-filler path { opacity: .92; }
.lt-leaf { cursor: pointer; outline: none; }
.lt-blade { stroke: rgba(40,60,20,.28); stroke-width: 1; filter: drop-shadow(0 2px 2px rgba(60,40,10,.22)); transition: filter .3s; }
.lt-leaf:hover .lt-blade, .lt-leaf:focus-visible .lt-blade { filter: brightness(1.08) drop-shadow(0 0 7px rgba(194,150,58,.8)); }
.lt-leaf.lt-selected .lt-blade { stroke: ${T.gold}; stroke-width: 2.5; filter: drop-shadow(0 0 9px ${T.gold}); }
.lt-rib { fill: none; stroke: rgba(255,255,255,.45); stroke-width: 1.3; stroke-linecap: round; pointer-events: none; }
.lt-proposed { stroke: ${T.gold}; stroke-width: 2; stroke-dasharray: 5 4; animation: lt-pulse 2.4s ease-in-out infinite; }
.lt-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: lt-sway 6s ease-in-out infinite; }
.lt-leaf-name { fill: ${T.inkOnMale}; font-family: ${font}; font-weight: 700; text-anchor: middle; pointer-events: none; }
.lt-leaf-name.lt-on-female { fill: ${T.inkOnFemale}; }
.lt-tag { fill: #8A6420; font-family: ${font}; font-weight: 600; text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: ${T.paper}; stroke-width: 3px; }
.lt-medal { cursor: pointer; outline: none; }
.lt-medal-face { fill: ${T.medal}; stroke: ${T.gold}; stroke-width: 3; filter: drop-shadow(0 2px 3px rgba(60,40,10,.3)); transition: filter .3s; }
.lt-medal-ring { fill: none; stroke: ${T.goldLight}; stroke-width: 1.2; }
.lt-medal-deceased .lt-medal-face { fill: ${T.medalDeceased}; }
.lt-medal-proposed .lt-medal-face { stroke-dasharray: 5 4; }
.lt-medal:hover .lt-medal-face, .lt-medal:focus-visible .lt-medal-face, .lt-medal-path .lt-medal-face { filter: drop-shadow(0 0 8px rgba(194,150,58,.85)); }
.lt-medal.lt-selected .lt-medal-face { stroke-width: 5; }
.lt-medal-name { fill: ${T.ink}; font-family: ${font}; font-weight: 700; text-anchor: middle; pointer-events: none; }
.lt-root { cursor: pointer; outline: none; }
.lt-root-face { fill: ${T.medal}; stroke: #9A7228; stroke-width: 2; }
.lt-root.lt-selected .lt-root-face { stroke: ${T.goldLight}; stroke-width: 5; }
.lt-root-name { fill: ${T.ink}; font: 700 34px ${font}; text-anchor: middle; }
.lt-root-sub { fill: #7A5A2E; font: 600 15px ${font}; text-anchor: middle; }
.lt-engraved { fill: ${T.engraved}; font: 700 24px ${font}; text-anchor: middle; paint-order: stroke; stroke: rgba(40,22,10,.5); stroke-width: 3px; }
.lt-engraved-rule { stroke: ${T.goldLight}; stroke-width: 1.5; opacity: .6; }
.lt-family { fill: ${T.goldLight}; font: 700 36px ${font}; text-anchor: middle; paint-order: stroke; stroke: rgba(40,22,10,.6); stroke-width: 4px; }
.lt-spouse ellipse { fill: ${T.female[0]}; stroke: ${T.female[1]}; stroke-width: .8; }
.lt-spouse-heart { fill: ${T.gold}; }
.lt-spouse-name { fill: ${T.inkOnFemale}; font: 600 13px ${font}; text-anchor: start; paint-order: stroke; stroke: ${T.paper}; stroke-width: 3px; }
.lt-title text { fill: #5A3A14; font: 700 84px var(--tree-title-font, 'Aref Ruqaa', serif); text-anchor: middle; }
.lt-title-rule { fill: none; stroke: ${T.gold}; stroke-width: 2; }
@keyframes lt-sway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes lt-pulse { 0%,100% { stroke-opacity: 1; } 50% { stroke-opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .lt-sway, .lt-proposed { animation: none; } }
`;
