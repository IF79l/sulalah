import { CameraControls, Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import {
  buildLineage,
  layoutTree,
  pathTo,
  shotForBranch,
  shotForTree,
  type LineagePerson,
  type LineageUnion,
} from '@sulalah/tree-engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Branch } from './Branch';
import { palette } from './palette';

export interface LivingTreeProps {
  people: LineagePerson[];
  rootId: string;
  unions?: LineageUnion[];
  focusedId?: string | null;
  onFocusChange?: (personId: string | null, path: LineagePerson[]) => void;
  /** Arabic font (woff) for in-scene names; without it troika fetches fonts from a CDN at runtime. */
  fontUrl?: string;
}

/** The interactive 3D family tree: tap a branch and the camera flies to it. */
export function LivingTree({
  people,
  rootId,
  unions,
  focusedId = null,
  onFocusChange,
  fontUrl,
}: LivingTreeProps) {
  const lineage = useMemo(() => buildLineage(people, rootId, unions), [people, rootId, unions]);
  const layout = useMemo(() => layoutTree(lineage), [lineage]);
  const controls = useRef<CameraControls>(null);
  const [selected, setSelected] = useState<string | null>(focusedId);
  const known = useRef(new Set(people.map((p) => p.id)));
  const [sprouts, setSprouts] = useState(new Map<string, number>());

  useEffect(() => setSelected(focusedId), [focusedId]);

  // Any person not seen before grows in from their father's branch.
  useEffect(() => {
    const fresh = people.filter((p) => !known.current.has(p.id));
    if (fresh.length === 0) return;
    fresh.forEach((p) => known.current.add(p.id));
    const now = performance.now() / 1000;
    setSprouts((prev) => new Map([...prev, ...fresh.map((p) => [p.id, now] as const)]));
  }, [people]);

  useEffect(() => {
    const shot = selected ? shotForBranch(layout, selected) : shotForTree(layout);
    if (!shot || !controls.current) return;
    void controls.current.setLookAt(...shot.position, ...shot.target, true);
  }, [selected, layout]);

  const select = (personId: string | null) => {
    setSelected(personId);
    onFocusChange?.(personId, personId ? pathTo(lineage, personId).map((n) => n.person) : []);
  };

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 45, position: [0, 8, 26] }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={[palette.ivory]} />
      <fog attach="fog" args={[palette.ivory, 30, 80]} />
      <hemisphereLight args={[palette.ivory, palette.sand, 0.8]} />
      <directionalLight position={[8, 20, 10]} intensity={1.6} color={palette.glow} castShadow />
      <CameraControls ref={controls} smoothTime={0.6} minDistance={2} maxDistance={60} />

      {layout.branches.map((branch) => (
        <Branch
          key={branch.personId}
          branch={branch}
          highlighted={branch.personId === selected}
          growFrom={sprouts.get(branch.personId)}
          onSelect={select}
        />
      ))}

      {layout.branches.map((branch) => {
        const person = lineage.byId.get(branch.personId)?.person;
        if (!person) return null;
        return (
          <Text
            key={`label-${branch.personId}`}
            position={[branch.tip[0], branch.tip[1] + 0.45, branch.tip[2]]}
            fontSize={0.42 - Math.min(branch.depth, 4) * 0.05}
            color={palette.forest}
            anchorX="center"
            direction="rtl"
            font={fontUrl}
            onClick={(e) => {
              e.stopPropagation();
              select(branch.personId);
            }}
          >
            {person.name}
          </Text>
        );
      })}

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color={palette.sand} roughness={1} />
      </mesh>
    </Canvas>
  );
}
