'use client';

import { zatcaQr } from '@sulalah/domain';
import { Button, Icon, Logo } from '@sulalah/ui';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { billing } from '@/lib/billing/client';
import { cycleName, day, dayTime, riyals } from '@/lib/billing/format';
import type { InvoiceView } from '@/lib/billing/types';
import { planName } from '@/lib/demo-store';

/**
 * One invoice, ready to print. With a VAT number it is a simplified tax invoice: seller and
 * VAT number, time of issue, VAT at 15% and the total, and the ZATCA QR code that carries them.
 */
export function Invoice() {
  const { treeId, invoiceId } = useParams<{ treeId: string; invoiceId: string }>();
  const [inv, setInv] = useState<InvoiceView | null | undefined>(undefined);
  const [qr, setQr] = useState('');

  useEffect(() => {
    billing
      .invoice(treeId, invoiceId)
      .then(setInv)
      .catch(() => setInv(null));
  }, [treeId, invoiceId]);

  const taxed = !!inv && inv.vat > 0 && !!inv.seller.vatNumber;
  useEffect(() => {
    if (!inv || !taxed) return;
    const payload = zatcaQr({
      seller: inv.seller.name,
      vatNumber: inv.seller.vatNumber,
      issuedAt: new Date(inv.issuedAt),
      totalHalalas: inv.total,
      vatHalalas: inv.vat,
    });
    void QRCode.toString(payload, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(
      setQr,
    );
  }, [inv, taxed]);

  return (
    <AppShell
      need="billing.manage"
      title="الفاتورة"
      back={{ href: `/trees/${treeId}/plan`, label: 'الباقة' }}
      actions={
        inv ? (
          <Button variant="quiet" size="sm" className="rounded-xl" onClick={() => window.print()}>
            <Icon name="print" />
            اطبع أو احفظ PDF
          </Button>
        ) : null
      }
    >
      {inv === undefined ? (
        <p className="text-body text-muted">نفتح الفاتورة...</p>
      ) : inv === null ? (
        <p className="text-body text-danger">ما لقينا هذي الفاتورة.</p>
      ) : (
        <article className="mx-auto grid w-full max-w-3xl gap-8 rounded-3xl border border-line/40 bg-card p-6 shadow-sm md:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line/40 pb-6">
            <div className="grid gap-2">
              <Logo />
              <h2 className="text-h2 font-bold text-forest">
                {taxed ? 'فاتورة ضريبية مبسطة' : 'فاتورة'}
              </h2>
              <p className="text-caption text-muted">
                {taxed ? 'Simplified Tax Invoice' : 'Invoice'}
              </p>
            </div>
            {taxed && qr ? (
              <div
                className="size-28 [&_svg]:size-full"
                role="img"
                aria-label="رمز الفاتورة لهيئة الزكاة والضريبة والجمارك"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            ) : null}
          </header>

          <dl className="grid gap-x-8 gap-y-4 text-body sm:grid-cols-2">
            <Row label="رقم الفاتورة">
              <bdi dir="ltr" className="font-mono">
                {inv.number}
              </bdi>
            </Row>
            <Row label="تاريخ الإصدار">{dayTime(inv.issuedAt)}</Row>
            <Row label="البائع">{inv.seller.name}</Row>
            {inv.seller.vatNumber ? (
              <Row label="الرقم الضريبي">
                <bdi dir="ltr" className="tabular-nums">
                  {inv.seller.vatNumber}
                </bdi>
              </Row>
            ) : null}
            {inv.seller.crNumber ? (
              <Row label="السجل التجاري">
                <bdi dir="ltr" className="tabular-nums">
                  {inv.seller.crNumber}
                </bdi>
              </Row>
            ) : null}
            <Row label="العنوان">{inv.seller.address}</Row>
            <Row label="العميل">{inv.buyerName || 'مالك الشجرة'}</Row>
          </dl>

          <div className="overflow-x-auto rounded-2xl border border-line/40">
            <table className="w-full min-w-[30rem] text-body">
              <thead>
                <tr className="bg-surface-low text-caption text-muted">
                  <th className="px-4 py-3 text-start font-medium">البيان</th>
                  <th className="px-4 py-3 text-start font-medium">الكمية</th>
                  <th className="px-4 py-3 text-end font-medium">
                    {taxed ? 'المبلغ قبل الضريبة' : 'المبلغ'}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line/30">
                  <td className="px-4 py-4">
                    <span className="block font-semibold text-ink">
                      اشتراك سُلالة: باقة {inv.plan ? planName[inv.plan] : ''}
                      {inv.cycle ? `، ${cycleName[inv.cycle]}` : ''}
                    </span>
                    {inv.periodStart && inv.periodEnd ? (
                      <span className="text-caption text-muted">
                        من {day(inv.periodStart)} إلى {day(inv.periodEnd)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 tabular-nums">1</td>
                  <td className="px-4 py-4 text-end tabular-nums">{riyals(inv.net)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <dl className="grid gap-2 justify-self-end text-body sm:min-w-72">
            {taxed ? (
              <>
                <Total label="الإجمالي قبل الضريبة" value={riyals(inv.net)} />
                <Total
                  label={`ضريبة القيمة المضافة ${inv.vatRateBp / 100}%`}
                  value={riyals(inv.vat)}
                />
              </>
            ) : null}
            <div className="flex items-baseline justify-between gap-6 border-t border-line/40 pt-3">
              <dt className="text-title font-bold text-forest">
                {taxed ? 'الإجمالي شامل الضريبة' : 'الإجمالي'}
              </dt>
              <dd className="text-h2 font-bold tabular-nums text-forest">{riyals(inv.total)}</dd>
            </div>
            <p className="text-caption text-muted">مدفوعة بالبطاقة</p>
          </dl>

          {!taxed ? (
            <p className="rounded-xl bg-surface-low p-3 text-caption text-ink-soft">
              المنشأة غير مسجلة في ضريبة القيمة المضافة حاليًا، فلا تُحسب ضريبة على هذه الفاتورة.
            </p>
          ) : null}
        </article>
      )}
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 text-ink-soft">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
