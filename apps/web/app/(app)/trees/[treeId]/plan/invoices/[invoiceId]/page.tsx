import type { Metadata } from 'next';
import { Invoice } from './Invoice';

export const metadata: Metadata = { title: 'فاتورة | سُلالة', robots: { index: false } };

export default function Page() {
  return <Invoice />;
}
