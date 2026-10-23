import type { Metadata } from 'next';
import { ReviewQueue } from './ReviewQueue';

export const metadata: Metadata = { title: 'الإضافات الواردة | سُلالة', robots: { index: false } };

export default function Page() {
  return <ReviewQueue />;
}
