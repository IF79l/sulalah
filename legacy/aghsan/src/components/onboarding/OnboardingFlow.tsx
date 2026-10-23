import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { SubscriptionPlan, FamilyTree, Person, Subscription, Gender } from '../../types';
import { 
  TreePine, 
  Sparkles, 
  Check, 
  CreditCard, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Lock,
  Layers,
  Award
} from 'lucide-react';
import { formatArabicCurrency } from '../../lib/arabic-utils';

interface OnboardingFlowProps {
  plans: SubscriptionPlan[];
  initialPlanId?: 'family' | 'extended' | 'tribe';
  initialCycle?: 'monthly' | 'annual';
  onComplete: (data: {
    tree: Partial<FamilyTree>;
    rootPerson: Partial<Person>;
    subscription: Partial<Subscription>;
  }) => void;
  onCancel: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  plans,
  initialPlanId = 'extended',
  initialCycle = 'annual',
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<number>(1);

  // Selected Plan
  const [selectedPlanId, setSelectedPlanId] = useState<'family' | 'extended' | 'tribe'>(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(initialCycle);

  // Tree Details
  const [treeName, setTreeName] = useState('شجرة عائلة آل محمد');
  const [treeDescription, setTreeDescription] = useState('توثيق مبارك لأنساب وفروع وأبناء العائلة الكريمة.');
  const [rootName, setRootName] = useState('محمد بن عبدالله آل محمد');
  const [rootBirthYear, setRootBirthYear] = useState('1920');
  const [rootBio, setRootBio] = useState('الجد المؤسس للأسرة، عُرف بالشهامة والكرم وحسن السيرة.');

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'visa' | 'apple_pay' | 'sandbox'>('mada');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardHolder, setCardHolder] = useState('عبد العزيز بن محمد');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[1];
  const price = billingCycle === 'annual' ? selectedPlan.priceAnnualSAR : selectedPlan.priceMonthlySAR;

  const handleNextFromTreeInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeName.trim() || !rootName.trim()) return;
    setStep(3); // Proceed to Payment
  };

  const handleProcessPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentDone(true);
      setStep(4); // Success

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        console.log(err);
      }
    }, 1200);
  };

  const handleFinish = () => {
    const treeId = `tree-${Date.now()}`;
    const rootId = `root-${Date.now()}`;

    onComplete({
      tree: {
        id: treeId,
        name: treeName.trim(),
        description: treeDescription.trim() || undefined,
        rootAncestorId: rootId,
        subscriptionPlanId: selectedPlanId,
        isPrivate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      rootPerson: {
        id: rootId,
        treeId,
        fullName: rootName.trim(),
        shortName: rootName.trim().split(' ').slice(0, 2).join(' '),
        gender: 'male' as Gender,
        generation: 1,
        birthYear: rootBirthYear ? parseInt(rootBirthYear) : undefined,
        biography: rootBio.trim() || undefined,
        isApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      subscription: {
        id: `sub-${Date.now()}`,
        treeId,
        planId: selectedPlanId,
        billingCycle,
        status: 'active',
        amountPaidSAR: price,
        paymentMethod,
        paymentReference: `MOY-SA-${Math.floor(100000 + Math.random() * 900000)}`,
        startDate: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        autoRenew: true
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 text-right text-[#1C2923]">
      
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-3 mb-10">
        {[
          { num: 1, label: 'اختيار الباقة' },
          { num: 2, label: 'معلومات الشجرة' },
          { num: 3, label: 'السداد والاشتراك' },
          { num: 4, label: 'اكتمال البناء' }
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= s.num
                ? 'bg-[#102B24] text-[#C9A66B] ring-2 ring-[#C9A66B]'
                : 'bg-[#EAE6DC] text-[#8BA58B]'
            }`}>
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-xs font-bold hidden sm:inline ${step >= s.num ? 'text-[#102B24]' : 'text-[#8BA58B]'}`}>
              {s.label}
            </span>
            {s.num < 4 && <div className="w-6 h-0.5 bg-[#EAE6DC]" />}
          </div>
        ))}
      </div>

      {/* STEP 1: SELECT PACKAGE */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#C9A66B] uppercase tracking-wider block">
              الخطوة الأولى
            </span>
            <h2 className="text-3xl font-extrabold font-['Alexandria'] text-[#102B24]">
              اختر الباقة المناسبة لعائلتك
            </h2>
            <p className="text-sm text-[#244B3D]/80">
              حدد حجم الشجرة المتوقع وعدد المدققين المساعدين. يمكنك الترقية في أي وقت.
            </p>

            {/* Cycle Toggle */}
            <div className="pt-2 flex justify-center">
              <div className="bg-[#EAE6DC] p-1.5 rounded-2xl flex items-center border border-[#244B3D]/20">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    billingCycle === 'annual' ? 'bg-[#102B24] text-[#C9A66B]' : 'text-[#244B3D]'
                  }`}
                >
                  سنوي (وفر 25%)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    billingCycle === 'monthly' ? 'bg-[#102B24] text-[#C9A66B]' : 'text-[#244B3D]'
                  }`}
                >
                  شهري
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(p => {
              const isSelected = selectedPlanId === p.id;
              const pPrice = billingCycle === 'annual' ? p.priceAnnualSAR : p.priceMonthlySAR;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#102B24] text-[#F7F5EF] border-[#C9A66B] shadow-2xl scale-[1.03]'
                      : 'bg-white text-[#1C2923] border-[#EAE6DC] hover:border-[#C9A66B]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold font-['Alexandria']">{p.nameAr}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                        isSelected ? 'bg-[#244B3D] text-[#C9A66B]' : 'bg-[#EAE6DC] text-[#244B3D]'
                      }`}>
                        حتى {p.maxPeople} فرد
                      </span>
                    </div>

                    <div className="my-4">
                      <span className="text-3xl font-extrabold font-['Alexandria']">
                        {pPrice.toLocaleString('ar-SA')}
                      </span>
                      <span className="text-xs text-[#8BA58B] mr-1">ر.س / {billingCycle === 'annual' ? 'سنة' : 'شهر'}</span>
                    </div>

                    <div className="space-y-2 text-xs text-[#8BA58B]">
                      {p.featuresAr.slice(0, 4).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#C9A66B]" />
                          <span className={isSelected ? 'text-[#EAE6DC]' : 'text-[#1C2923]'}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#C9A66B] text-[#102B24]'
                        : 'bg-[#F7F5EF] text-[#102B24]'
                    }`}
                  >
                    {isSelected ? 'الباقة المختارة ✓' : 'اختيار هذه الباقة'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={onCancel}
              className="text-xs text-[#8BA58B] hover:text-[#102B24]"
            >
              إلغاء والعودة
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-8 py-3.5 rounded-2xl bg-[#102B24] hover:bg-[#244B3D] text-[#F7F5EF] font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <span>متابعة إدخال بيانات الشجرة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TREE & ROOT ANCESTOR DETAILS */}
      {step === 2 && (
        <form onSubmit={handleNextFromTreeInfo} className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE6DC] shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <span className="text-xs font-bold text-[#C9A66B] uppercase tracking-wider block">
              الخطوة الثانية
            </span>
            <h2 className="text-2xl font-bold font-['Alexandria'] text-[#102B24] mt-1">
              معلومات شجرة العائلة والجد الأساسي
            </h2>
            <p className="text-xs text-[#8BA58B] mt-1">
              ستكون أنت تلقائياً مالك هذه الشجرة والمدقق الرئيسي المعتمد لكافة إضافاتها.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#102B24] block mb-1">اسم الشجرة (مطلوب):</label>
              <input
                type="text"
                placeholder="مثال: شجرة عائلة آل محمد بن عبدالله"
                value={treeName}
                onChange={(e) => setTreeName(e.target.value)}
                className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl px-4 py-2.5 text-xs text-[#1C2923] font-bold focus:border-[#C9A66B] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#102B24] block mb-1">وصف الشجرة أو نبذة عنها:</label>
              <textarea
                rows={2}
                placeholder="اكتب نبذة مختصرة عن العائلة وأصلها ومقرها..."
                value={treeDescription}
                onChange={(e) => setTreeDescription(e.target.value)}
                className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl p-3 text-xs text-[#1C2923] focus:border-[#C9A66B] focus:outline-none resize-none"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE6DC]">
              <h3 className="text-sm font-bold text-[#102B24] mb-3 flex items-center gap-2">
                <TreePine className="w-4 h-4 text-[#C9A66B]" />
                <span>الجد الأساسي الأول (أعلى الشجرة):</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#244B3D] block mb-1">اسم الجد الأساسي الكامل (مطلوب):</label>
                  <input
                    type="text"
                    placeholder="مثال: محمد بن عبدالله بن إبراهيم"
                    value={rootName}
                    onChange={(e) => setRootName(e.target.value)}
                    className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl px-4 py-2.5 text-xs text-[#1C2923] font-bold focus:border-[#C9A66B] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#244B3D] block mb-1">سنة ميلاد الجد تقريباً (اختياري):</label>
                  <input
                    type="number"
                    placeholder="مثال: 1910"
                    value={rootBirthYear}
                    onChange={(e) => setRootBirthYear(e.target.value)}
                    className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl px-4 py-2.5 text-xs text-[#1C2923] focus:border-[#C9A66B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs text-[#244B3D] block mb-1">نبذة عن الجد الأساسي:</label>
                <textarea
                  rows={2}
                  placeholder="مآثره، مكان إقامته، سيرة مختصرة..."
                  value={rootBio}
                  onChange={(e) => setRootBio(e.target.value)}
                  className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl p-3 text-xs text-[#1C2923] focus:border-[#C9A66B] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#EAE6DC]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-[#8BA58B] hover:text-[#102B24]"
            >
              السابق (الباقات)
            </button>
            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-[#102B24] hover:bg-[#244B3D] text-[#F7F5EF] font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <span>متابعة إلى خطوة السداد</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SAUDI PAYMENT GATEWAY CHECKOUT */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EAE6DC] shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <span className="text-xs font-bold text-[#C9A66B] uppercase tracking-wider block">
              الخطوة الثالثة
            </span>
            <h2 className="text-2xl font-bold font-['Alexandria'] text-[#102B24] mt-1">
              تأكيد وسداد الاشتراك
            </h2>
            <p className="text-xs text-[#8BA58B] mt-1">
              بوابة دفع آمنة متوافقة مع أنظمة الدفع السعودية (مدى، فيزا، أبل باي).
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-[#102B24] p-5 rounded-2xl text-[#F7F5EF] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#8BA58B]">تفاصيل الاشتراك:</span>
              <div className="font-bold text-base text-white">باقة {selectedPlan.nameAr} ({billingCycle === 'annual' ? 'سنوي' : 'شهري'})</div>
              <div className="text-xs text-[#C9A66B]">حتى {selectedPlan.maxPeople} فرد • {selectedPlan.maxReviewers} مدققين</div>
            </div>

            <div className="text-left">
              <span className="text-xs text-[#8BA58B]">المبلغ الإجمالي:</span>
              <div className="text-2xl font-extrabold font-['Alexandria'] text-[#C9A66B]">
                {price.toLocaleString('ar-SA')} ر.س
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-[#102B24] block mb-2">اختر وسيلة الدفع:</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('mada')}
                className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'mada'
                    ? 'bg-[#102B24] text-[#C9A66B] border-[#C9A66B] shadow-md'
                    : 'bg-[#F7F5EF] text-[#244B3D] border-[#EAE6DC]'
                }`}
              >
                بطاقة مدى (Mada)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('visa')}
                className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'visa'
                    ? 'bg-[#102B24] text-[#C9A66B] border-[#C9A66B] shadow-md'
                    : 'bg-[#F7F5EF] text-[#244B3D] border-[#EAE6DC]'
                }`}
              >
                فيزا / ماستركارد
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'apple_pay'
                    ? 'bg-[#102B24] text-[#C9A66B] border-[#C9A66B] shadow-md'
                    : 'bg-[#F7F5EF] text-[#244B3D] border-[#EAE6DC]'
                }`}
              >
                Apple Pay
              </button>
            </div>
          </div>

          {/* Development Sandbox Card info */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <Award className="w-4 h-4 text-[#C9A66B]" />
              <span>بيئة الدفع السحابية التجريبية (Sandbox Mode):</span>
            </div>
            <p>
              يتم تنفيذ عملية الدفع في بيئة التطوير والتحقق الآمنة. سيتم تفعيل شجرتك فوراً وتوليد إيصال مرجعي معتمد.
            </p>
          </div>

          {/* Card Form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#244B3D] block mb-1">رقم البطاقة:</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl px-4 py-2 text-xs font-mono text-[#1C2923] focus:border-[#C9A66B] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#244B3D] block mb-1">تاريخ الانتهاء:</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl px-4 py-2 text-xs font-mono text-[#1C2923] focus:border-[#C9A66B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#244B3D] block mb-1">رمز التحقق (CVV):</label>
                <input
                  type="text"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="w-full bg-[#F7F5EF] border border-[#EAE6DC] rounded-xl px-4 py-2 text-xs font-mono text-[#1C2923] focus:border-[#C9A66B] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#EAE6DC]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-bold text-[#8BA58B] hover:text-[#102B24]"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleProcessPayment}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#C9A66B] to-[#b89355] text-[#102B24] font-bold text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
            >
              {isProcessing ? (
                <span>جارٍ معالجة السداد وتوثيق الشجرة...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#102B24]" />
                  <span>تأكيد السداد وتفعيل الشجرة ({price.toLocaleString('ar-SA')} ر.س)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS CELEBRATION */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-[#EAE6DC] shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <span className="text-xs font-bold text-[#C9A66B] uppercase tracking-wider block">
            مبارك التأسيس!
          </span>

          <h2 className="text-3xl font-extrabold font-['Alexandria'] text-[#102B24]">
            تم إنشاء شجرة {treeName} بنجاح
          </h2>

          <p className="text-sm text-[#244B3D]/80 max-w-lg mx-auto leading-relaxed">
            تم تسجيلك تلقائياً كـ <span className="font-bold text-[#102B24]">مالك الشجرة والمدقق الرئيسي</span>. 
            شجرتكم الآن جاهزة لإضافة الأغصان ومشاركتها مع أفراد العائلة لبدء توثيق الأنساب معاً.
          </p>

          <div className="bg-[#102B24] p-5 rounded-2xl max-w-md mx-auto text-[#F7F5EF] text-xs space-y-2">
            <div className="flex justify-between border-b border-[#244B3D] pb-2">
              <span className="text-[#8BA58B]">الجد الأساسي:</span>
              <span className="font-bold text-white">{rootName}</span>
            </div>
            <div className="flex justify-between border-b border-[#244B3D] pb-2">
              <span className="text-[#8BA58B]">الباقة المفعلة:</span>
              <span className="font-bold text-[#C9A66B]">باقة {selectedPlan.nameAr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8BA58B]">حالة الاشتراك:</span>
              <span className="font-bold text-emerald-400">نشط ومفعل حتى 2027 م</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleFinish}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#C9A66B] to-[#b89355] text-[#102B24] font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <TreePine className="w-5 h-5 text-[#102B24]" />
              <span>الانتقال للشجرة التفاعلية وإضافة أول غصن</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
