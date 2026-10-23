import type { Metadata } from 'next';
import { Plan } from './Plan';

export const metadata: Metadata = { title: 'الباقة | سُلالة', robots: { index: false } };

export default function Page() {
  return <Plan />;
}
