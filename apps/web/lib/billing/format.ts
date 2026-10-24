import type { BillingCycle, PlanOffer, SubscriptionStatus } from '@sulalah/domain';

/** "49 ر.س" or "49.50 ر.س", Latin digits like the rest of the app. */
export function riyals(halalas: number) {
  const whole = halalas % 100 === 0;
  return `${(halalas / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

const dayFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Riyadh',
});
const timeFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Riyadh',
});

export const day = (iso: string | null | undefined) => (iso ? dayFmt.format(new Date(iso)) : '');
export const dayTime = (iso: string) => timeFmt.format(new Date(iso));

export const cycleName: Record<BillingCycle, string> = { monthly: 'شهري', annual: 'سنوي' };
export const perCycle: Record<BillingCycle, string> = { monthly: 'شهريًا', annual: 'سنويًا' };

export const statusName: Record<SubscriptionStatus, string> = {
  pending: 'بانتظار الدفع',
  active: 'فعّال',
  past_due: 'متأخر الدفع',
  expired: 'منتهي',
  canceled: 'ملغى',
};

export const brandName = (b: string) =>
  ({ visa: 'فيزا', mastercard: 'ماستركارد', mada: 'مدى', amex: 'أمريكان إكسبريس' })[
    b.toLowerCase()
  ] ?? 'بطاقة';

/** How much the annual price saves against twelve months, in whole months, if any. */
export function annualSaving(o: PlanOffer) {
  const { monthly, annual } = o.prices;
  if (!monthly || !annual) return 0;
  return Math.floor((monthly * 12 - annual) / monthly);
}
