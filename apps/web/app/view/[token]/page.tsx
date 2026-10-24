import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { backendOn } from '@/lib/backend';
import { VisitorView } from './VisitorView';

export const metadata: Metadata = { title: 'شجرة عائلة | سُلالة', robots: { index: false } };

// A view link: the tree read-only, without an account. The sample family's visitor view is
// /trees/al-sahli?as=visitor; this page is for real trees only.
export default async function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  if (!backendOn) notFound();
  const { token } = await params;
  return <VisitorView token={token} />;
}
