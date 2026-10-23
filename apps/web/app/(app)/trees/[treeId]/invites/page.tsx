import type { Metadata } from 'next';
import { Invites } from './Invites';

export const metadata: Metadata = { title: 'روابط الدعوة | سُلالة', robots: { index: false } };

export default function Page() {
  return <Invites />;
}
