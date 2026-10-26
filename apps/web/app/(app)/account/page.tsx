import type { Metadata } from 'next';
import { backendOn } from '@/lib/backend';
import { Account } from './Account';
import { LiveAccount } from './LiveAccount';

export const metadata: Metadata = { title: 'حسابي | سُلالة', robots: { index: false } };

export default function Page() {
  return backendOn ? <LiveAccount /> : <Account />;
}
