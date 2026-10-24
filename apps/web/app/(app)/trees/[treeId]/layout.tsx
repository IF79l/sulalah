import type { ReactNode } from 'react';
import { LiveTreeGate, SampleTreeGate } from '@/components/tree/LiveTreeGate';
import { backendOn, isLiveTreeId } from '@/lib/backend';

/** Every page of a tree works on the same open tree: a real one from its file, or the sample. */
export default async function TreeLayout({
  params,
  children,
}: {
  params: Promise<{ treeId: string }>;
  children: ReactNode;
}) {
  const { treeId } = await params;
  if (backendOn && isLiveTreeId(treeId))
    return (
      <LiveTreeGate key={treeId} treeId={treeId}>
        {children}
      </LiveTreeGate>
    );
  return <SampleTreeGate>{children}</SampleTreeGate>;
}
