'use client';

import { Icon, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sapling } from '@/components/Botanical';
import { AppShell } from '@/components/AppShell';
import { billing } from '@/lib/billing/client';
import { day, riyals } from '@/lib/billing/format';
import type { CheckoutView } from '@/lib/billing/types';
import { planName } from '@/lib/demo-store';

/**
 * Where the card form and 3-D Secure come back to. It only reads: the plan turns on when the
 * payment webhook has settled the checkout, and this page waits for that.
 */
export function PaymentReturn() {
  const { treeId } = useParams<{ treeId: string }>();
  const id = useSearchParams().get('checkout') ?? '';
  const [c, setC] = useState<CheckoutView | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const look = async () => {
      const got = await billing.checkout(treeId, id).catch(() => null);
      setC(got);
      if (got && got.status !== 'open') return;
      if (++tries > 20) return setGaveUp(true);
      timer = setTimeout(look, 1500);
    };
    void look();
    return () => clearTimeout(timer);
  }, [treeId, id]);

  const paid = c?.status === 'paid';
  const failed = c?.status === 'failed' || c?.status === 'expired';

  return (
    <AppShell need="billing.manage" title="تأكيد الدفع">
      <div className="mx-auto grid max-w-lg justify-items-center gap-4 rounded-3xl border border-line/40 bg-card px-6 py-12 text-center">
        {paid ? (
          <>
            <Sapling className="h-28 w-36" />
            <h2 className="text-h2 font-bold text-forest">تفعّلت باقة {planName[c.plan]}</h2>
            <p className="text-body-lg leading-relaxed text-ink-soft">
              وصلنا {riyals(c.amount)}، وشجرتك الآن على باقتها الجديدة حتى {day(c.periodEnd)}.
              الفاتورة في صفحة الباقة.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={`/trees/${treeId}`} className={cn(buttonClass('primary'), 'rounded-xl')}>
                افتح الشجرة
              </Link>
              <Link
                href={`/trees/${treeId}/plan`}
                className={cn(buttonClass('quiet'), 'rounded-xl')}
              >
                الباقة والفواتير
              </Link>
            </div>
          </>
        ) : failed ? (
          <>
            <span className="flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Icon name="credit_card_off" className="text-[2rem]" />
            </span>
            <h2 className="text-h2 font-bold text-forest">ما تم الدفع</h2>
            <p className="text-body-lg text-ink-soft">
              {c.failureReason ?? 'رفض البنك العملية'}. ما انخصم منك شي، وباقتك كما هي.
            </p>
            <Link
              href={`/trees/${treeId}/plan/checkout?plan=${c.plan}&cycle=${c.cycle}`}
              className={cn(buttonClass('primary'), 'rounded-xl')}
            >
              جرّب مرة ثانية
            </Link>
          </>
        ) : (
          <>
            <span className="flex size-16 animate-pulse items-center justify-center rounded-full bg-olive-soft/50 text-olive">
              <Icon name="hourglass_top" className="text-[2rem]" />
            </span>
            <h2 className="text-h2 font-bold text-forest">ننتظر تأكيد البنك</h2>
            <p className="text-body-lg text-ink-soft">
              {gaveUp
                ? 'التأكيد يتأخر أحيانًا دقائق. تقدر تقفل الصفحة، وتتفعّل الباقة لحالها لما يوصل، ويجيك إشعار.'
                : 'ثواني وتتفعّل باقتك.'}
            </p>
            <Link href={`/trees/${treeId}/plan`} className={cn(buttonClass('ghost'), 'rounded-xl')}>
              رجوع للباقة
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
