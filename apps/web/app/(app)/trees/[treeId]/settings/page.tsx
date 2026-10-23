import type { Metadata } from 'next';
import { TreeSettings } from './TreeSettings';

export const metadata: Metadata = { title: 'إعدادات الشجرة | سُلالة', robots: { index: false } };

export default function Page() {
  return <TreeSettings />;
}
