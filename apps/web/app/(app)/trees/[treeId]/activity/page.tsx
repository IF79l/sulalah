import type { Metadata } from 'next';
import { Activity } from './Activity';

export const metadata: Metadata = { title: 'سجل النشاط | سُلالة', robots: { index: false } };

export default function Page() {
  return <Activity />;
}
