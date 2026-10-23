import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NoAccess } from '@/components/States';
import { TreeScreen, type TreeMode } from '@/components/tree/TreeScreen';

export const metadata: Metadata = { title: 'الشجرة | سُلالة', robots: { index: false } };

const modes: TreeMode[] = ['owner', 'contribute', 'visitor', 'reviewer'];

// Until trees are stored, every tree opens the sample family; `?as=` switches the demo's role.
export default async function TreePage({
  params,
  searchParams,
}: {
  params: Promise<{ treeId: string }>;
  searchParams: Promise<{ as?: string; review?: string; focus?: string }>;
}) {
  const { treeId } = await params;
  if (treeId === 'private') return <NoAccess />;
  if (treeId !== 'al-sahli' && treeId !== 'bani-khalid') notFound();
  const { as, review, focus } = await searchParams;
  const mode = modes.includes(as as TreeMode) ? (as as TreeMode) : undefined;
  return (
    <main className="h-dvh overflow-hidden">
      <TreeScreen
        key={`${mode ?? ''}-${review ?? ''}-${focus ?? ''}`}
        as={mode}
        reviewId={review}
        focusId={focus}
      />
    </main>
  );
}
