import React from 'react';
import { Person } from '../../types';
import { 
  X, 
  User, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Heart, 
  Users, 
  Plus, 
  GitBranch, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface PersonProfileDrawerProps {
  person: Person | null;
  people: Person[];
  onClose: () => void;
  onSelectPerson: (person: Person) => void;
  onAddRelative: (person: Person, defaultType?: 'son' | 'daughter' | 'spouse') => void;
  onProposeBranch: (person: Person) => void;
}

export const PersonProfileDrawer: React.FC<PersonProfileDrawerProps> = ({
  person,
  people,
  onClose,
  onSelectPerson,
  onAddRelative,
  onProposeBranch
}) => {
  if (!person) return null;

  const isMale = person.gender === 'male';

  // Relatives
  const father = person.fatherId ? people.find(p => p.id === person.fatherId) : null;
  const mother = person.motherId ? people.find(p => p.id === person.motherId) : null;
  const spouses = (person.spouseIds || [])
    .map(sId => people.find(p => p.id === sId))
    .filter(Boolean) as Person[];
  const children = people.filter(p => p.fatherId === person.id || p.motherId === person.id);

  // Lineage trail
  const getLineage = (curr: Person): Person[] => {
    const list: Person[] = [curr];
    let parentId = curr.fatherId;
    while (parentId) {
      const p = people.find(x => x.id === parentId);
      if (p) {
        list.unshift(p);
        parentId = p.fatherId;
      } else {
        break;
      }
    }
    return list;
  };

  const lineage = getLineage(person);

  return (
    <div className="fixed inset-y-0 left-0 w-full sm:w-[420px] bg-white border-r border-[#E8DCC8] shadow-2xl z-50 flex flex-col text-[#202B26] animate-in slide-in-from-left duration-300">
      
      {/* Drawer Header */}
      <div className="p-6 border-b border-[#E8DCC8] flex items-center justify-between bg-[#F8F5EE]">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg font-['Alexandria'] ${
            isMale 
              ? 'bg-[#16382F] text-[#E8DCC8]' 
              : 'bg-[#5C3D38] text-[#F8F5EE]'
          }`}>
            {person.shortName ? person.shortName.charAt(0) : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-[#687C58] font-semibold border border-[#E8DCC8]">
                الجيل {person.generation}
              </span>
              <span className="text-xs text-[#687C58] font-medium">
                {isMale ? 'ذكر' : 'أنثى'}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#16382F] mt-0.5 leading-tight font-['Alexandria']">
              {person.shortName || person.fullName}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white text-[#687C58] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Full Name & Status Card */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#E8DCC8] space-y-3">
          <div>
            <span className="text-xs text-[#687C58] block">الاسم الكامل المعتمد:</span>
            <p className="text-sm font-bold text-[#16382F] leading-relaxed mt-0.5">{person.fullName}</p>
          </div>

          {/* Lineage Trail */}
          <div className="pt-2 border-t border-[#E8DCC8]/60">
            <span className="text-xs text-[#B59A6B] block mb-1 font-semibold">تسلسل النسب:</span>
            <div className="flex items-center gap-1 flex-wrap text-xs text-[#202B26]">
              {lineage.map((anc, idx) => (
                <React.Fragment key={anc.id}>
                  <button
                    onClick={() => onSelectPerson(anc)}
                    className="hover:text-[#B59A6B] hover:underline font-medium"
                  >
                    {anc.shortName}
                  </button>
                  {idx < lineage.length - 1 && <ChevronRight className="w-3 h-3 text-[#B59A6B]" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Vital Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC8] space-y-1">
            <span className="text-[#687C58] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#B59A6B]" />
              سنة الميلاد
            </span>
            <p className="font-bold text-[#16382F]">
              {person.birthYear ? `${person.birthYear} م` : 'غير مسجل'}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC8] space-y-1">
            <span className="text-[#687C58] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B59A6B]" />
              الحالة
            </span>
            <p className="font-bold text-[#16382F]">
              {person.isDeceased ? `متوفى (${person.deathYear || ''} م)` : 'على قيد الحياة'}
            </p>
          </div>

          {person.occupation && (
            <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC8] space-y-1">
              <span className="text-[#687C58] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#B59A6B]" />
                المهنة
              </span>
              <p className="font-bold text-[#16382F] truncate">{person.occupation}</p>
            </div>
          )}

          {person.residence && (
            <div className="bg-white p-3.5 rounded-xl border border-[#E8DCC8] space-y-1">
              <span className="text-[#687C58] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#B59A6B]" />
                الإقامة
              </span>
              <p className="font-bold text-[#16382F] truncate">{person.residence}</p>
            </div>
          )}
        </div>

        {/* Biography */}
        {person.biography && (
          <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#E8DCC8] space-y-1.5">
            <h4 className="text-xs font-bold text-[#B59A6B]">سيرة الفرد ومآثره:</h4>
            <p className="text-xs text-[#202B26]/85 leading-relaxed">{person.biography}</p>
          </div>
        )}

        {/* Family Connections Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#16382F] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B59A6B]" />
            القرابات المباشرة:
          </h4>

          {/* Parents */}
          <div className="space-y-1.5">
            <span className="text-xs text-[#687C58]">الوالدان:</span>
            <div className="grid grid-cols-2 gap-2">
              {father ? (
                <button
                  onClick={() => onSelectPerson(father)}
                  className="p-2.5 rounded-xl bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-right text-xs transition-colors"
                >
                  <span className="text-[10px] text-[#687C58] block">الأب:</span>
                  <span className="font-bold text-[#16382F]">{father.shortName}</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#F8F5EE] border border-dashed border-[#E8DCC8] text-right text-xs text-[#687C58]">
                  الأب غير مسجل
                </div>
              )}

              {mother ? (
                <button
                  onClick={() => onSelectPerson(mother)}
                  className="p-2.5 rounded-xl bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-right text-xs transition-colors"
                >
                  <span className="text-[10px] text-[#687C58] block">الأم:</span>
                  <span className="font-bold text-[#16382F]">{mother.shortName}</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#F8F5EE] border border-dashed border-[#E8DCC8] text-right text-xs text-[#687C58]">
                  الأم غير مسجلة
                </div>
              )}
            </div>
          </div>

          {/* Spouses */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#687C58]">
                {isMale ? 'الزوجات' : 'الزوج'}:
              </span>
              <button
                onClick={() => onAddRelative(person, 'spouse')}
                className="text-[11px] text-[#B59A6B] hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة</span>
              </button>
            </div>
            {spouses.length > 0 ? (
              <div className="space-y-1.5">
                {spouses.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => onSelectPerson(sp)}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-right text-xs flex items-center justify-between transition-colors"
                  >
                    <span className="font-bold text-[#16382F]">{sp.fullName}</span>
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#687C58] italic">لا يوجد أزواج مسجلون.</p>
            )}
          </div>

          {/* Children */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#687C58]">
                الأبناء ({children.length}):
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAddRelative(person, 'son')}
                  className="text-[11px] text-[#16382F] hover:underline flex items-center gap-0.5 font-semibold"
                >
                  <Plus className="w-3 h-3 text-[#B59A6B]" />
                  <span>ابن</span>
                </button>
                <button
                  onClick={() => onAddRelative(person, 'daughter')}
                  className="text-[11px] text-[#16382F] hover:underline flex items-center gap-0.5 font-semibold"
                >
                  <Plus className="w-3 h-3 text-rose-500" />
                  <span>ابنة</span>
                </button>
              </div>
            </div>

            {children.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => onSelectPerson(child)}
                    className="p-2.5 rounded-xl bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-right text-xs transition-colors"
                  >
                    <span className="font-bold text-[#16382F] block truncate">{child.shortName}</span>
                    <span className="text-[10px] text-[#687C58]">
                      {child.gender === 'male' ? 'ابن' : 'ابنة'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#687C58] italic">لا يوجد أبناء مسجلون بعد.</p>
            )}
          </div>

        </div>

      </div>

      {/* Drawer Action Buttons */}
      <div className="p-4 border-t border-[#E8DCC8] bg-[#F8F5EE] space-y-2">
        <button
          onClick={() => onProposeBranch(person)}
          className="w-full py-3 rounded-full bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          <GitBranch className="w-4 h-4 text-[#B59A6B]" />
          <span>المساهمة وبناء غصن عائلي تحت هذا الفرد</span>
        </button>
      </div>

    </div>
  );
};
