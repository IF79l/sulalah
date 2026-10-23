import type { Metadata } from 'next';
import { InviteLanding } from './InviteLanding';

export const metadata: Metadata = { title: 'دعوة للمساهمة | سُلالة', robots: { index: false } };

// Sample tokens show the error states: /invite/expired, /invite/used-up, /invite/full.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = token === 'expired' || token === 'used-up' || token === 'full' ? token : 'ok';
  return <InviteLanding state={state} />;
}
