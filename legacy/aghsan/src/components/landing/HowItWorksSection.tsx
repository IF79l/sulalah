import React from 'react';
import { CreditCard, TreePine, Share2, ShieldCheck, ArrowDown } from 'lucide-react';

interface HowItWorksSectionProps {
  onStartTree: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onStartTree }) => {
  const steps = [
    {
      num: '١',
      icon: CreditCard,
      title: 'اختر الباقة المناسبة',
      desc: 'حدد حجم عائلتك أو قبيلتك وعدد المدققين المساعدين المطلوبين، مع ضمان حفظ بياناتك للأبد.'
    },
    {
      num: '٢',
      icon: TreePine,
      title: 'أنشئ شجرتك وأضف الجد الأساسي',
      desc: 'أدخل اسم الشجرة ومعلومات الجد الأساسي، لتصبح تلقائيًا مالك الشجرة والمدقق الرئيسي المعتمد.'
    },
    {
      num: '٣',
      icon: Share2,
      title: 'شارك رابط الشجرة مع أفراد عائلتك',
      desc: 'أرسل رابط المساهمة عبر واتساب. يختار كل قريب غصنه المحدد ويضيف أفراد أسرته في مكانهم الصحيح.'
    },
    {
      num: '٤',
      icon: ShieldCheck,
      title: 'راجع الإضافات واعتمدها لتكبر شجرتكم معًا',
      desc: 'تصلك الإضافات في صندوق المراجعة، تقارنها وتعتمدها بضغطة زر لتظهر فورًا في الشجرة المعتمدة.'
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#F7F5EF] text-[#1C2923] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="text-xs sm:text-sm font-bold text-[#244B3D] px-3.5 py-1.5 rounded-full bg-[#EAE6DC] border border-[#244B3D]/20">
            خطوات بسيطة ونتائج عظيمة
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-[#102B24]">
            شجرة عائلتك تبدأ بخطوة
          </h2>
          <p className="text-base sm:text-lg text-[#244B3D]/80">
            صممنا رحلة البناء لتكون تشاركية وموثوقة، تجمع العائلة وتضمن دقة الأنساب دون فوضى أو تكرار.
          </p>
        </div>

        {/* Steps Grid with Connecting Elements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx}
                className="relative bg-white rounded-3xl p-8 border border-[#EAE6DC] shadow-sm hover:shadow-xl hover:border-[#C9A66B]/50 transition-all group flex flex-col justify-between"
              >
                {/* Step Number Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#102B24] text-[#C9A66B] flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-md">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-3xl font-extrabold text-[#C9A66B]/40 font-['Alexandria']">
                    {step.num}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-[#102B24] font-['Alexandria']">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#244B3D]/80 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EAE6DC]/60 flex items-center justify-between text-xs text-[#8BA58B]">
                  <span>الخطوة {step.num}</span>
                  {idx < steps.length - 1 && (
                    <span className="hidden lg:inline text-[#C9A66B] font-bold">← التالية</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action beneath steps */}
        <div className="mt-16 text-center">
          <button
            onClick={onStartTree}
            className="px-8 py-3.5 rounded-2xl bg-[#102B24] hover:bg-[#244B3D] text-[#F7F5EF] font-bold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            ابدأ الخطوة الأولى الآن
          </button>
        </div>

      </div>
    </section>
  );
};
