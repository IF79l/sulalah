import { useFrame } from '@react-three/fiber';
import type { BranchGeometry } from '@sulalah/tree-engine';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { palette } from './palette';

interface BranchProps {
  branch: BranchGeometry;
  highlighted: boolean;
  /** Seconds since this branch first appeared; drives the grow animation. */
  growFrom?: number;
  onSelect: (personId: string) => void;
}

const GROW_SECONDS = 1.4;

/** A tapered wooden tube along the branch curve; proposed branches glow until approved. */
export function Branch({ branch, highlighted, growFrom, onSelect }: BranchProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(branch.points.map((p) => new THREE.Vector3(...p)));
    const tube = new THREE.TubeGeometry(curve, 32, 1, 10, false);
    taper(tube, branch.radiusStart, branch.radiusEnd, curve);
    return tube;
  }, [branch]);

  const proposed = branch.status === 'proposed';
  const indexCount = geometry.index?.count ?? 0;

  useFrame(({ clock }) => {
    if (growFrom === undefined || !mesh.current) return;
    const t = Math.min(1, (clock.elapsedTime - growFrom) / GROW_SECONDS);
    const eased = 1 - Math.pow(1 - t, 3);
    // Reveal the tube from the parent outward by drawing a growing slice of its indices.
    mesh.current.geometry.setDrawRange(0, Math.floor((indexCount * eased) / 6) * 6);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        onSelect(branch.personId);
      }}
    >
      <meshStandardMaterial
        color={proposed ? palette.sprout : palette.bark}
        roughness={proposed ? 0.4 : 0.9}
        emissive={highlighted ? palette.glow : proposed ? palette.sprout : '#000000'}
        emissiveIntensity={highlighted ? 0.35 : proposed ? 0.25 : 0}
        transparent={proposed}
        opacity={proposed ? 0.85 : 1}
      />
    </mesh>
  );
}

/** Scales each ring of a unit-radius tube so it narrows from base to tip. */
function taper(
  tube: THREE.TubeGeometry,
  r0: number,
  r1: number,
  curve: THREE.Curve<THREE.Vector3>,
) {
  const pos = tube.attributes.position as THREE.BufferAttribute;
  const { tubularSegments, radialSegments } = tube.parameters;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    curve.getPointAt(u, center);
    const r = r0 + (r1 - r0) * u;
    for (let j = 0; j <= radialSegments; j++) {
      const k = i * (radialSegments + 1) + j;
      v.fromBufferAttribute(pos, k).sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  tube.computeVertexNormals();
}
