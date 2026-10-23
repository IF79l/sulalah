import React, { useState } from 'react';
import { Person, Gender } from '../../types';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface AddRelativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPerson: Person | null;
  defaultType?: 'son' | 'daughter' | 'spouse';
  onSave: (data: {
    fullName: string;
    shortName: string;
    gender: Gender;
    relationType: 'son' | 'daughter' | 'spouse';
    birthYear?: number;
    deathYear?: number;
    isDeceased: boolean;
    occupation?: string;
    residence?: string;
    biography?: string;
  }) => void;
  planLimitExceeded?: boolean;
}

export const AddRelativeModal: React.FC<AddRelativeModalProps> = ({
  isOpen,
  onClose,
  targetPerson,
  defaultType = 'son',
  onSave,
  planLimitExceeded
}) => {
  const [relationType, setRelationType] = useState<'son' | 'daughter' | 'spouse'>(defaultType);
  const [shortName, setShortName] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [deathYear, setDeathYear] = useState<string>('');
  const [isDeceased, setIsDeceased] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [residence, setResidence] = useState('');
  const [biography, setBiography] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetPerson) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortName.trim()) {
      setError('يرجى إدخال اسم الفرد على الأقل.');
      return;
    }

    const gender: Gender = relationType === 'daughter' ? 'female' : relationType === 'spouse' ? (targetPerson.gender === 'male' ? 'female' : 'male') : 'male';
    const finalFullName = fullName.trim() || `${shortName.trim()} بن ${targetPerson.shortName}`;

    onSave({
      shortName: shortName.trim(),
      fullName: finalFullName,
      gender,
      relationType,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      deathYear: isDeceased && deathYear ? parseInt(deathYear) : undefined,
      isDeceased,
      occupation: occupation.trim() || undefined,
      residence: residence.trim() || undefined,
      biography: biography.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 text-right">
      <div className="w-full max-w-lg bg-white border border-[#E8DCC8] rounded-3xl shadow-2xl overflow-hidden text-[#202B26] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E8DCC8] flex items-center justify-between bg-[#F8F5EE]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#16382F] text-[#E8DCC8] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#16382F] font-['Alexandria']">إضافة فرد مرتبط</h3>
              <p className="text-xs text-[#687C58]">
                ربط مباشر بالشخص: <span className="text-[#16382F] font-bold">{targetPerson.shortName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#687C58] hover:text-[#16382F]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {planLimitExceeded && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>تحذير: شجرتك تقترب من الحد الأقصى للباقة الحالية.</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Relation Type Selector */}
          <div>
            <label className="text-xs font-bold text-[#16382F] block mb-1.5">نوع العلاقة:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRelationType('son')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  relationType === 'son'
                    ? 'bg-[#16382F] text-white shadow-xs'
                    : 'bg-[#F8F5EE] text-[#202B26] border border-[#E8DCC8]'
                }`}
              >
                ابن
              </button>
              <button
                type="button"
                onClick={() => setRelationType('daughter')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  relationType === 'daughter'
                    ? 'bg-[#16382F] text-white shadow-xs'
                    : 'bg-[#F8F5EE] text-[#202B26] border border-[#E8DCC8]'
                }`}
              >
                ابنة
              </button>
              <button
                type="button"
                onClick={() => setRelationType('spouse')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  relationType === 'spouse'
                    ? 'bg-[#16382F] text-white shadow-xs'
                    : 'bg-[#F8F5EE] text-[#202B26] border border-[#E8DCC8]'
                }`}
              >
                {targetPerson.gender === 'male' ? 'زوجة' : 'زوج'}
              </button>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#687C58] block mb-1">الاسم المختصر (مطلوب):</label>
              <input
                type="text"
                placeholder="مثال: خالد"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs text-[#687C58] block mb-1">الاسم الكامل (اختياري):</label>
              <input
                type="text"
                placeholder="مثال: خالد بن سالم آل محمد"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none"
              />
            </div>
          </div>

          {/* Birth & Death Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#687C58] block mb-1">سنة الميلاد (ميلادي):</label>
              <input
                type="number"
                placeholder="مثال: 1995"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202B26] pb-2">
                <input
                  type="checkbox"
                  checked={isDeceased}
                  onChange={(e) => setIsDeceased(e.target.checked)}
                  className="rounded border-[#E8DCC8] text-[#16382F] focus:ring-[#16382F]"
                />
                <span>متوفى (رحمه الله)</span>
              </label>

              {isDeceased && (
                <input
                  type="number"
                  placeholder="سنة الوفاة (مثال: 2020)"
                  value={deathYear}
                  onChange={(e) => setDeathYear(e.target.value)}
                  className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-1.5 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Residence & Occupation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#687C58] block mb-1">مدينة الإقامة:</label>
              <input
                type="text"
                placeholder="مثال: الرياض"
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#687C58] block mb-1">المهنة أو التخصص:</label>
              <input
                type="text"
                placeholder="مثال: طبيب استشاري"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none"
              />
            </div>
          </div>

          {/* Biography */}
          <div>
            <label className="text-xs text-[#687C58] block mb-1">نبذة تعريفية:</label>
            <textarea
              rows={2}
              placeholder="اكتب نبذة مختصرة عن هذا الفرد ومآثره..."
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl p-3 text-xs text-[#202B26] focus:border-[#B59A6B] focus:outline-none resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-[#E8DCC8] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs text-[#687C58] hover:text-[#16382F]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] font-bold text-xs shadow-sm transition-all"
            >
              حفظ وإضافة للشجرة
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
