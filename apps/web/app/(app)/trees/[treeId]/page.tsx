import type { Metadata } from 'next';
import { DemoExplorer } from '@/components/DemoTree';

export const metadata: Metadata = { title: 'الشجرة | سُلالة', robots: { index: false } };

// Until trees are stored (batch 2), every tree opens the demo family.
export default function TreePage() {
  return (
    <main className="h-dvh overflow-hidden">
      <DemoExplorer back={{ href: '/trees', label: 'أشجاري' }} />
    </main>
  );
}
