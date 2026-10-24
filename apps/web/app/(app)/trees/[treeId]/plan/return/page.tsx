import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentReturn } from './PaymentReturn';

export const metadata: Metadata = { title: 'تأكيد الدفع | سُلالة', robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  );
}
