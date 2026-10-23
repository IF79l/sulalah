import React, { useState } from 'react';
import { Person, FamilyTree } from '../../types';
import { 
  GitBranch, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2,
  Info
} from 'lucide-react';

interface BranchSelectorProps {
  tree: FamilyTree;
  people: Person[];
  onSelectTarget: (branchRoot: Person, targetPerson: Person) => void;
  onCancel: () => void;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  tree,
  people,
  onSelectTarget,
  onCancel
}) => {
  const root = people.find(p => p.id === tree.rootAncestorId);
  const mainBranches = people.filter(p => p.fatherId === tree.rootAncestorId);

  const [selectedBranchRoot, setSelectedBranchRoot] = useState<Person | null>(mainBranches[0] || null);
  const [selectedTargetPerson, setSelectedTargetPerson] = useState<Person | null>(null);

  const branchMembers = selectedBranchRoot 
    ? people.filter(p => p.branchRootId === selectedBranchRoot.id || p.id === selectedBranchRoot.id)
    : [];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-right text-[#202B26] space-y-6 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F8F5EE] text-[#687C58] text-xs font-semibold border border-[#E8DCC8]">
          <GitBranch className="w-3.5 h-3.5 text-[#B59A6B]" />
          <span>المساهمة التشاركية في بناء شجرة العائلة</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold font-['Alexandria'] text-[#16382F]">
          اختر الغصن ونقطة الربط لعائلتك
        </h2>

        <p className="text-sm text-[#202B26]/80 leading-relaxed max-w-2xl">
          أهلاً بك في شجرة <span className="text-[#16382F] font-bold">{tree.name}</span>. 
          حدد الغصن العائلي الذي تنتمي إليه، ثم اختر الأب أو الشخص الذي ترغب في إضافة أفراد أسرتك تحته.
        </p>

        <div className="pt-2 text-xs text-[#687C58] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#B59A6B] shrink-0" />
          <span>الإضافات ستُرسل إلى مدقق الغصن لمراجعتها واعتمادها قبل ظهورها في الشجرة المعتمدة.</span>
        </div>
      </div>

      {/* Step 1: Select Main Branch */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2 font-['Alexandria']">
            <span className="w-6 h-6 rounded-full bg-[#16382F] text-[#E8DCC8] text-xs flex items-center justify-center font-bold">
              ١
            </span>
            <span>حدد الغصن العائلي الرئيسي:</span>
          </h3>
          <span className="text-xs text-[#687C58]">
            أبناء {root?.shortName || 'الجد الأساسي'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mainBranches.map(branch => {
            const isSelected = selectedBranchRoot?.id === branch.id;
            const count = people.filter(p => p.branchRootId === branch.id || p.id === branch.id).length;

            return (
              <button
                key={branch.id}
                onClick={() => {
                  setSelectedBranchRoot(branch);
                  setSelectedTargetPerson(null);
                }}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#16382F] text-[#F8F5EE] border-[#16382F] shadow-sm'
                    : 'bg-[#F8F5EE] text-[#202B26] border-[#E8DCC8] hover:border-[#B59A6B]'
                }`}
              >
                <div>
                  <span className={`text-[10px] block font-bold ${isSelected ? 'text-[#B59A6B]' : 'text-[#687C58]'}`}>
                    غصن رئيسي
                  </span>
                  <div className="text-sm font-bold mt-1 font-['Alexandria']">{branch.shortName}</div>
                </div>

                <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-xs opacity-80">
                  <span>{count} أفراد مسجلون</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B59A6B]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Select Insertion Point inside Branch */}
      {selectedBranchRoot && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2 font-['Alexandria']">
              <span className="w-6 h-6 rounded-full bg-[#16382F] text-[#E8DCC8] text-xs flex items-center justify-center font-bold">
                ٢
              </span>
              <span>اختر الشخص المراد إضافة العائلة تحته (الأب / الجد):</span>
            </h3>
            <span className="text-xs text-[#B59A6B] font-bold">
              غصن {selectedBranchRoot.shortName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
            {branchMembers.map(person => {
              const isSelected = selectedTargetPerson?.id === person.id;
              const kids = people.filter(p => p.fatherId === person.id);

              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedTargetPerson(person)}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#16382F] text-[#F8F5EE] border-[#16382F] shadow-xs ring-2 ring-[#B59A6B]'
                      : 'bg-[#F8F5EE] text-[#202B26] border-[#E8DCC8] hover:border-[#B59A6B]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{person.shortName}</div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#A5B39A]' : 'text-[#687C58]'}`}>
                      الجيل {person.generation} • {kids.length} أبناء مسجلون
                    </div>
                  </div>

                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B59A6B] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Breadcrumb Preview */}
          {selectedTargetPerson && (
            <div className="mt-4 p-4 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#16382F]">مسار النسب المختار:</span>
                <span className="text-[#687C58] font-semibold">
                  {root?.shortName} ← {selectedBranchRoot.shortName} ← {selectedTargetPerson.shortName}
                </span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#16382F] text-[#F8F5EE] font-bold">
                تم التحديد
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full text-xs font-semibold text-[#687C58] hover:text-[#16382F]"
        >
          إلغاء والعودة للشجرة
        </button>

        <button
          onClick={() => {
            if (selectedBranchRoot && selectedTargetPerson) {
              onSelectTarget(selectedBranchRoot, selectedTargetPerson);
            }
          }}
          disabled={!selectedBranchRoot || !selectedTargetPerson}
          className="px-8 py-3.5 rounded-full bg-[#16382F] hover:bg-[#202B26] disabled:opacity-50 text-[#F8F5EE] font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>المتابعة إلى مساحة بناء الغصن</span>
          <ArrowLeft className="w-4 h-4 text-[#B59A6B]" />
        </button>
      </div>

    </div>
  );
};
