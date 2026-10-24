import type { Metadata } from 'next';
import { backendOn } from '@/lib/backend';
import { InviteLanding, LiveInvite } from './InviteLanding';

export const metadata: Metadata = { title: 'دعوة للمساهمة | سُلالة', robots: { index: false } };

// On the demo build, sample tokens show the error states: /invite/expired, /invite/used-up,
// /invite/full. With accounts on, the token is looked up for real.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (backendOn) return <LiveInvite token={token} />;
  const state = token === 'expired' || token === 'used-up' || token === 'full' ? token : 'ok';
  return <InviteLanding state={state} />;
}
