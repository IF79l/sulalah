import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Checkout } from './Checkout';

export const metadata: Metadata = { title: 'الدفع | سُلالة', robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
