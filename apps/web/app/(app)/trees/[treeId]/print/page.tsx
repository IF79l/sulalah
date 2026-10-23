import type { Metadata } from 'next';
import { Print } from './Print';

export const metadata: Metadata = { title: 'اطبع الشجرة | سُلالة', robots: { index: false } };

export default function Page() {
  return <Print />;
}
