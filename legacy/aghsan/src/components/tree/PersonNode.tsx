import React from 'react';
import { Person } from '../../types';
import { ChevronDown, ChevronUp, User, Plus, Eye } from 'lucide-react';

interface PersonNodeProps {
  person: Person;
  isSelected: boolean;
  isSearchMatch: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  childCount: number;
  hiddenDescendantCount: number;
  onSelect: (person: Person) => void;
  onToggleExpand: (personId: string) => void;
  onAddRelative?: (person: Person) => void;
}

export const PersonNode: React.FC<PersonNodeProps> = ({
  person,
  isSelected,
  isSearchMatch,
  hasChildren,
  isExpanded,
  childCount,
  hiddenDescendantCount,
  onSelect,
  onToggleExpand,
  onAddRelative
}) => {
  const isMale = person.gender === 'male';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(person);
      }}
      className={`relative w-[210px] rounded-2xl cursor-pointer select-none transition-all duration-200 group text-right ${
        isSelected
          ? 'bg-white ring-2 ring-[#B59A6B] shadow-xl scale-[1.03] z-20'
          : isSearchMatch
          ? 'bg-white ring-2 ring-amber-500 shadow-lg animate-pulse z-20'
          : 'bg-white/95 hover:bg-white hover:scale-[1.02] hover:shadow-md shadow-xs z-10 border border-[#E8DCC8]'
      }`}
    >
      {/* Top Generation & Status Bar */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-[10px] text-[#687C58]">
        <span className="font-medium">الجيل {person.generation}</span>
        <div className="flex items-center gap-1.5">
          {person.isDeceased && (
            <span className="text-[9px] text-[#A5B39A]">رحمه الله</span>
          )}
          <span className={`w-1.5 h-1.5 rounded-full ${isMale ? 'bg-[#687C58]' : 'bg-rose-400'}`} />
        </div>
      </div>

      {/* Main Identity Area */}
      <div className="px-3.5 pb-3 pt-1 flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-['Alexandria'] ${
          isMale 
            ? 'bg-[#16382F] text-[#E8DCC8]' 
            : 'bg-[#5C3D38] text-[#F8F5EE]'
        }`}>
          {person.shortName ? person.shortName.charAt(0) : <User className="w-4 h-4" />}
        </div>

        <div className="overflow-hidden min-w-0">
          <h4 className="text-xs font-bold text-[#16382F] truncate leading-tight group-hover:text-[#B59A6B] transition-colors">
            {person.shortName || person.fullName}
          </h4>
          <p className="text-[10px] text-[#687C58] truncate mt-0.5">
            {person.birthYear ? `مواليد ${person.birthYear} م` : (person.occupation || 'عضو موثق')}
          </p>
        </div>
      </div>

      {/* Bottom Sub-bar with Children & Hover Actions */}
      <div className="px-3.5 py-1.5 border-t border-[#E8DCC8]/60 flex items-center justify-between text-[10px] text-[#687C58]">
        <span>{childCount > 0 ? `${childCount} أبناء` : 'بدون أبناء'}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAddRelative && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddRelative(person);
              }}
              title="إضافة ابن / زوجة"
              className="p-1 rounded-md hover:bg-[#F8F5EE] text-[#16382F] transition-colors"
            >
              <Plus className="w-3 h-3 text-[#B59A6B]" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(person);
            }}
            title="عرض الملف"
            className="p-1 rounded-md hover:bg-[#F8F5EE] text-[#16382F] transition-colors"
          >
            <Eye className="w-3 h-3 text-[#687C58]" />
          </button>
        </div>
      </div>

      {/* Expand / Collapse Button */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(person.id);
          }}
          className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all flex items-center gap-0.5 shadow-xs z-30 ${
            isExpanded
              ? 'bg-white text-[#687C58] border-[#E8DCC8] hover:bg-[#F8F5EE]'
              : 'bg-[#B59A6B] text-[#16382F] border-white shadow-xs'
          }`}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-2.5 h-2.5" />
              <span>طي</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-2.5 h-2.5" />
              <span>+{hiddenDescendantCount || childCount}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
