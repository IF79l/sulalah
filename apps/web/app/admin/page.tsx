import type { Metadata } from 'next';
import { Admin } from './Admin';

export const metadata: Metadata = { title: 'إدارة المنصة | سُلالة', robots: { index: false } };

export default function Page() {
  return <Admin />;
}
