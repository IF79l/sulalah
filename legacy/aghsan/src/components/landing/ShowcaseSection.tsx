import React, { useState } from 'react';
import { 
  GitBranch, 
  Plus, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  ShieldAlert, 
  UserPlus, 
  ChevronRight,
  Info
} from 'lucide-react';

interface DemoProposedPerson {
  id: string;
  name: string;
  relation: string;
  parentId: string;
}

export const ShowcaseSection: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<'matrook' | 'dayfallah'>('matrook');
  const [targetParent, setTargetParent] = useState<string>('salem');
  const [proposedList, setProposedList] = useState<DemoProposedPerson[]>([
    { id: 'dp-1', name: 'سلطان بن سالم', relation: 'ابن', parentId: 'salem' },
    { id: 'dp-2', name: 'شهد بنت سالم', relation: 'ابنة', parentId: 'salem' }
  ]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRelation, setNewPersonRelation] = useState<'ابن' | 'ابنة' | 'زوجة'>('ابن');
  const [submitted, setSubmitted] = useState(false);

  const handleAddProposed = () => {
    if (!newPersonName.trim()) return;
    const newItem: DemoProposedPerson = {
      id: `dp-${Date.now()}`,
      name: newPersonName.trim(),
      relation: newPersonRelation,
      parentId: targetParent
    };
    setProposedList([...proposedList, newItem]);
    setNewPersonName('');
    setSubmitted(false);
  };

  const handleRemoveProposed = (id: string) => {
    setProposedList(proposedList.filter(p => p.id !== id));
  };

  const handleSubmitDemo = () => {
    setSubmitted(true);
  };

  return (
    <section className="py-24 bg-[#102B24] text-[#F7F5EF] relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs sm:text-sm font-bold text-[#C9A66B] px-3.5 py-1.5 rounded-full bg-[#244B3D] border border-[#C9A66B]/30">
            تجربة تفاعلية لمحاكاة المساهمة
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-['Alexandria'] text-[#F7F5EF]">
            كيف يضيف أفراد العائلة أغصانهم؟
          </h2>
          <p className="text-base sm:text-lg text-[#EAE6DC]/80">
            جرّب بنفسك: اختر الغصن، حدد الأب، أضف الأفراد في الشجرة المؤقتة، وأرسلها للمراجعة!
          </p>
        </div>

        {/* Workspace Simulator Box */}
        <div className="bg-[#183a30] rounded-3xl border border-[#C9A66B]/40 shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          
          {/* Step 1 & 2 Selector Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-[#244B3D]">
            
            {/* Branch selector */}
            <div>
              <label className="text-xs font-bold text-[#C9A66B] block mb-2">
                ١. اختر الغصن العائلي:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBranch('matrook')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    selectedBranch === 'matrook'
                      ? 'bg-[#C9A66B] text-[#102B24]'
                      : 'bg-[#102B24] text-[#EAE6DC] border border-[#244B3D]'
                  }`}
                >
                  فرع متروك بن محمد
                </button>
                <button
                  onClick={() => setSelectedBranch('dayfallah')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    selectedBranch === 'dayfallah'
                      ? 'bg-[#C9A66B] text-[#102B24]'
                      : 'bg-[#102B24] text-[#EAE6DC] border border-[#244B3D]'
                  }`}
                >
                  فرع ضيف الله
                </button>
              </div>
            </div>

            {/* Target Person */}
            <div>
              <label className="text-xs font-bold text-[#C9A66B] block mb-2">
                ٢. حدد الأب / نقطة الربط:
              </label>
              <select
                value={targetParent}
                onChange={(e) => setTargetParent(e.target.value)}
                className="w-full bg-[#102B24] border border-[#244B3D] text-[#F7F5EF] text-xs font-bold py-2.5 px-3 rounded-xl focus:border-[#C9A66B] focus:outline-none"
              >
                {selectedBranch === 'matrook' ? (
                  <>
                    <option value="salem">سالم بن متروك</option>
                    <option value="ahmed">أحمد بن متروك</option>
                  </>
                ) : (
                  <>
                    <option value="saad">سعد بن ضيف الله</option>
                    <option value="majed">ماجد بن ضيف الله</option>
                  </>
                )}
              </select>
            </div>

            {/* Live Status indicator */}
            <div className="flex flex-col justify-end">
              <div className="bg-[#102B24] px-4 py-2 rounded-xl border border-[#244B3D] text-xs text-[#8BA58B] flex items-center justify-between">
                <span>المسار الجيني:</span>
                <span className="font-bold text-[#F7F5EF]">
                  الجد محمد ← {selectedBranch === 'matrook' ? 'متروك' : 'ضيف الله'} ← {targetParent === 'salem' ? 'سالم' : targetParent === 'ahmed' ? 'أحمد' : 'سعد'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Canvas Area */}
          <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Visual Tree with Approved Node & Proposed Gold Nodes */}
            <div className="lg:col-span-7 bg-[#102B24] p-6 rounded-2xl border border-[#244B3D] relative min-h-[300px] flex flex-col items-center justify-center">
              
              <div className="absolute top-3 right-4 flex items-center gap-2 text-[11px] text-[#8BA58B]">
                <Info className="w-3.5 h-3.5 text-[#C9A66B]" />
                <span>الأخضر: معتمد • الذهبي المنقط: إضافات جديدة بانتظار الاعتماد</span>
              </div>

              {/* Target Approved Node */}
              <div className="flex flex-col items-center mt-4">
                <div className="px-5 py-2.5 rounded-2xl bg-[#244B3D] border border-emerald-500/40 text-[#F7F5EF] text-center shadow-md">
                  <div className="text-[10px] text-emerald-300">فرد معتمد في الشجرة</div>
                  <div className="text-sm font-bold">
                    {targetParent === 'salem' ? 'سالم بن متروك' : targetParent === 'ahmed' ? 'أحمد بن متروك' : 'سعد بن ضيف الله'}
                  </div>
                </div>

                {/* Connecting branch line */}
                <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500/40 to-[#C9A66B] my-1" />
              </div>

              {/* Proposed Children Row */}
              <div className="flex flex-wrap items-center justify-center gap-3 relative max-w-lg">
                {proposedList.map((p) => (
                  <div
                    key={p.id}
                    className="group relative px-4 py-2.5 rounded-xl bg-[#C9A66B]/15 border-2 border-dashed border-[#C9A66B] text-[#F7F5EF] text-center transition-all animate-in fade-in zoom-in-95"
                  >
                    <div className="text-[10px] text-[#C9A66B] font-bold">
                      {p.relation} (مقترح جديد)
                    </div>
                    <div className="text-xs font-bold text-white">{p.name}</div>
                    
                    {/* Delete button on hover */}
                    <button
                      onClick={() => handleRemoveProposed(p.id)}
                      className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="حذف"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {proposedList.length === 0 && (
                  <div className="text-xs text-[#8BA58B] italic p-4">
                    لا توجد إضافات بعد. استخدم النموذج لإضافة الأبناء.
                  </div>
                )}
              </div>

            </div>

            {/* Quick Add Form & Submit Simulator */}
            <div className="lg:col-span-5 bg-[#102B24] p-6 rounded-2xl border border-[#244B3D] space-y-4">
              <h4 className="text-sm font-bold text-[#F7F5EF] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#C9A66B]" />
                إضافة فرد جديد تحت الغصن:
              </h4>

              <div>
                <label className="text-xs text-[#EAE6DC] block mb-1">الاسم الرباعي أو الثلاثي:</label>
                <input
                  type="text"
                  placeholder="مثال: سلمان بن سالم بن متروك"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProposed()}
                  className="w-full bg-[#183a30] border border-[#244B3D] rounded-xl px-3 py-2 text-xs text-white placeholder-[#8BA58B] focus:border-[#C9A66B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#EAE6DC] block mb-1">نوع العلاقة بالأب المحدد:</label>
                <div className="flex gap-2">
                  {(['ابن', 'ابنة', 'زوجة'] as const).map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => setNewPersonRelation(rel)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        newPersonRelation === rel
                          ? 'bg-[#C9A66B] text-[#102B24] font-bold'
                          : 'bg-[#183a30] text-[#EAE6DC] border border-[#244B3D]'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddProposed}
                disabled={!newPersonName.trim()}
                className="w-full py-2.5 rounded-xl bg-[#244B3D] hover:bg-[#2e5d4c] disabled:opacity-50 text-[#F7F5EF] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#C9A66B]" />
                إدراج في شجرة المساهمة
              </button>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-[#244B3D]">
                {submitted ? (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>تم إرسال الإضافات بنجاح للمدقق! رقم الطلب التجريبي: #AGH-DEMO-891</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitDemo}
                    disabled={proposedList.length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A66B] to-[#b89355] disabled:opacity-50 text-[#102B24] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    إرسال الإضافات للمراجعة والاعتماد ({proposedList.length} أفراد)
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
