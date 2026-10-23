import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  GitBranch, 
  Sparkles, 
  ChevronRight, 
  User, 
  Plus, 
  CheckCircle2,
  TreePine,
  Maximize2
} from 'lucide-react';

interface HeroSectionProps {
  onStartTree: () => void;
  onExploreTree: () => void;
  onHowItWorks: () => void;
}

interface DemoBranch {
  id: string;
  name: string;
  role: string;
  generation: string;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
  descendants: string[];
  birthYear: number;
  bio: string;
}

const DEMO_BRANCHES: DemoBranch[] = [
  {
    id: 'mohammed',
    name: 'محمد بن عبدالله',
    role: 'الجد المؤسس',
    generation: 'الجيل الأول',
    x: 720,
    y: 720,
    descendants: ['متروك', 'ضيف الله', 'عبدالله'],
    birthYear: 1910,
    bio: 'الجذر الأول للعائلة ومؤسس مجلسها، عُرف بالحكمة وإصلاح ذات البين وسيرته العطرة.'
  },
  {
    id: 'matrook',
    name: 'متروك بن محمد',
    role: 'رأس غصن متروك',
    generation: 'الجيل الثاني',
    x: 480,
    y: 440,
    parentX: 720,
    parentY: 720,
    descendants: ['سالم', 'أحمد', 'هند'],
    birthYear: 1935,
    bio: 'الابن الأكبر للجد محمد، تفرعت من غصنه أسر كريمة في الرياض ومكة.'
  },
  {
    id: 'dayfallah',
    name: 'ضيف الله بن محمد',
    role: 'رأس غصن ضيف الله',
    generation: 'الجيل الثاني',
    x: 940,
    y: 420,
    parentX: 720,
    parentY: 720,
    descendants: ['فيصل', 'منصور'],
    birthYear: 1940,
    bio: 'صاحب المجلس العائلي بالقصيم ومبادرات صلة الرحم والتكافل الأسري.'
  },
  {
    id: 'salem',
    name: 'سالم بن متروك',
    role: 'حفيد',
    generation: 'الجيل الثالث',
    x: 340,
    y: 280,
    parentX: 480,
    parentY: 440,
    descendants: ['فهد', 'خالد', 'نورة'],
    birthYear: 1968,
    bio: 'مهندس استشاري، بادر بتوثيق شجرة العائلة القديمة وتحويلها لمنصة أغصان.'
  },
  {
    id: 'fahad',
    name: 'فهد بن سالم',
    role: 'ابن الحفيد',
    generation: 'الجيل الرابع',
    x: 240,
    y: 160,
    parentX: 340,
    parentY: 280,
    descendants: [],
    birthYear: 1996,
    bio: 'طبيب ومبادر، يمثل جيل الشباب في جمع التوثيقات والذكريات الشفهية.'
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartTree,
  onExploreTree,
  onHowItWorks
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('salem');
  const [revealedSequence, setRevealedSequence] = useState(0);

  // Live in-hero sprout demo
  const [customSprouts, setCustomSprouts] = useState<Array<{ name: string; x: number; y: number }>>([]);
  const [sproutInputName, setSproutInputName] = useState('');
  const [showSproutInput, setShowSproutInput] = useState(false);

  // Entrance choreograph
  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealedSequence(1), 150),
      setTimeout(() => setRevealedSequence(2), 550),
      setTimeout(() => setRevealedSequence(3), 950),
      setTimeout(() => setRevealedSequence(4), 1350),
      setTimeout(() => setRevealedSequence(5), 1750),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const activeBranch = DEMO_BRANCHES.find(b => b.id === selectedBranchId) || DEMO_BRANCHES[3];

  const handleGrowSprout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sproutInputName.trim()) return;

    // Attach new twig near active branch
    const newSprout = {
      name: sproutInputName.trim(),
      x: activeBranch.x - 60,
      y: activeBranch.y - 70
    };

    setCustomSprouts(prev => [...prev, newSprout]);
    setSproutInputName('');
    setShowSproutInput(false);
  };

  return (
    <section className="relative w-full min-h-[94vh] lg:h-[96vh] flex items-center overflow-hidden bg-gradient-to-b from-[#16382F] via-[#1A3F34] to-[#224A3D] text-[#F8F5EE]">
      
      {/* 1. ATMOSPHERIC HORIZON & VOLUMETRIC SUNLIGHT */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#E8DCC8]/25 via-[#B59A6B]/15 to-transparent blur-3xl opacity-80 animate-atmospheric" />
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#16382F] via-[#1A3F35]/70 to-transparent" />
        <div className="absolute -top-20 right-1/4 w-[750px] h-[950px] bg-gradient-to-b from-amber-100/10 via-amber-200/5 to-transparent transform -rotate-25 pointer-events-none blur-2xl animate-sunray" />
        <div className="absolute inset-0 noise-overlay opacity-30" />
      </div>

      {/* 2. THE LIVING BOTANICAL SIDR TREE (Interactive SVG Botanical Art) */}
      <div className={`absolute inset-0 pointer-events-auto transition-opacity duration-1000 ${
        revealedSequence >= 2 ? 'opacity-100' : 'opacity-0'
      }`}>
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full object-cover select-none"
        >
          <defs>
            <linearGradient id="heroTrunkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0E231D" />
              <stop offset="50%" stopColor="#1B3D33" />
              <stop offset="100%" stopColor="#2A5346" />
            </linearGradient>

            <linearGradient id="heroBranchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B59A6B" />
              <stop offset="100%" stopColor="#4A6E55" />
            </linearGradient>

            <linearGradient id="heroSproutGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#FFF2A3" />
            </linearGradient>

            <linearGradient id="heroFoliageGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#687C58" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1E453A" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Master Arabian Sidr Trunk */}
          <path
            d="M 660 900 C 680 820, 690 760, 700 680 C 705 620, 715 560, 720 520 L 750 520 C 755 560, 765 620, 770 680 C 780 760, 790 820, 810 900 Z"
            fill="url(#heroTrunkGrad)"
          />

          {/* Root flairs */}
          <path d="M 670 870 Q 610 885, 540 895" stroke="#0E231D" strokeWidth="18" fill="none" strokeLinecap="round" />
          <path d="M 795 870 Q 860 885, 930 895" stroke="#0E231D" strokeWidth="18" fill="none" strokeLinecap="round" />

          {/* Major Bough 1: Matrook (Left sweep) */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedBranchId('matrook')}
          >
            <path
              d="M 720 560 C 650 520, 560 490, 480 440"
              stroke={selectedBranchId === 'matrook' || selectedBranchId === 'salem' || selectedBranchId === 'fahad' ? '#B59A6B' : 'url(#heroTrunkGrad)'}
              strokeWidth={selectedBranchId === 'matrook' ? "32" : "26"}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-300"
            />
            {/* Twig to Salem */}
            <path
              d="M 480 440 C 420 380, 380 340, 340 280"
              stroke={selectedBranchId === 'salem' || selectedBranchId === 'fahad' ? '#B59A6B' : 'url(#heroTrunkGrad)'}
              strokeWidth={selectedBranchId === 'salem' ? "18" : "14"}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-300"
            />
            {/* Twig to Fahd */}
            <path
              d="M 340 280 C 290 230, 260 200, 240 160"
              stroke={selectedBranchId === 'fahad' ? '#B59A6B' : 'url(#heroTrunkGrad)'}
              strokeWidth={selectedBranchId === 'fahad' ? "12" : "9"}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-300"
            />
          </g>

          {/* Major Bough 2: Dayfallah (Right sweep) */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedBranchId('dayfallah')}
          >
            <path
              d="M 740 540 C 820 500, 890 470, 940 420"
              stroke={selectedBranchId === 'dayfallah' ? '#B59A6B' : 'url(#heroTrunkGrad)'}
              strokeWidth={selectedBranchId === 'dayfallah' ? "30" : "24"}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-300"
            />
            <path
              d="M 940 420 C 1010 380, 1080 340, 1140 280"
              stroke="url(#heroTrunkGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Major Bough 3: Skyward Crown */}
          <path
            d="M 730 520 C 720 420, 740 330, 760 210"
            stroke="url(#heroTrunkGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />

          {/* Newly grown custom sprouts from user demo interaction! */}
          {customSprouts.map((sprout, idx) => (
            <g key={idx} className="animate-in fade-in zoom-in duration-700">
              <path
                d={`M ${activeBranch.x} ${activeBranch.y} C ${activeBranch.x - 30} ${activeBranch.y - 40}, ${sprout.x + 20} ${sprout.y + 20}, ${sprout.x} ${sprout.y}`}
                stroke="url(#heroSproutGrad)"
                strokeWidth="6"
                strokeDasharray="4 2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx={sprout.x} cy={sprout.y} r="14" fill="#D4AF37" stroke="#FFFFFF" strokeWidth="2" />
              <text x={sprout.x} y={sprout.y + 4} textAnchor="middle" fill="#16382F" fontSize="10" fontWeight="bold">
                {sprout.name.charAt(0)}
              </text>
              <g transform={`translate(${sprout.x}, ${sprout.y - 20})`}>
                <rect x="-45" y="-10" width="90" height="20" rx="10" fill="#16382F" stroke="#D4AF37" strokeWidth="1" />
                <text x="0" y="4" textAnchor="middle" fill="#FFF2A3" fontSize="9" fontWeight="bold">
                  {sprout.name} (جديد)
                </text>
              </g>
            </g>
          ))}

          {/* Foliage Clusters */}
          <g className="animate-leaf-sway pointer-events-none opacity-80">
            <ellipse cx="280" cy="220" rx="130" ry="75" fill="url(#heroFoliageGrad1)" />
            <ellipse cx="440" cy="380" rx="150" ry="85" fill="url(#heroFoliageGrad1)" />
            <ellipse cx="960" cy="360" rx="160" ry="90" fill="url(#heroFoliageGrad1)" />
            <ellipse cx="1120" cy="250" rx="140" ry="80" fill="url(#heroFoliageGrad1)" />
            <ellipse cx="760" cy="180" rx="160" ry="85" fill="url(#heroFoliageGrad1)" />
          </g>
        </svg>

        {/* Interactive Botanical Branch Labels on the Tree */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          revealedSequence >= 4 ? 'opacity-100' : 'opacity-0'
        }`}>
          {DEMO_BRANCHES.map((b) => {
            const isSelected = selectedBranchId === b.id;
            return (
              <div
                key={b.id}
                style={{
                  position: 'absolute',
                  left: `${(b.x / 1440) * 100}%`,
                  top: `${(b.y / 900) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className="pointer-events-auto"
              >
                <button
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer ${
                    isSelected
                      ? 'bg-[#B59A6B] text-[#16382F] shadow-2xl scale-110 font-bold border-2 border-white'
                      : 'bg-[#16382F]/80 hover:bg-[#1E453A] text-[#F8F5EE] border border-[#E8DCC8]/30 hover:border-[#B59A6B] hover:scale-105'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#16382F]' : 'bg-[#B59A6B]'}`} />
                  <span className="text-xs font-['Alexandria']">{b.name}</span>
                  <span className={`text-[9px] opacity-75 hidden sm:inline ${isSelected ? 'text-[#16382F]' : 'text-[#A5B39A]'}`}>
                    {b.generation}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. HERO CONTENT & EDITORIAL STORYTELLING */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Proposition (7 cols) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            <div className={`transition-all duration-700 transform ${
              revealedSequence >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#E8DCC8]/30 text-xs text-[#E8DCC8]">
                <TreePine className="w-3.5 h-3.5 text-[#B59A6B]" />
                <span>شجرة عائلة حية تستكشف أغصانها وتنمو مع أجيالك</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className={`transition-all duration-800 transform ${
                revealedSequence >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-['Alexandria'] text-[#F8F5EE] leading-[1.2]">
                  كل عائلة لها جذور
                </h1>
              </div>

              <div className={`transition-all duration-800 delay-150 transform ${
                revealedSequence >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-['Alexandria'] text-[#E8DCC8] leading-[1.2]">
                  وكل غصن يحمل حكاية.
                </h1>
              </div>
            </div>

            <div className={`transition-all duration-800 delay-300 transform ${
              revealedSequence >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <p className="text-base sm:text-lg text-[#F8F5EE]/85 max-w-xl leading-relaxed font-['IBM_Plex_Sans_Arabic']">
                أنشئ شجرة عائلتك، وشاركها مع أفرادها، ودع أغصانكم تنمو جيلًا بعد جيل في تجربة بصرية نباتية فريدة مع نظام تدقيق واعتماد يحفظ دقة الأنساب.
              </p>
            </div>

            {/* CTAs */}
            <div className={`pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 transition-all duration-800 delay-400 transform ${
              revealedSequence >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <button
                onClick={onStartTree}
                className="px-8 py-4 rounded-full bg-[#E8DCC8] hover:bg-[#F8F5EE] text-[#16382F] font-bold text-sm transition-all duration-200 shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2.5"
              >
                <span>ابدأ شجرة عائلتك</span>
                <ArrowLeft className="w-4 h-4 text-[#16382F]" />
              </button>

              <button
                onClick={onExploreTree}
                className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-[#F8F5EE] border border-white/25 hover:border-[#E8DCC8] text-sm font-semibold transition-all backdrop-blur-md flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-4 h-4 text-[#B59A6B]" />
                <span>جرّب الشجرة التفاعلية الحية</span>
              </button>
            </div>

          </div>

          {/* Right Floating Botanical Inspector & Growth Demo (5 cols) */}
          <div className="lg:col-span-5 flex justify-end">
            <div className={`w-full max-w-sm rounded-3xl bg-[#16382F]/85 backdrop-blur-xl border border-[#E8DCC8]/30 p-6 shadow-2xl transition-all duration-700 transform ${
              revealedSequence >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}>
              
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <span className="text-[#B59A6B] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>محطة في الشجرة الحية</span>
                </span>
                <span className="text-[#A5B39A]">{activeBranch.generation}</span>
              </div>

              <div className="py-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#244E42] border border-[#B59A6B]/50 flex items-center justify-center text-[#E8DCC8] font-bold text-sm">
                    {activeBranch.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#F8F5EE] font-['Alexandria'] leading-tight">
                      {activeBranch.name}
                    </h4>
                    <p className="text-xs text-[#A5B39A] mt-0.5">
                      مواليد {activeBranch.birthYear} م • {activeBranch.role}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#F8F5EE]/80 leading-relaxed">
                  {activeBranch.bio}
                </p>

                {/* Live Twig Growth Interactive Demo on the Hero! */}
                <div className="pt-2">
                  {!showSproutInput ? (
                    <button
                      onClick={() => setShowSproutInput(true)}
                      className="w-full py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-[#B59A6B]/40 text-xs font-semibold text-[#E8DCC8] hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#B59A6B]" />
                      <span>جرّب نمو غصن جديد تحت {activeBranch.name}</span>
                    </button>
                  ) : (
                    <form onSubmit={handleGrowSprout} className="space-y-2 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="اكتب اسماً للتجربة (مثال: ناصر)..."
                        value={sproutInputName}
                        onChange={(e) => setSproutInputName(e.target.value)}
                        className="w-full bg-black/40 border border-[#B59A6B] rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowSproutInput(false)}
                          className="px-3 py-1.5 text-xs text-[#A5B39A]"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 rounded-xl bg-[#B59A6B] hover:bg-[#A38859] text-[#16382F] font-bold text-xs"
                        >
                          شاهد الغصن ينمو الآن!
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#A5B39A]">
                  انقر أي غصن بالشجرة للغوص فيه
                </span>
                <button
                  onClick={onExploreTree}
                  className="text-xs font-bold text-[#E8DCC8] hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>فتح الشجرة كاملة</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

    </section>
  );
};
