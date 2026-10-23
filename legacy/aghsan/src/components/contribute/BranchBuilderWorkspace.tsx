import React, { useState } from 'react';
import { Person, ProposedPerson, ProposedRelationship, Gender } from '../../types';
import { 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  Info, 
  UserPlus, 
  Users, 
  GitBranch, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BranchBuilderWorkspaceProps {
  treeName: string;
  branchRoot: Person;
  targetPerson: Person;
  contributorDefaultName?: string;
  onSubmitContribution: (data: {
    contributorName: string;
    contributorEmail?: string;
    contributorPhone?: string;
    notes?: string;
    proposedPeople: ProposedPerson[];
    proposedRelationships: ProposedRelationship[];
  }) => void;
  onCancel: () => void;
}

export const BranchBuilderWorkspace: React.FC<BranchBuilderWorkspaceProps> = ({
  treeName,
  branchRoot,
  targetPerson,
  contributorDefaultName = '',
  onSubmitContribution,
  onCancel
}) => {
  // Contributor info
  const [contributorName, setContributorName] = useState(contributorDefaultName || '');
  const [contributorPhone, setContributorPhone] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Proposed nodes state (supports multi-generation)
  const [proposedPeople, setProposedPeople] = useState<ProposedPerson[]>([
    {
      tempId: `prop-${Date.now()}-1`,
      fullName: '',
      shortName: '',
      gender: 'male',
      relativeToId: targetPerson.id,
      relationship: 'son'
    }
  ]);

  // Form inputs for adding a person
  const [activeParentId, setActiveParentId] = useState<string>(targetPerson.id);
  const [newShortName, setNewShortName] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('male');
  const [newRelationship, setNewRelationship] = useState<'son' | 'daughter' | 'spouse'>('son');
  const [newBirthYear, setNewBirthYear] = useState<string>('');
  const [newBio, setNewBio] = useState('');

  // Submission Status
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Available parent targets for multi-generation
  const availableParents = [
    { id: targetPerson.id, name: `${targetPerson.shortName} (فرد معتمد في الشجرة)` },
    ...proposedPeople
      .filter(p => p.shortName.trim().length > 0 && p.relationship !== 'spouse')
      .map(p => ({ id: p.tempId, name: `${p.shortName} (مقترح جديد في هذا الطلب)` }))
  ];

  // Add a new proposed node
  const handleAddPerson = () => {
    if (!newShortName.trim()) {
      setValidationError('يرجى كتابة اسم الفرد على الأقل.');
      return;
    }

    const tempId = `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const full = newFullName.trim() || `${newShortName.trim()} بن ${targetPerson.shortName}`;

    const newPerson: ProposedPerson = {
      tempId,
      shortName: newShortName.trim(),
      fullName: full,
      gender: newGender,
      relativeToId: activeParentId,
      relationship: newRelationship,
      birthYear: newBirthYear ? parseInt(newBirthYear) : undefined,
      biography: newBio.trim() || undefined
    };

    setProposedPeople(prev => [...prev, newPerson]);
    setNewShortName('');
    setNewFullName('');
    setNewBirthYear('');
    setNewBio('');
    setValidationError(null);
  };

  // Remove proposed person (and cascades any dependent proposed children)
  const handleRemovePerson = (tempId: string) => {
    const dependentIds = new Set<string>([tempId]);
    let added = true;
    while (added) {
      added = false;
      proposedPeople.forEach(p => {
        if (dependentIds.has(p.relativeToId) && !dependentIds.has(p.tempId)) {
          dependentIds.add(p.tempId);
          added = true;
        }
      });
    }
    setProposedPeople(prev => prev.filter(p => !dependentIds.has(p.tempId)));
  };

  // Submit all proposed people
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributorName.trim()) {
      setValidationError('يرجى إدخال اسمك الكريم كصاحب للمساهمة.');
      return;
    }

    const validPeople = proposedPeople.filter(p => p.shortName.trim().length > 0);
    if (validPeople.length === 0) {
      setValidationError('يرجى إضافة فرد واحد على الأقل مع كتابة اسمه.');
      return;
    }

    // Build proposed relationships
    const relationships: ProposedRelationship[] = validPeople.map(p => ({
      sourceTempId: p.tempId,
      targetId: p.relativeToId,
      type: p.relationship === 'spouse' ? 'marriage' : 'parent_child'
    }));

    onSubmitContribution({
      contributorName: contributorName.trim(),
      contributorPhone: contributorPhone.trim() || undefined,
      notes: submissionNotes.trim() || undefined,
      proposedPeople: validPeople,
      proposedRelationships: relationships
    });

    const mockId = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedRequestId(mockId);
    setIsSubmitted(true);
  };

  // Success view
  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-12 text-center text-[#202B26] animate-in zoom-in-95 duration-300">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8DCC8] shadow-[0_16px_40px_rgba(22,56,47,0.06)] space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#16382F]/10 text-[#16382F] mx-auto flex items-center justify-center border border-[#16382F]/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B59A6B]/15 text-[#8C6D3B] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تم استلام المساهمة بنجاح</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-['Alexandria'] text-[#16382F]">
            شكرًا لك يا {contributorName}
          </h2>

          <p className="text-sm sm:text-base text-[#4A5D53] max-w-lg mx-auto leading-relaxed">
            تم تسجيل مقترحك لإضافة ({proposedPeople.filter(p => p.shortName).length} أفراد) تحت غصن{' '}
            <span className="text-[#16382F] font-bold">«{branchRoot.shortName}»</span>، وهي الآن محفوظة في سجل المراجعة بانتظار اعتماد المدقق المعتمد.
          </p>

          <div className="bg-[#F8F5EE] p-5 rounded-2xl border border-[#E8DCC8] max-w-sm mx-auto text-xs space-y-1.5">
            <div className="text-[#687C58]">رقم مرجع الطلب التوثيقي:</div>
            <div className="font-mono text-base font-bold text-[#16382F] tracking-wider">{submittedRequestId}</div>
            <div className="text-[11px] text-[#8C6D3B] pt-1 font-medium flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>الحالة: قيد المراجعة والتدقيق</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={onCancel}
              className="px-8 py-3.5 rounded-full bg-[#16382F] hover:bg-[#20493E] text-[#F8F5EE] font-medium text-sm shadow-md transition-all"
            >
              العودة إلى الشجرة التفاعلية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-right text-[#202B26] space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C6D3B] font-semibold mb-1.5">
            <GitBranch className="w-4 h-4 text-[#B59A6B]" />
            <span>مساحة بناء الغصن التشاركية • إضافة متعددة الأجيال</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            إضافة أفراد الأسرة تحت: {targetPerson.shortName}
          </h2>
          <p className="text-xs text-[#687C58] mt-1">
            الغصن: {branchRoot.shortName} • الشجرة: {treeName}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-full border border-[#E8DCC8] hover:bg-[#F8F5EE] text-xs font-semibold text-[#4A5D53] transition-colors"
        >
          إلغاء والعودة
        </button>
      </div>

      {validationError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Grid: Form on Right, Live Interactive Tree on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side (7 cols): Proposed Tree Visualizer */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8DCC8]">
            <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B59A6B]" />
              <span>معاينة الغصن المقترح:</span>
            </h3>
            <span className="text-xs px-3 py-1 rounded-full bg-[#B59A6B]/15 text-[#8C6D3B] font-semibold border border-[#B59A6B]/30">
              {proposedPeople.filter(p => p.shortName).length} أفراد مضافون
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] text-xs text-[#4A5D53] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#B59A6B] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              الإضافات ذات الإطار المنقط هي مقترحات جديدة ستحفظ بصيغة مسودة مراجعة ولن تندمج بالشجرة الرسمية إلا بعد موافقة المدقق.
            </span>
          </div>

          {/* Organic Botanical Branch Rendering Box */}
          <div className="bg-[#FAF8F3] p-6 rounded-3xl border border-[#E8DCC8] min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            
            {/* Atmospheric Background glow */}
            <div className="absolute inset-0 pointer-events-none bg-radial from-amber-100/30 to-transparent" />

            {/* Botanical SVG Connecting Twigs */}
            <svg className="w-full h-36 overflow-visible pointer-events-none mb-2">
              <defs>
                <linearGradient id="workspaceBranchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#42382C" />
                  <stop offset="100%" stopColor="#B59A6B" />
                </linearGradient>
              </defs>

              {/* Main parent bough stem */}
              <path
                d="M 50% 10 C 50% 50, 50% 70, 50% 90"
                stroke="#42382C"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
              />

              {/* Spreading twigs to each proposed child */}
              {proposedPeople.map((_, pIdx) => {
                const total = proposedPeople.length;
                const spreadPercent = total > 1 ? (pIdx / (total - 1) - 0.5) * 80 : 0;
                return (
                  <path
                    key={pIdx}
                    d={`M 50% 70 Q ${50 + spreadPercent * 0.5}% 95, ${50 + spreadPercent}% 130`}
                    stroke="#B59A6B"
                    strokeWidth="6"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    fill="none"
                  />
                );
              })}
            </svg>

            {/* Approved Target Node Anchor */}
            <div className="relative z-10 px-6 py-3 rounded-full bg-[#16382F] text-white text-center shadow-md border-2 border-[#B59A6B]">
              <span className="text-[10px] text-[#B59A6B] block font-medium">الغصن المعتمد</span>
              <span className="text-sm font-bold font-['Alexandria']">{targetPerson.shortName}</span>
            </div>

            {/* Proposed Children Sprouting Leaves Row */}
            <div className="relative z-10 flex flex-wrap items-start justify-center gap-4 mt-6 max-w-xl">
              {proposedPeople.map((person) => (
                <div
                  key={person.tempId}
                  className="relative p-3.5 rounded-2xl bg-white border-2 border-dashed border-[#B59A6B] text-[#202B26] text-center w-48 shadow-sm hover:shadow-md transition-all group animate-in zoom-in-95"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleRemovePerson(person.tempId)}
                    title="حذف هذا الفرد"
                    className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs shadow-sm opacity-80 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>

                  <div className="flex items-center justify-between text-[10px] text-[#8C6D3B] font-semibold mb-1.5">
                    <span>{person.relationship === 'son' ? 'ابن' : person.relationship === 'daughter' ? 'ابنة' : 'زوجة'}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#B59A6B]/20 text-[#8C6D3B] font-bold">
                      غصن نامٍ
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="اسم الفرد (مثال: فهد)"
                    value={person.shortName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProposedPeople(prev => prev.map(p => p.tempId === person.tempId ? { ...p, shortName: val } : p));
                    }}
                    className="w-full bg-[#FAF8F3] border border-[#E8DCC8] rounded-xl px-2.5 py-1 text-xs text-[#16382F] text-center font-bold focus:border-[#16382F] focus:outline-none mb-1.5"
                  />

                  <div className="text-[10px] text-[#687C58] truncate">
                    {person.birthYear ? `مواليد ${person.birthYear} م` : 'سنة الميلاد غير محددة'}
                  </div>

                  {/* Add child under THIS proposed node (Multi-generation!) */}
                  {person.relationship !== 'spouse' && (
                    <button
                      onClick={() => {
                        setActiveParentId(person.tempId);
                        setNewRelationship('son');
                      }}
                      className="mt-2 w-full py-1.5 rounded-xl bg-[#F8F5EE] hover:bg-[#16382F] hover:text-white text-[10px] font-semibold text-[#16382F] border border-[#E8DCC8] transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-[#B59A6B]" />
                      <span>تفريغ حفيد تحته</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>

          {/* Submission Notes */}
          <div>
            <label className="text-xs font-semibold text-[#16382F] block mb-1.5">
              ملاحظات للمدقق (مصادر التوثيق أو توضيحات إضافية):
            </label>
            <textarea
              rows={2}
              placeholder="اكتب أي ملاحظة تود إيصالها للمدقق لتسهيل التحقق والاعتماد..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-2xl p-3 text-xs text-[#202B26] focus:border-[#16382F] focus:outline-none resize-none"
            />
          </div>

        </div>

        {/* Right Side (5 cols): Add Person Form & Contributor Details */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Contributor Identity Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-4">
            <h3 className="text-sm font-bold text-[#16382F] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#B59A6B]" />
              <span>بيانات مقدم المساهمة:</span>
            </h3>

            <div>
              <label className="text-xs text-[#4A5D53] block mb-1.5">اسمك الكريم (مطلوب):</label>
              <input
                type="text"
                placeholder="مثال: فهد بن سالم آل محمد"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] font-bold focus:border-[#16382F] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-[#4A5D53] block mb-1.5">رقم الجوال أو واتساب (اختياري للتواصل):</label>
              <input
                type="text"
                placeholder="مثال: 0501234567"
                value={contributorPhone}
                onChange={(e) => setContributorPhone(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#16382F] focus:outline-none"
              />
            </div>
          </div>

          {/* Form to Add More People */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-4">
            <h3 className="text-sm font-bold text-[#16382F] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#B59A6B]" />
              <span>إضافة فرد جديد في الغصن:</span>
            </h3>

            {/* Target Parent Selector */}
            <div>
              <label className="text-xs text-[#4A5D53] block mb-1.5">الربط تحت:</label>
              <select
                value={activeParentId}
                onChange={(e) => setActiveParentId(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] font-semibold focus:border-[#16382F] focus:outline-none"
              >
                {availableParents.map(parent => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Relationship Type */}
            <div>
              <label className="text-xs text-[#4A5D53] block mb-1.5">نوع العلاقة:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRelationship('son');
                    setNewGender('male');
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    newRelationship === 'son'
                      ? 'bg-[#16382F] text-[#F8F5EE]'
                      : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                  }`}
                >
                  ابن
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewRelationship('daughter');
                    setNewGender('female');
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    newRelationship === 'daughter'
                      ? 'bg-[#8C6D3B] text-white'
                      : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                  }`}
                >
                  ابنة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewRelationship('spouse');
                    setNewGender('female');
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    newRelationship === 'spouse'
                      ? 'bg-[#687C58] text-white'
                      : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                  }`}
                >
                  زوجة
                </button>
              </div>
            </div>

            {/* Name input */}
            <div>
              <label className="text-xs text-[#4A5D53] block mb-1.5">الاسم المختصر:</label>
              <input
                type="text"
                placeholder="مثال: سلمان"
                value={newShortName}
                onChange={(e) => setNewShortName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
              />
            </div>

            {/* Birth Year */}
            <div>
              <label className="text-xs text-[#4A5D53] block mb-1.5">سنة الميلاد (اختياري):</label>
              <input
                type="number"
                placeholder="مثال: 2002"
                value={newBirthYear}
                onChange={(e) => setNewBirthYear(e.target.value)}
                className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#202B26] focus:border-[#16382F] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddPerson}
              className="w-full py-2.5 rounded-xl bg-[#F8F5EE] hover:bg-[#16382F] hover:text-white text-[#16382F] text-xs font-semibold border border-[#E8DCC8] transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#B59A6B]" />
              <span>إدراج في مساحة المساهمة</span>
            </button>
          </div>

          {/* Final Submit CTA */}
          <div className="bg-[#16382F] p-6 rounded-3xl text-white shadow-[0_12px_32px_rgba(22,56,47,0.18)] space-y-3">
            <h4 className="text-xs font-semibold text-[#B59A6B] uppercase tracking-wider">
              جاهز للإرسال؟
            </h4>
            <p className="text-xs text-[#E8DCC8] leading-relaxed">
              سيتم تجميع كافة الأفراد المقترحين أعلاه ({proposedPeople.filter(p => p.shortName).length} أفراد) في طلب مراجعة واحد يُرسل لمدقق الشجرة.
            </p>

            <button
              onClick={handleSubmit}
              disabled={proposedPeople.filter(p => p.shortName.trim().length > 0).length === 0}
              className="w-full py-3.5 rounded-full bg-[#B59A6B] hover:bg-[#A38859] disabled:opacity-50 text-[#16382F] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>إرسال الإضافات للمراجعة والاعتماد</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
