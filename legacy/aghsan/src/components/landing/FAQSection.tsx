import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'كيف أبدأ بإنشاء شجرة عائلتي في منصة أغصان؟',
      a: 'العملية تبدأ باختيار الباقة المناسبة والاشتراك، ثم إدخال اسم الشجرة وتحديد الجد الأساسي الأول. فور إتمام العملية، تصبح تلقائياً مالك الشجرة والمدقق الرئيسي المعتمد وتبدأ بإضافة الأبناء وفروع العائلة.'
    },
    {
      q: 'كيف يستطيع أفراد العائلة والأقارب إضافة أسرهم؟',
      a: 'كمالك للشجرة، تقوم بإنشاء رابط مشاركة مخصص وترسله لأفراد العائلة عبر واتساب. يفتح القريب الرابط، ويتصفح الشجرة حتى يصل إلى الغصن الذي ينتمي إليه، ثم يحدد الأب ويضيف أبناءه وزوجته في شجرة مساهمة مؤقتة ويرسلها للمراجعة.'
    },
    {
      q: 'هل تظهر الإضافات في شجرة العائلة فور قيام الفرد بإرسالها؟',
      a: 'لا، حفاظاً على دقة الأنساب ومنع التكرار أو الأخطاء، لا يتم اعتماد أي إضافة تلقائياً. تُرسل الإضافات إلى لوحة تحكم مالك الشجرة أو المدقق المساعد المعين للغصن، حيث يستعرض الفروقات (Diff) ويعتمدها أو يطلب تعديلها.'
    },
    {
      q: 'ما هي صلاحيات المدققين المساعدين وما الفرق بينهم وبين المالك؟',
      a: 'المالك يملك كامل الصلاحيات الإدارية والمالية وإدارة المدققين. أما المدقق المساعد فيمكن تحديد نطاق صلاحياته إما على كامل الشجرة أو على غصن محدد فقط (مثل فرع أحد الأبناء)، بحيث لا يستطيع مراجعة إلا طلبات غصنه فقط، ولا يمكنه حذف الشجرة أو تغيير خطة الاشتراك.'
    },
    {
      q: 'كيف تضمن المنصة خصوصية وأمان بيانات العائلة؟',
      a: 'شجرات العائلة في أغصان خاصة ومشفرة افتراضياً. لا يتم مشاركة البيانات مع أي طرف ثالث أو محركات البحث. كما نتيح تحكماً دقيقاً بخصوصية نبذات الأفراد وصورهم وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL).'
    },
    {
      q: 'ماذا يحدث لشجرة العائلة إذا انتهى الاشتراك ولم أقم بالتجديد؟',
      a: 'بيانات شجرتكم أمانة تاريخية لا نقوم بحذفها أبداً. عند انتهاء الاشتراك يتحول الحساب إلى وضع القراءة فقط، حيث يمكن تصفح الشجرة والاحتفاظ بجميع السجلات، مع إمكانية استئناف الإضافات والمساهمات فور تجديد الاشتراك.'
    },
    {
      q: 'هل يمكنني تصدير شجرة العائلة وطباعتها؟',
      a: 'نعم، تدعم المنصة تصدير شجرة العائلة بتنسيقات متعددة عالية الدقة مناسبة للطباعة بمقاسات كبيرة لتعليقها في المجالس والديوانيات العائلية، بالإضافة إلى تصدير نسخة رقمية بصيغة JSON للأرشفة.'
    },
    {
      q: 'هل يحتاج كل فرد في العائلة إلى دفع اشتراك للمساهمة؟',
      a: 'إطلاقاً! مالك الشجرة هو الوحيد الذي يدفع قيمة الاشتراك السنوي أو الشهري، بينما يستطيع جميع أفراد العائلة والأقارب استعراض الشجرة والمساهمة في بناء أغصانهم مجاناً بالكامل دون أي رسوم.'
    }
  ];

  return (
    <section className="py-24 bg-[#EAE6DC]/30 text-[#1C2923]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs sm:text-sm font-bold text-[#244B3D] px-3.5 py-1.5 rounded-full bg-[#EAE6DC] border border-[#244B3D]/20">
            كل ما تود معرفته
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-[#102B24]">
            الأسئلة الشائعة
          </h2>
          <p className="text-base text-[#244B3D]/80">
            إجابات واضحة ومباشرة حول كيفية عمل منصة أغصان وإدارة الأنساب
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#EAE6DC] overflow-hidden transition-all shadow-sm hover:border-[#C9A66B]/50"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-right flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#102B24]"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-[#C9A66B] shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#8BA58B] transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#C9A66B]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-[#244B3D]/90 leading-relaxed border-t border-[#EAE6DC]/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
