import React, { useState } from 'react';
import { Subscription, SubscriptionPlan, FamilyTree } from '../../types';
import { 
  CreditCard, 
  Check, 
  Download, 
  FileText,
  CheckCircle2,
  X
} from 'lucide-react';
import { formatArabicDate } from '../../lib/arabic-utils';

interface BillingViewProps {
  tree: FamilyTree;
  subscription: Subscription;
  plans: SubscriptionPlan[];
  onUpgradePlan: (newPlanId: 'family' | 'extended' | 'tribe', cycle: 'monthly' | 'annual') => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  tree,
  subscription,
  plans,
  onUpgradePlan
}) => {
  const currentPlan = plans.find(p => p.id === subscription.planId) || plans[1];
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>(subscription.billingCycle);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 text-right text-[#202B26] space-y-8 animate-in fade-in duration-300">
      
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C6D3B] font-semibold mb-1.5">
            <CreditCard className="w-4 h-4 text-[#B59A6B]" />
            <span>الاشتراك والحفظ السحابي</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            إدارة اشتراك شجرة العائلة
          </h2>
          <p className="text-xs text-[#687C58] mt-1 max-w-xl leading-relaxed">
            الاشتراك يغطي كافة أفراد الشجرة ويشمل الحفظ السحابي الموثوق وإمكانات التدقيق الجماعي.
          </p>
        </div>

        <div className="bg-[#F8F5EE] px-4 py-3 rounded-2xl border border-[#E8DCC8] text-xs">
          <span className="text-[#687C58] block mb-0.5">الحالة الحالية:</span>
          <span className="font-bold text-[#16382F] text-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>نشط ومفعل حتى 2027 م</span>
          </span>
        </div>
      </div>

      {/* Current Active Plan Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-1">
          <span className="text-xs text-[#687C58]">الباقة الحالية:</span>
          <h3 className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            باقة {currentPlan.nameAr}
          </h3>
          <p className="text-xs text-[#687C58]">{currentPlan.descriptionAr}</p>
        </div>

        <div className="space-y-1 border-r md:border-r-0 md:border-x border-[#E8DCC8] md:px-6">
          <span className="text-xs text-[#687C58]">السعر المعتمد:</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            {subscription.amountPaidSAR.toLocaleString('ar-SA')} <span className="text-sm font-normal text-[#687C58]">ر.س</span>
          </div>
          <span className="text-[11px] text-[#8C6D3B] block font-medium">
            دورية السداد: {subscription.billingCycle === 'annual' ? 'سنوي (مع خصم 25%)' : 'شهري'}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#4A5D53]">
            <span>حد أفراد الشجرة:</span>
            <span className="font-bold text-[#16382F]">{currentPlan.maxPeople} فرد</span>
          </div>
          <div className="flex items-center justify-between text-[#4A5D53]">
            <span>مقاعد المدققين:</span>
            <span className="font-bold text-[#16382F]">{currentPlan.maxReviewers} مدقق</span>
          </div>
          <div className="flex items-center justify-between text-[#4A5D53]">
            <span>وسيلة السداد:</span>
            <span className="font-bold text-[#16382F]">بطاقة مدى (Saudi Mada)</span>
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DCC8]">
          <div>
            <h3 className="text-lg font-bold text-[#16382F]">ترقية باقة الشجرة</h3>
            <p className="text-xs text-[#687C58]">اختر باقة أعلى لزيادة عدد أفراد الشجرة أو مقاعد المدققين المعتمدين.</p>
          </div>

          <div className="bg-[#F8F5EE] p-1 rounded-full border border-[#E8DCC8] flex items-center text-xs">
            <button
              onClick={() => setSelectedCycle('annual')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                selectedCycle === 'annual' ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm' : 'text-[#687C58]'
              }`}
            >
              سنوي (خصم 25%)
            </button>
            <button
              onClick={() => setSelectedCycle('monthly')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                selectedCycle === 'monthly' ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm' : 'text-[#687C58]'
              }`}
            >
              شهري
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => {
            const isCurrent = p.id === currentPlan.id;
            const pPrice = selectedCycle === 'annual' ? p.priceAnnualSAR : p.priceMonthlySAR;

            return (
              <div
                key={p.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#F8F5EE] border-[#16382F] shadow-sm'
                    : 'bg-white border-[#E8DCC8] hover:border-[#B59A6B]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-base font-['Alexandria'] text-[#16382F]">{p.nameAr}</h4>
                    {isCurrent && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#16382F] text-[#F8F5EE] font-semibold">
                        باقتك الحالية
                      </span>
                    )}
                  </div>

                  <div className="my-3">
                    <span className="text-3xl font-bold font-['Alexandria'] text-[#16382F]">
                      {pPrice.toLocaleString('ar-SA')}
                    </span>
                    <span className="text-xs text-[#687C58] mr-1">ر.س / {selectedCycle === 'annual' ? 'سنة' : 'شهر'}</span>
                  </div>

                  <div className="space-y-2 text-xs text-[#4A5D53] pt-2">
                    <div className="font-semibold text-[#16382F] mb-1">المزايا:</div>
                    {p.featuresAr.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#B59A6B] shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isCurrent}
                  onClick={() => onUpgradePlan(p.id, selectedCycle)}
                  className={`mt-6 w-full py-2.5 rounded-full text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-transparent text-[#687C58] border border-[#E8DCC8] cursor-default'
                      : 'bg-[#16382F] hover:bg-[#20493E] text-white shadow-sm'
                  }`}
                >
                  {isCurrent ? 'الباقة المفعلة حالياً' : `الترقية لباقة ${p.nameAr}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Receipts History */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-4">
        <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#B59A6B]" />
          <span>سجل الفواتير وسندات السداد:</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-[#E8DCC8] text-[#687C58]">
                <th className="pb-3 font-medium">رقم السند المرجعي</th>
                <th className="pb-3 font-medium">الباقة</th>
                <th className="pb-3 font-medium">المبلغ</th>
                <th className="pb-3 font-medium">وسيلة السداد</th>
                <th className="pb-3 font-medium">التاريخ</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">السند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCC8]">
              <tr>
                <td className="py-3.5 font-mono font-bold text-[#16382F]">{subscription.paymentReference}</td>
                <td className="py-3.5">باقة {currentPlan.nameAr} ({subscription.billingCycle === 'annual' ? 'سنوي' : 'شهري'})</td>
                <td className="py-3.5 font-bold text-[#16382F]">{subscription.amountPaidSAR.toLocaleString('ar-SA')} ر.س</td>
                <td className="py-3.5">مدى (Saudi Mada)</td>
                <td className="py-3.5">{formatArabicDate(subscription.startDate)}</td>
                <td className="py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                    مسدد وموثق
                  </span>
                </td>
                <td className="py-3.5">
                  <button 
                    onClick={() => setShowReceiptModal(true)}
                    className="text-[#8C6D3B] hover:text-[#16382F] flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>عرض السند</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Clean In-App Receipt Modal (instead of window.alert) */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-[#16382F]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E8DCC8] rounded-3xl shadow-[0_20px_50px_rgba(22,56,47,0.15)] p-6 text-[#202B26] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#B59A6B]" />
                <h3 className="text-base font-bold text-[#16382F]">سند سداد إلكتروني معتمد</h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F8F5EE] flex items-center justify-center text-[#687C58] hover:text-[#16382F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F8F5EE] p-5 rounded-2xl border border-[#E8DCC8] space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#687C58]">المنصة:</span>
                <span className="font-bold text-[#16382F]">منصة أغصان للأنساب الرقمية</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687C58]">اسم الشجرة:</span>
                <span className="font-bold text-[#16382F]">{tree.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687C58]">رقم السند المرجعي:</span>
                <span className="font-mono font-bold text-[#16382F]">{subscription.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687C58]">الباقة المشتركة:</span>
                <span className="font-bold text-[#16382F]">باقة {currentPlan.nameAr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687C58]">المبلغ المدفوع:</span>
                <span className="font-bold text-[#16382F]">{subscription.amountPaidSAR.toLocaleString('ar-SA')} ر.س شامل الضريبة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687C58]">طريقة الدفع:</span>
                <span className="font-bold text-[#16382F]">مدى (Mada Sandbox Gateway)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687C58]">حالة العملية:</span>
                <span className="font-bold text-emerald-700">مكتملة وموثقة سحابياً</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-6 py-2.5 rounded-full bg-[#16382F] hover:bg-[#20493E] text-white font-medium text-xs shadow-sm transition-all"
              >
                إغلاق السند
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
