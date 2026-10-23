import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface FinalCTAProps {
  onStartTree: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onStartTree }) => {
  return (
    <section className="relative py-32 bg-gradient-to-b from-[#16382F] via-[#122E26] to-[#0E231D] text-[#F8F5EE] overflow-hidden text-center">
      
      {/* Background Ambient Glows & Horizon Silhouette */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#B59A6B]/10 blur-3xl" />
        
        {/* Subtle Tree Silhouette Branches at the bottom */}
        <svg
          viewBox="0 0 1440 300"
          className="absolute bottom-0 inset-x-0 w-full h-48 opacity-25 object-cover pointer-events-none"
        >
          <path
            d="M 0 300 C 300 240, 500 200, 720 180 C 940 200, 1140 240, 1440 300 Z"
            fill="#081813"
          />
          <path
            d="M 720 180 Q 640 100 520 60"
            stroke="#B59A6B"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M 720 180 Q 800 100 920 70"
            stroke="#B59A6B"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 space-y-8">
        
        <span className="text-xs font-semibold tracking-widest text-[#B59A6B] uppercase font-['IBM_Plex_Sans_Arabic'] block">
          أمانة تاريخية بين يديك
        </span>

        <h2 className="text-4xl sm:text-6xl font-extrabold font-['Alexandria'] text-[#F8F5EE] leading-tight">
          الأجيال تمضي... <br />
          <span className="text-[#E8DCC8]">والحكايات تبقى.</span>
        </h2>

        <p className="text-base sm:text-lg text-[#F8F5EE]/80 max-w-xl mx-auto leading-relaxed font-['IBM_Plex_Sans_Arabic'] font-normal">
          لا تدع روايات وأسماء أجدادكم تتفرق بين الذكريات. ابدأ اليوم بتوثيق شجرة عائلتكم في منصة تحفظ الأصول وتجمع الأجيال.
        </p>

        <div className="pt-4 flex justify-center">
          <button
            onClick={onStartTree}
            className="px-10 py-4 rounded-full bg-[#E8DCC8] hover:bg-[#F8F5EE] text-[#16382F] font-bold text-sm transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-98 flex items-center gap-3 border border-[#E8DCC8]"
          >
            <span>ابدأ توثيق شجرتك</span>
            <ArrowLeft className="w-4 h-4 text-[#16382F]" />
          </button>
        </div>

      </div>
    </section>
  );
};
