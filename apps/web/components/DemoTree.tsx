'use client';

import { LivingTree } from '@sulalah/tree-svg';
import { demoFamily, demoSpouses, demoUnions } from '@sulalah/tree-engine';
import { useState } from 'react';

const people = [...demoFamily, ...demoSpouses];

/** Fictional demo family on the same engine as the real editor. Writes nothing. */
export function DemoTree() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="absolute inset-0" aria-label="شجرة عائلة تجريبية تفاعلية">
      <LivingTree
        people={people}
        unions={demoUnions}
        rootId="mohammed"
        selectedId={selected}
        onSelect={(id) => setSelected(id)}
      />
    </div>
  );
}
