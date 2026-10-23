import React, { useState } from 'react';
import { Check, ArrowLeft, Sparkles } from 'lucide-react';
import { SubscriptionPlan } from '../../types';

interface PricingSectionProps {
  plans: SubscriptionPlan[];
  onSelectPlan: (planId: 'family' | 'extended' | 'tribe', cycle: 'monthly' | 'annual') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ plans, onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <section id="pricing" className="py-24 bg-[#F8F5EE] text-[#202B26] border-b border-[#E8DCC8]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-right">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
          <span className="text-xs font-semibold tracking-wider text-[#687C58] uppercase font-['IBM_Plex_Sans_Arabic']">
            الاشتراكات والأسعار
          </span>

          <h2 className="text-3xl sm:text-5xl font-extrabold font-['Alexandria'] text-[#16382F] leading-[1.25]">
            باقات تناسب جميع العائلات والقبائل
          </h2>

          <p className="text-base text-[#202B26]/80 leading-relaxed font-['IBM_Plex_Sans_Arabic']">
            يدفع مالك الشجرة فقط قيمة الاشتراك، بينما يشارك باقي أفراد العائلة والأقارب مجاناً بالكامل.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center p-1 rounded-full bg-white border border-[#E8DCC8] shadow-xs">
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-[#16382F] text-[#F8F5EE] shadow-xs'
                    : 'text-[#202B26]/70 hover:text-[#16382F]'
                }`}
              >
                <span>سنوي (وفر 25%)</span>
              </button>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-[#16382F] text-[#F8F5EE] shadow-xs'
                    : 'text-[#202B26]/70 hover:text-[#16382F]'
                }`}
              >
                شهري
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.priceAnnualSAR : plan.priceMonthlySAR;
            const isFeatured = plan.id === 'extended';

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between relative ${
                  isFeatured
                    ? 'bg-white border-2 border-[#B59A6B] shadow-xl scale-[1.02] z-10'
                    : 'bg-white border border-[#E8DCC8] shadow-xs hover:border-[#B59A6B]/60'
                }`}
              >
                {/* Featured Badge */}
                {isFeatured && (
                  <div className="absolute -top-3.5 right-8 px-3.5 py-1 rounded-full bg-[#16382F] text-[#E8DCC8] text-[11px] font-bold shadow-xs">
                    الأكثر ملاءمة للعائلات الممتدة
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">
                      {plan.nameAr}
                    </h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#F8F5EE] text-[#687C58] font-bold border border-[#E8DCC8]">
                      حتى {plan.maxPeople.toLocaleString('ar-SA')} فرد
                    </span>
                  </div>

                  <p className="text-xs text-[#202B26]/75 min-h-[36px] mt-1 leading-relaxed">
                    {plan.descriptionAr}
                  </p>

                  {/* Price Row */}
                  <div className="my-6 pb-6 border-b border-[#E8DCC8]">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold font-['Alexandria'] text-[#16382F]">
                        {price.toLocaleString('ar-SA')}
                      </span>
                      <span className="text-xs font-bold text-[#687C58]">
                        ر.س / {billingCycle === 'annual' ? 'سنوياً' : 'شهرياً'}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8 text-xs text-[#202B26]/90">
                    {plan.featuresAr.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <Check className="w-4 h-4 text-[#B59A6B] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card CTA Button */}
                <button
                  onClick={() => onSelectPlan(plan.id, billingCycle)}
                  className={`w-full py-3.5 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    isFeatured
                      ? 'bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] shadow-md hover:shadow-lg'
                      : 'bg-[#F8F5EE] hover:bg-[#E8DCC8] text-[#16382F] border border-[#E8DCC8]'
                  }`}
                >
                  <span>اختر باقة {plan.nameAr} وابدأ</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Quiet Footnote */}
        <div className="mt-12 text-center text-xs text-[#687C58]">
          <span>بيانات شجرتكم محفوظة ومشفرة للأبد؛ لا تُحذف السجلات حتى لو انتهى الاشتراك.</span>
        </div>

      </div>
    </section>
  );
};
