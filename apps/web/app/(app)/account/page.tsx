import type { Metadata } from 'next';
import { Account } from './Account';

export const metadata: Metadata = { title: 'حسابي | سُلالة', robots: { index: false } };

export default function Page() {
  return <Account />;
}
