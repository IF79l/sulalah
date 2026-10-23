import type { Metadata } from 'next';
import { Contributions } from './Contributions';

export const metadata: Metadata = { title: 'مساهماتي | سُلالة', robots: { index: false } };

export default function ContributionsPage() {
  return <Contributions />;
}
