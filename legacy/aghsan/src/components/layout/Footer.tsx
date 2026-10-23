import React from 'react';
import { ShieldCheck, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#122E26] text-[#F8F5EE] border-t border-[#1B3D33] py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-12 text-right">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand & Wordmark */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-['Alexandria'] text-2xl font-bold tracking-tight text-[#F8F5EE]">
                أغصان
              </span>
              <span className="text-xs text-[#A5B39A]">ذاكرة الأجيال</span>
            </div>
            <p className="text-xs text-[#A5B39A] leading-relaxed max-w-sm">
              المنصة السحابية الموثقة للأنساب وشجرات العائلات والقبائل في المملكة العربية السعودية والوطن العربي، بطريقة تفاعلية وتشاركية تحفظ دقة الموروث.
            </p>
          </div>

          {/* Nav links mirror */}
          <div className="md:col-span-3 space-y-2 text-xs">
            <span className="font-bold text-[#E8DCC8] block mb-2">روابط سريعة</span>
            <ul className="space-y-2 text-[#A5B39A]">
              <li>
                <button onClick={() => onNavigate('landing')} className="hover:text-white transition-colors">
                  الرئيسية
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tree')} className="hover:text-white transition-colors">
                  الشجرة التفاعلية
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-white transition-colors">
                  الباقات والاشتراكات
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors">
                  لوحة التحكم
                </button>
              </li>
            </ul>
          </div>

          {/* Governance & Privacy */}
          <div className="md:col-span-4 space-y-2 text-xs">
            <span className="font-bold text-[#E8DCC8] block mb-2">الخصوصية والأمان</span>
            <p className="text-[#A5B39A] leading-relaxed">
              شجرات خاصة ومشفرة تلتزم بضوابط نظام حماية البيانات الشخصية السعودي (PDPL).
            </p>
            <div className="pt-2 text-[11px] text-[#A5B39A] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B59A6B] shrink-0" />
              <span>التوثيق مبني على مراجعة واعتماد ممثلي العائلة المعتمدين.</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A5B39A]">
          <div>جميع الحقوق محفوظة © {new Date().getFullYear()} منصة أغصان</div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>الرياض، المملكة العربية السعودية</span>
            <span>·</span>
            <span>support@aghsan.sa</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
