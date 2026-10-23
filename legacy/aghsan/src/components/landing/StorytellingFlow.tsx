import React, { useState } from 'react';
import { 
  GitBranch, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  UserPlus, 
  Send, 
  ArrowLeft,
  ChevronRight,
  Heart,
  Calendar,
  Layers,
  Users
} from 'lucide-react';

interface StorytellingFlowProps {
  onStartTree: () => void;
  onExploreTree: () => void;
}

export const StorytellingFlow: React.FC<StorytellingFlowProps> = ({
  onStartTree,
  onExploreTree
}) => {
  // Section A: Generations expansion step
  const [activeGenStep, setActiveGenStep] = useState<number>(3); // 1, 2, 3, 4

  // Section B: Interactive branch builder state
  const [proposedKids, setProposedKids] = useState<string[]>(['فهد بن سالم', 'نورة بنت سالم']);
  const [newKidInput, setNewKidInput] = useState('');
  const [isDemoSubmitted, setIsDemoSubmitted] = useState(false);

  // Section C: Approval toggle state
  const [demoApproved, setDemoApproved] = useState(false);

  // Section D: Selected profile in stories
  const [selectedStoryPerson, setSelectedStoryPerson] = useState<'mohammed' | 'salem' | 'fahad'>('salem');

  const storyProfiles = {
    mohammed: {
      name: 'الجد محمد بن عبدالله',
      generation: 'الجيل الأول (الجد الأساسي)',
      years: '1910 — 1988 م',
      branch: 'أصل العائلة',
      bio: 'عُرف بالحكمة وإصلاح ذات البين، جمع فروع الأسرة في نجد وأسس مجلساً عائلياً تتوارثه الأجيال.',
      kin: { father: 'عبدالله بن إبراهيم', children: ['متروك', 'ضيف الله', 'عبدالله', 'سارة'] }
    },
    salem: {
      name: 'سالم بن متروك بن محمد',
      generation: 'الجيل الثالث (حفيد)',
      years: '1968 م — حفظه الله',
      branch: 'فرع متروك',
      bio: 'مهندس استشاري، بادر بجمع وثائق وأشجار العائلة القديمة ورقمنتها لصالح الأجيال الشابة.',
      kin: { father: 'متروك بن محمد', spouse: 'مريم التميمي', children: ['فهد', 'خالد', 'نورة'] }
    },
    fahad: {
      name: 'فهد بن سالم بن متروك',
      generation: 'الجيل الرابع (ابن الحفيد)',
      years: '1996 م — حفظه الله',
      branch: 'فرع متروك',
      bio: 'طبيب، يمثل الجيل الشاب الحريص على توثيق صلة الرحم والتواصل الرقمي بين أبناء العمومة.',
      kin: { father: 'سالم بن متروك', mother: 'مريم التميمي' }
    }
  };

  const currentProfile = storyProfiles[selectedStoryPerson];

  return (
    <div className="w-full bg-[#F8F5EE] text-[#202B26] overflow-hidden">
      
      {/* ========================================================
          SECTION A: FROM ONE ANCESTOR TO GENERATIONS
          "تبدأ الحكاية باسم... وتمتد عبر الأجيال."
      ======================================================== */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 border-b border-[#E8DCC8]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Argument */}
          <div className="lg:col-span-5 space-y-6 text-right">
            <span className="text-xs font-semibold tracking-wider text-[#687C58] uppercase font-['IBM_Plex_Sans_Arabic']">
              التوسع والتسلسل التاريخي
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold font-['Alexandria'] text-[#16382F] leading-[1.25]">
              تبدأ الحكاية باسم... <br />
              <span className="text-[#B59A6B]">وتمتد عبر الأجيال.</span>
            </h2>

            <p className="text-base text-[#202B26]/80 leading-relaxed font-['IBM_Plex_Sans_Arabic']">
              كل شجرة تبدأ بجدٍّ أساسي واحد؛ ومن ذلك الاسم الواحد تتفرع الأغصان وتتسع الأجيال. 
              تتيح لك منصة أغصان استعراض تسلسل الأنساب بسلاسة، كأنك تشهد نمو الشجرة عبر العقود.
            </p>

            {/* Interactive Generation Step Controller */}
            <div className="pt-2 space-y-3">
              <span className="text-xs font-bold text-[#16382F] block">
                تدرّج الأجيال عبر الزمن:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { step: 1, label: 'الجيل ١: الجد' },
                  { step: 2, label: 'الجيل ٢: الأبناء' },
                  { step: 3, label: 'الجيل ٣: الأحفاد' },
                  { step: 4, label: 'الجيل ٤: أبناء الأحفاد' }
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setActiveGenStep(s.step)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      activeGenStep === s.step
                        ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm'
                        : 'bg-white hover:bg-[#E8DCC8]/50 text-[#202B26] border border-[#E8DCC8]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Sequence Demonstration Box */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-[#E8DCC8] shadow-sm min-h-[420px] flex flex-col justify-center items-center relative overflow-hidden">
            
            {/* Visual Generational Growth Canvas */}
            <div className="w-full flex flex-col items-center space-y-6">
              
              {/* Generation 1: Root */}
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                <div className="px-6 py-3 rounded-2xl bg-[#16382F] text-[#F8F5EE] shadow-md border border-[#B59A6B]/50 text-center">
                  <span className="text-[10px] text-[#A5B39A] block">الجيل الأول • الجد المؤسس</span>
                  <span className="text-sm font-bold font-['Alexandria']">الجد محمد بن عبدالله</span>
                </div>
                {activeGenStep >= 2 && <div className="w-0.5 h-6 bg-[#B59A6B]" />}
              </div>

              {/* Generation 2: Main Branches */}
              {activeGenStep >= 2 && (
                <div className="flex items-center justify-center gap-4 sm:gap-8 relative animate-in fade-in slide-in-from-top-3 duration-400">
                  <div className="flex flex-col items-center">
                    <div className="px-4 py-2.5 rounded-xl bg-[#F8F5EE] border border-[#B59A6B] text-center">
                      <span className="text-[10px] text-[#687C58] block">غصن رئيسي</span>
                      <span className="text-xs font-bold text-[#16382F]">متروك بن محمد</span>
                    </div>
                    {activeGenStep >= 3 && <div className="w-0.5 h-6 bg-[#B59A6B]" />}
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="px-4 py-2.5 rounded-xl bg-[#F8F5EE] border border-[#E8DCC8] text-center opacity-85">
                      <span className="text-[10px] text-[#687C58] block">غصن رئيسي</span>
                      <span className="text-xs font-bold text-[#16382F]">ضيف الله بن محمد</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="px-4 py-2.5 rounded-xl bg-[#F8F5EE] border border-[#E8DCC8] text-center opacity-85">
                      <span className="text-[10px] text-[#687C58] block">غصن رئيسي</span>
                      <span className="text-xs font-bold text-[#16382F]">عبدالله بن محمد</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation 3: Under Matrook */}
              {activeGenStep >= 3 && (
                <div className="flex items-center justify-center gap-4 relative animate-in fade-in slide-in-from-top-3 duration-400">
                  <div className="flex flex-col items-center">
                    <div className="px-4 py-2 rounded-xl bg-[#F8F5EE] border border-[#B59A6B] text-center">
                      <span className="text-[10px] text-[#B59A6B] font-bold block">الجيل الثالث</span>
                      <span className="text-xs font-bold text-[#16382F]">سالم بن متروك</span>
                    </div>
                    {activeGenStep >= 4 && <div className="w-0.5 h-6 bg-[#B59A6B]" />}
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="px-4 py-2 rounded-xl bg-[#F8F5EE] border border-[#E8DCC8] text-center opacity-75">
                      <span className="text-[10px] text-[#687C58] block">الجيل الثالث</span>
                      <span className="text-xs font-bold text-[#16382F]">أحمد بن متروك</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Generation 4: Under Salem */}
              {activeGenStep >= 4 && (
                <div className="flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-3 duration-400">
                  {['فهد بن سالم', 'خالد بن سالم', 'نورة بنت سالم'].map((name, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-[#E8DCC8]/60 border border-[#B59A6B]/50 text-center">
                      <span className="text-[10px] text-[#16382F] font-semibold">{name}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div className="mt-8 text-xs text-[#687C58] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B59A6B]" />
              <span>شجرة عائلة حية تتسع تلقائياً كلما وثقت أجيالاً جديدة.</span>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION B: COLLABORATIVE FAMILY BUILDING
          "كل فرد يضيف غصنه."
      ======================================================== */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 border-b border-[#E8DCC8]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Interactive Micro-Product Simulator (7 Columns) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-[#E8DCC8] shadow-sm space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DCC8]/60 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#16382F]">
                <GitBranch className="w-4 h-4 text-[#B59A6B]" />
                <span>مساحة المساهمة العائلية: غصن سالم بن متروك</span>
              </div>
              <span className="text-[#687C58]">إضافة متعددة الأجيال</span>
            </div>

            {/* Approved Anchor Node */}
            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#687C58] font-bold block">الفرد المعتمد كنقطة ربط:</span>
                <span className="text-sm font-bold text-[#16382F]">سالم بن متروك بن محمد</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#16382F] text-[#F8F5EE] font-bold">
                معتمد ✓
              </span>
            </div>

            {/* Proposed Family Members (Gold dashed border) */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#16382F] block">
                الأبناء المقترح إضافتهم في هذا الطلب ({proposedKids.length}):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {proposedKids.map((kid, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl border border-dashed border-[#B59A6B] bg-[#E8DCC8]/25 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="text-[10px] text-[#B59A6B] font-bold block">مقترح جديد</span>
                      <span className="font-bold text-[#16382F]">{kid}</span>
                    </div>
                    <span className="text-[10px] text-[#687C58]">بانتظار الاعتماد</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Micro input to add another member in demo */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="أضف اسماً آخر (مثال: خالد بن سالم)..."
                value={newKidInput}
                onChange={(e) => setNewKidInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newKidInput.trim()) {
                    setProposedKids([...proposedKids, newKidInput.trim()]);
                    setNewKidInput('');
                  }
                }}
                className="flex-1 bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3.5 py-2 text-xs focus:border-[#B59A6B] focus:outline-none"
              />
              <button
                onClick={() => {
                  if (newKidInput.trim()) {
                    setProposedKids([...proposedKids, newKidInput.trim()]);
                    setNewKidInput('');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#16382F] text-white text-xs font-bold hover:bg-[#202B26]"
              >
                إضافة
              </button>
            </div>

            {/* Submission feedback */}
            <div className="pt-4 border-t border-[#E8DCC8]/60 flex items-center justify-between">
              {isDemoSubmitted ? (
                <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم إرسال الإضافات بنجاح لمدقق الغصن لمراجعتها!</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsDemoSubmitted(true)}
                  className="px-6 py-2.5 rounded-full bg-[#B59A6B] hover:bg-[#9E8354] text-[#16382F] font-bold text-xs shadow flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال الإضافات للمراجعة</span>
                </button>
              )}
            </div>

          </div>

          {/* Text Argument (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 text-right">
            <span className="text-xs font-semibold tracking-wider text-[#687C58] uppercase font-['IBM_Plex_Sans_Arabic']">
              المشاركة والتعاون
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold font-['Alexandria'] text-[#16382F] leading-[1.25]">
              كل فرد يضيف غصنه.
            </h2>

            <p className="text-base text-[#202B26]/80 leading-relaxed font-['IBM_Plex_Sans_Arabic']">
              لا يتحمل شخص واحد عبء جمع أسماء آلاف الأفراد. 
              شارك رابط الشجرة مع أبناء عمومتك وأقاربك؛ يفتح كل شخص الغصن الذي ينتمي إليه ويضيف عائلته في المكان الصحيح بكل سلاسة.
            </p>

            <div className="space-y-3 pt-2 text-xs text-[#202B26]/90 font-['IBM_Plex_Sans_Arabic']">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B59A6B]" />
                <span>مشاركة مباشرة وفورية عبر واتساب بروابط آمنة</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B59A6B]" />
                <span>إمكانية بناء عدة أجيال (أبناء وأحفاد) في جلسة واحدة</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B59A6B]" />
                <span>المساهمة مجانية بالكامل لجميع أفراد الأسرة</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION C: REVIEW AND APPROVAL
          "كل إضافة تمر بعينٍ أمينة."
      ======================================================== */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 border-b border-[#E8DCC8]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Argument (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 text-right">
            <span className="text-xs font-semibold tracking-wider text-[#687C58] uppercase font-['IBM_Plex_Sans_Arabic']">
              دقة النسب والأمانة
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold font-['Alexandria'] text-[#16382F] leading-[1.25]">
              كل إضافة تمر <br />
              <span className="text-[#B59A6B]">بعينٍ أمينة.</span>
            </h2>

            <p className="text-base text-[#202B26]/80 leading-relaxed font-['IBM_Plex_Sans_Arabic']">
              حفظ الأنساب أمانة تاريخية لا تحتمل الفوضى أو التكرار. 
              لا تظهر أي إضافة في الشجرة المعتمدة إلا بعد مراجعتها وتدقيقها من مالك الشجرة أو المدقق المعين للغصن.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => setDemoApproved(!demoApproved)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
                  demoApproved 
                    ? 'bg-[#16382F] text-[#F8F5EE] border-[#16382F]' 
                    : 'bg-[#B59A6B] text-[#16382F] border-[#B59A6B]'
                }`}
              >
                {demoApproved ? 'إعادة العرض: قيد المراجعة' : 'اضغط للمحاكاة: اعتماد الإضافة الآن'}
              </button>
            </div>
          </div>

          {/* Visual Diff & Verification Card (7 Columns) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-[#E8DCC8] shadow-sm space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DCC8]">
              <div>
                <span className="text-xs font-bold text-[#16382F]">مقارنة الفروقات (Tree Diff View)</span>
                <p className="text-[11px] text-[#687C58]">مساهمة من: أحمد بن متروك</p>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${
                demoApproved 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {demoApproved ? 'تم الاعتماد والتثبيت ✓' : 'بانتظار موافقة المدقق ⏳'}
              </span>
            </div>

            {/* Tree Branch Visual State */}
            <div className={`p-6 rounded-2xl transition-all duration-500 border ${
              demoApproved 
                ? 'bg-[#16382F] text-[#F8F5EE] border-emerald-600' 
                : 'bg-[#F8F5EE] text-[#202B26] border-dashed border-[#B59A6B]'
            }`}>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold">الغصن المستهدف: فرع متروك بن محمد</span>
                <span className="text-[10px] opacity-75">الأب: أحمد بن متروك</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {['زياد بن أحمد', 'ليان بنت أحمد', 'سارة بنت أحمد'].map((child, i) => (
                  <div 
                    key={i} 
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      demoApproved 
                        ? 'bg-white/15 text-white border border-white/20' 
                        : 'bg-white border border-[#B59A6B] text-[#B59A6B]'
                    }`}
                  >
                    {child}
                  </div>
                ))}
              </div>

              <p className="text-[11px] opacity-80 mt-4 leading-relaxed">
                {demoApproved 
                  ? 'تم دمج الأفراد تلقائياً في قاعدة البيانات الرسمية للشجرة، وتحديث تسلسل الأجيال وسجل التدقيق.'
                  : 'الإضافات معزولة بأمان ولا يمكن للجمهور أو العائلة رؤيتها حتى يوافق المدقق.'}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION D: INDIVIDUAL PROFILES
          "وراء كل اسم... حكاية."
      ======================================================== */}
      <section className="py-24 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Interactive Profile Drawer Demo (7 Columns) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-[#E8DCC8] shadow-sm space-y-6">
            
            {/* Person Selector Tabs */}
            <div className="flex items-center gap-2 pb-4 border-b border-[#E8DCC8] text-xs">
              <span className="text-[#687C58] font-bold ml-2">اختر شخصاً للاستعراض:</span>
              <button
                onClick={() => setSelectedStoryPerson('salem')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  selectedStoryPerson === 'salem' ? 'bg-[#16382F] text-white' : 'bg-[#F8F5EE] text-[#202B26]'
                }`}
              >
                سالم بن متروك
              </button>
              <button
                onClick={() => setSelectedStoryPerson('mohammed')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  selectedStoryPerson === 'mohammed' ? 'bg-[#16382F] text-white' : 'bg-[#F8F5EE] text-[#202B26]'
                }`}
              >
                الجد محمد
              </button>
              <button
                onClick={() => setSelectedStoryPerson('fahad')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  selectedStoryPerson === 'fahad' ? 'bg-[#16382F] text-white' : 'bg-[#F8F5EE] text-[#202B26]'
                }`}
              >
                فهد بن سالم
              </button>
            </div>

            {/* Detailed Profile View */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#16382F] text-[#E8DCC8] flex items-center justify-center font-bold text-xl font-['Alexandria']">
                  {currentProfile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#16382F] font-['Alexandria']">
                    {currentProfile.name}
                  </h3>
                  <p className="text-xs text-[#687C58] mt-0.5">
                    {currentProfile.generation} • {currentProfile.years}
                  </p>
                </div>
              </div>

              {/* Biography Quote */}
              <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] text-xs text-[#202B26] leading-relaxed italic">
                "{currentProfile.bio}"
              </div>

              {/* Immediate Kin */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl bg-[#F8F5EE] border border-[#E8DCC8]">
                  <span className="text-[10px] text-[#687C58] block">الأب:</span>
                  <span className="font-bold text-[#16382F]">{currentProfile.kin.father}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8F5EE] border border-[#E8DCC8]">
                  <span className="text-[10px] text-[#687C58] block">الغصن العائلي:</span>
                  <span className="font-bold text-[#16382F]">{currentProfile.branch}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Text Argument (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 text-right">
            <span className="text-xs font-semibold tracking-wider text-[#687C58] uppercase font-['IBM_Plex_Sans_Arabic']">
              السيرة والذاكرة
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold font-['Alexandria'] text-[#16382F] leading-[1.25]">
              وراء كل اسم... <br />
              <span className="text-[#B59A6B]">حكاية.</span>
            </h2>

            <p className="text-base text-[#202B26]/80 leading-relaxed font-['IBM_Plex_Sans_Arabic']">
              شجرة العائلة ليست مجرد أسماء في مربعات؛ إنها سجل لسِيَر الرجال والنساء، مآثرهم، تواريخ ميلادهم، وإرثهم الذي تركوه لأبنائهم.
            </p>

            <button
              onClick={onExploreTree}
              className="px-6 py-3 rounded-full bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <span>فتح الشجرة التفاعلية الكاملة</span>
              <ArrowLeft className="w-4 h-4 text-[#B59A6B]" />
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};
