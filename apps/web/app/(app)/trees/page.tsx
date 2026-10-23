import type { Metadata } from 'next';
import { MyTrees } from './MyTrees';

export const metadata: Metadata = { title: 'أشجاري | سُلالة' };

export default function MyTreesPage() {
  return <MyTrees />;
}
