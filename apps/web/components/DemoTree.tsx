'use client';

import { demoFamily } from '@sulalah/tree-engine';
import dynamic from 'next/dynamic';

// WebGL only runs in the browser; the server renders the page shell instantly.
const LivingTree = dynamic(() => import('@sulalah/tree-3d').then((m) => m.LivingTree), {
  ssr: false,
});

/** Fictional demo family on the same engine as the real editor. Writes nothing. */
export function DemoTree() {
  return (
    <div className="absolute inset-0" aria-label="شجرة عائلة تجريبية تفاعلية">
      <LivingTree people={demoFamily} rootId="mohammed" fontUrl="/fonts/plex-arabic-500.woff" />
    </div>
  );
}
