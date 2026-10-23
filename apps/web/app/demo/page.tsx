import { buttonClass } from '@sulalah/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoExplorer } from '@/components/DemoTree';

export const metadata: Metadata = { title: 'جرّب الشجرة | سُلالة' };

export default function DemoPage() {
  return (
    <main className="h-dvh overflow-hidden">
      <DemoExplorer
        back={{ href: '/', label: 'الرئيسية' }}
        notice="عائلة خيالية للتجربة. إضافاتك لا تُحفظ."
        headerEnd={
          <Link href="/trees/new" className={buttonClass('primary', 'sm')}>
            ابدأ شجرة عائلتك
          </Link>
        }
      />
    </main>
  );
}
