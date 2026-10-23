'use client';

import { cn } from '@sulalah/ui';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * The drawn pieces the app pages share with the home page: a sprig that heads each page, a
 * sapling for empty states, and a branch that shows where additions hang. They draw in once,
 * with the same strokes and leaves as the plan pictures (globals.css: plan-stroke, plan-leaf).
 */

const leafPath = 'M0 0C5-5 12-5 16 0C12 5 5 5 0 0Z';
const d = (n: number) => ({ ['--d' as string]: n }) as CSSProperties;

/** Marks itself `data-in` a frame after mounting, so its drawing plays on arrival. */
export function DrawIn({ className, children }: { className?: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(f);
  }, []);
  return (
    <span data-in={on ? '' : undefined} className={className}>
      {children}
    </span>
  );
}

function Leaf({
  x,
  y,
  r,
  n,
  tone = 'son',
  s = 1,
}: {
  x: number;
  y: number;
  r: number;
  n: number;
  tone?: 'son' | 'daughter';
  s?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d={leafPath} className="plan-leaf" data-tone={tone} style={d(n)} />
    </g>
  );
}

/** A small branch with three leaves, set beside each page's title. */
export function Sprig({ className }: { className?: string }) {
  return (
    <DrawIn className={cn('inline-flex', className)}>
      <svg viewBox="0 0 44 44" className="size-full" aria-hidden="true">
        <path
          pathLength={1}
          className="plan-stroke"
          style={d(0)}
          d="M6 40C14 34 20 24 24 6M17 25C12 22 9 17 9 12M21 16C26 14 31 14 35 16"
        />
        <Leaf x={24} y={6} r={-75} n={2.2} />
        <Leaf x={9} y={12} r={-100} n={2.6} tone="daughter" />
        <Leaf x={35} y={16} r={-10} n={3} />
      </svg>
    </DrawIn>
  );
}

/** A sapling on dotted ground, for pages with nothing on them yet. */
export function Sapling({ className }: { className?: string }) {
  return (
    <DrawIn className={cn('inline-flex', className)}>
      <svg viewBox="0 0 120 90" className="size-full" aria-hidden="true">
        <path d="M14 82H106" className="plan-ground" />
        <path
          pathLength={1}
          className="plan-stroke"
          style={d(0)}
          d="M60 82C59 66 62 52 60 30M60 56C52 50 46 48 40 48M61 44C68 38 74 36 80 37"
        />
        <Leaf x={60} y={30} r={-85} n={2.4} s={1.3} />
        <Leaf x={40} y={48} r={-165} n={2.9} s={1.2} tone="daughter" />
        <Leaf x={80} y={37} r={-15} n={3.4} s={1.2} />
        <Leaf x={60} y={66} r={-30} n={3.9} />
      </svg>
    </DrawIn>
  );
}

export interface GlimpseLeaf {
  id: string;
  name: string;
  gender: 'male' | 'female';
  pending?: boolean;
}

/**
 * Where a submission hangs: the father's medallion with the new names fanned above him as
 * leaves, dashed while they wait. The same picture the owner will see on the tree.
 */
export function BranchGlimpse({
  father,
  leaves,
  className,
}: {
  father: string;
  leaves: GlimpseLeaf[];
  className?: string;
}) {
  const shown = leaves.slice(0, 6);
  const n = shown.length;
  return (
    <DrawIn className={cn('block', className)}>
      <svg
        viewBox="0 0 260 132"
        className="h-auto w-full"
        role="img"
        aria-label={`${shown.map((l) => l.name).join('، ')} تحت ${father}`}
      >
        <path d="M30 124H230" className="plan-ground" />
        <path
          pathLength={1}
          className="plan-stroke"
          style={d(0)}
          d="M130 124C129 116 131 110 130 102"
        />
        {shown.map((l, i) => {
          // Fan the leaves over the father, from his right shoulder to his left.
          const a = n === 1 ? Math.PI / 2 : Math.PI * (0.18 + (0.64 * i) / (n - 1));
          const x = 130 + Math.cos(a) * 44;
          const y = 88 - Math.sin(a) * 38;
          const deg = (-a * 180) / Math.PI;
          return (
            <g key={l.id}>
              <path
                pathLength={1}
                className="plan-stroke"
                style={{ ...d(0.6 + i * 0.25), strokeWidth: 2 }}
                d={`M130 84Q${130 + Math.cos(a) * 26} ${82 - Math.sin(a) * 30} ${x} ${y}`}
              />
              <g
                transform={`translate(${x - Math.cos(a) * 10} ${y + Math.sin(a) * 10}) rotate(${deg}) scale(1.9)`}
              >
                <path
                  d={leafPath}
                  className="plan-leaf"
                  data-tone={l.gender === 'female' ? 'daughter' : 'son'}
                  style={{ ...d(1.6 + i * 0.3), opacity: l.pending ? 0.55 : 1 }}
                />
                {l.pending ? (
                  <path
                    d={leafPath}
                    fill="none"
                    stroke="var(--color-pending)"
                    strokeWidth="0.7"
                    strokeDasharray="1.6 1.4"
                  />
                ) : null}
              </g>
              <text
                x={x + Math.cos(a) * 56}
                y={y - Math.sin(a) * 36 + 4}
                textAnchor="middle"
                className="fill-forest text-[11px] font-semibold"
              >
                {l.name}
              </text>
            </g>
          );
        })}
        <circle cx="130" cy="92" r="17" className="fill-ivory stroke-gold" strokeWidth="2.5" />
        <text x="130" y="96.5" textAnchor="middle" className="fill-forest text-[10.5px] font-bold">
          {father.length > 6 ? `${father.slice(0, 5)}…` : father}
        </text>
        {leaves.length > shown.length ? (
          <text x="230" y="118" textAnchor="end" className="fill-muted text-[10px]">
            +{leaves.length - shown.length}
          </text>
        ) : null}
      </svg>
    </DrawIn>
  );
}

/** The leaf-shaped node on the activity vine, coloured by what happened. */
export function VineLeaf({ tone, className }: { tone: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('size-5', className)} aria-hidden="true">
      <path d="M3 17C3 9 9 3 17 3C17 11 11 17 3 17Z" fill={tone} />
      <path
        d="M4 16L13 7"
        stroke="white"
        strokeOpacity=".55"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
