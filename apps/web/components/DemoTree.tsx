'use client';

import { LivingTree } from '@sulalah/tree-svg';
import {
  demoAncestors,
  demoFamily,
  demoSpouses,
  demoUnions,
  type LineagePerson,
} from '@sulalah/tree-engine';
import { useState } from 'react';
import { TreeExplorer } from './TreeExplorer';

const people = [...demoFamily, ...demoSpouses];
const SONS = ['فهد', 'محمد', 'سعود', 'عبدالرحمن', 'تميم', 'إبراهيم', 'حمد'];
const DAUGHTERS = ['جود', 'لمى', 'العنود', 'شهد', 'رهف', 'مها'];

/** The fictional family on the home page: the real engine, shown as a poster. Writes nothing. */
export function DemoPoster() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="absolute inset-0" aria-label="شجرة عائلة تجريبية">
      <LivingTree
        people={people}
        unions={demoUnions}
        rootId="mohammed"
        ancestors={demoAncestors}
        title="شجرة أسرة الراشد"
        selectedId={selected}
        onSelect={(id) => setSelected(id)}
      />
    </div>
  );
}

/** The full demo: pick anyone and grow the family. Additions stay in the page only. */
export function DemoExplorer({ topEnd }: { topEnd?: React.ReactNode }) {
  const [family, setFamily] = useState<LineagePerson[]>(people);
  const [n, setN] = useState(0);
  return (
    <TreeExplorer
      people={family}
      unions={demoUnions}
      rootId="mohammed"
      ancestors={demoAncestors}
      title="شجرة أسرة الراشد"
      topEnd={topEnd}
      onAdd={(father, gender) => {
        const names = gender === 'male' ? SONS : DAUGHTERS;
        setFamily((f) => [
          ...f,
          {
            id: `demo-${n}`,
            name: names[n % names.length]!,
            gender,
            fatherId: father.id,
            status: 'proposed',
          },
        ]);
        setN((x) => x + 1);
      }}
    />
  );
}
