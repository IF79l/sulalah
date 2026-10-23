import React from 'react';
import { 
  GitBranch, 
  Share2, 
  Layers, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Search, 
  History, 
  Lock,
  Printer,
  Sparkles
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: GitBranch,
      title: 'بناء شجرة تفاعلية ديناميكية',
      desc: 'لوحة تحكم مرئية متقدمة تدعم التكبير، التحريك، وتفرع الأجيال بروابط انسيابية وتصاميم عربية أصيلة.'
    },
    {
      icon: Share2,
      title: 'مشاركة تشاركية عبر واتساب',
      desc: 'روابط دعوة ذكية تتيح لكل عائلة تصفح فروعها والمساهمة في تحديث بيانات أفرادها بسهولة ودون تعقيد.'
    },
    {
      icon: Layers,
      title: 'إضافة أجيال متعددة بجلسة واحدة',
      desc: 'يستطيع المساهم إضافة الأبناء، الأحفاد، والأزواج في شجرة مؤقتة قبل إرسالها كلها في طلب اعتماد واحد.'
    },
    {
      icon: ShieldCheck,
      title: 'نظام مراجعة واعتماد احترافي',
      desc: 'لا يُضاف أي شخص للشجرة المعتمدة تلقائيًا؛ يستعرض المدقق الفروقات ويعتمد أو يرفض مع تدوين الملاحظات.'
    },
    {
      icon: UserCheck,
      title: 'إدارة المدققين وصلاحيات الأغصان',
      desc: 'تعيين مدققين مساعدين من كبار الفروع مع تحديد صلاحية التدقيق على غصن محدد فقط لضمان دقة الأنساب.'
    },
    {
      icon: Search,
      title: 'بحث ذكي يدعم خصائص العربية',
      desc: 'محرك بحث متطور يتعامل مع تنوع الهمزات، التاء المربوطة، وحركات التشكيل للوصول الفوري لأي فرد.'
    },
    {
      icon: History,
      title: 'سجل تدقيق كامل للعمليات (Audit Log)',
      desc: 'توثيق دقيق لكل عملية إضافة، تعديل، اعتماد، أو دعوة مدقق مع التاريخ والوقت والمسؤول عن الإجراء.'
    },
    {
      icon: Lock,
      title: 'خصوصية وحماية البيانات الأسرية',
      desc: 'أشجار خاصة ومشفرة تمنع الوصول غير المصرح به للملفات والنبذات وتراعي خصوصية القُصّر والسيدات.'
    },
    {
      icon: Printer,
      title: 'تصدير وطباعة بمقاسات جدارية',
      desc: 'إمكانية استخراج شجرة العائلة بتنسيق عالي الدقة جاهز للطباعة الفاخرة وتعليقها في المجالس العائلية.'
    }
  ];

  return (
    <section className="py-24 bg-[#EAE6DC]/50 border-y border-[#EAE6DC] text-[#1C2923]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs sm:text-sm font-bold text-[#C9A66B] px-3.5 py-1.5 rounded-full bg-[#102B24] text-[#F7F5EF]">
            مميزات مصممة خصيصاً للمجتمع العربي
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-[#102B24]">
            منظومة متكاملة لتوثيق تاريخ أجيالكم
          </h2>
          <p className="text-base sm:text-lg text-[#244B3D]/80">
            تجمع منصة أغصان بين فخامة التراث العائلي وأحدث تقنيات الأنظمة السحابية التشاركية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="bg-white rounded-3xl p-8 border border-[#EAE6DC] shadow-sm hover:shadow-xl hover:border-[#C9A66B]/60 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#102B24] text-[#C9A66B] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#102B24] font-['Alexandria'] mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-[#244B3D]/80 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
