import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { backendOn } from '@/lib/backend';
import { openViewCopy } from '@/server/trees/view';
import { VisitorView } from './VisitorView';

export const metadata: Metadata = { title: 'شجرة عائلة | سُلالة', robots: { index: false } };
export const dynamic = 'force-dynamic';

// A view link: the tree read-only, without an account. The sample family's visitor view is
// /trees/al-sahli?as=visitor; this page is for real trees only. The server opens the copy
// and sends the filtered tree; the visitor's browser never gets a key.
export default async function ViewPage({ params }: { params: Promise<{ token: string }> }) {
  if (!backendOn) notFound();
  const { token } = await params;
  let state: Parameters<typeof VisitorView>[0]['state'];
  try {
    state = await openViewCopy(token);
  } catch (e) {
    console.error('opening a view link failed', e);
    state = { problem: 'failed' };
  }
  return <VisitorView state={state} />;
}
