import React, { useState } from 'react';
import { ContributionRequest, Person } from '../../types';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  GitBranch, 
  User, 
  AlertTriangle, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  TreePine,
  ArrowLeft
} from 'lucide-react';
import { formatArabicDate, formatArabicRelativeTime } from '../../lib/arabic-utils';

interface ReviewDetailModalProps {
  request: ContributionRequest | null;
  people: Person[];
  onClose: () => void;
  onApproveAll: (request: ContributionRequest) => void;
  onPartialApprove: (request: ContributionRequest, approvedTempIds: string[]) => void;
  onReject: (request: ContributionRequest, reason: string) => void;
  onRequestRevision: (request: ContributionRequest, note: string) => void;
  onInspectOnTree?: (targetPersonId: string) => void;
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
  request,
  people,
  onClose,
  onApproveAll,
  onPartialApprove,
  onReject,
  onRequestRevision,
  onInspectOnTree
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'reject' | 'revise'>('overview');

  if (!request) return null;

  // Potential duplicate detection
  const potentialDuplicates = request.proposedPeople.filter(prop => 
    people.some(existing => existing.shortName === prop.shortName || existing.fullName === prop.fullName)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-right">
      <div className="w-full max-w-3xl bg-white border border-[#E8DCC8] rounded-3xl shadow-2xl text-[#202B26] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#E8DCC8] bg-[#F8F5EE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#16382F] text-[#E8DCC8] flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  طلب مراجعة قيد التدقيق
                </span>
                <span className="text-xs text-[#687C58] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatArabicRelativeTime(request.submittedAt)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#16382F] mt-1 font-['Alexandria']">
                طلب إضافة {request.proposedPeople.length} أفراد بواسطة: {request.contributorName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#687C58] hover:text-[#16382F] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#E8DCC8] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#687C58] block">الغصن المستهدف:</span>
              <span className="font-bold text-[#16382F]">{request.branchName}</span>
            </div>
            <div>
              <span className="text-[#687C58] block">نقطة الربط (الأب المعتمد):</span>
              <span className="font-bold text-[#16382F]">{request.targetPersonName}</span>
            </div>
            <div>
              <span className="text-[#687C58] block">هاتف المساهم:</span>
              <span className="font-bold text-[#16382F]">{request.contributorPhone || 'غير مدون'}</span>
            </div>
          </div>

          {/* Submission Notes */}
          {request.notes && (
            <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#E8DCC8] text-xs">
              <span className="font-bold text-[#B59A6B] block mb-1">ملاحظة المساهم:</span>
              <p className="text-[#202B26]/85 leading-relaxed">{request.notes}</p>
            </div>
          )}

          {/* Duplicate warning */}
          {potentialDuplicates.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-bold block">تنبيه تطابق أسماء محتمل:</span>
                <span>
                  يوجد أفراد مسجلون مسبقاً بنفس الاسم ({potentialDuplicates.map(d => d.shortName).join('، ')}). 
                  يرجى التأكد من عدم تكرار نفس الفرد قبل الاعتماد.
                </span>
              </div>
            </div>
          )}

          {/* Botanical Preview of Proposed Growth */}
          <div className="p-4 rounded-3xl bg-[#FAF8F3] border border-[#E8DCC8] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#16382F] flex items-center gap-1.5 font-['Alexandria']">
                <TreePine className="w-4 h-4 text-[#B59A6B]" />
                <span>المعاينة النباتية للغصن المُراد اعتماده:</span>
              </span>
              {onInspectOnTree && (
                <button
                  type="button"
                  onClick={() => onInspectOnTree(request.targetPersonId)}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-[11px] font-semibold text-[#8C6D3B] hover:text-[#16382F] transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <span>التحليق لهذا الغصن في الشجرة الحية</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="py-2 flex items-center justify-center">
              <div className="relative flex flex-col items-center">
                {/* Parent Node */}
                <div className="px-5 py-2.5 rounded-full bg-[#16382F] text-white text-xs font-bold shadow-sm border border-[#B59A6B]">
                  {request.targetPersonName} (الأصل المعتمد)
                </div>
                {/* Golden Twigs */}
                <div className="w-0.5 h-6 bg-[#B59A6B]" />
                <div className="flex items-center gap-2">
                  {request.proposedPeople.map(p => (
                    <div key={p.tempId} className="px-3 py-1.5 rounded-full bg-[#FAF0D7] border border-dashed border-[#B59A6B] text-[11px] font-semibold text-[#8C6D3B] flex items-center gap-1 shadow-2xs animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B59A6B]" />
                      <span>{p.shortName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Proposed People (Diff view) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#16382F] flex items-center gap-2 font-['Alexandria']">
              <GitBranch className="w-4 h-4 text-[#B59A6B]" />
              <span>الأفراد المقترح إضافتهم ({request.proposedPeople.length}):</span>
            </h4>

            <div className="space-y-2">
              {request.proposedPeople.map((prop) => {
                const isMale = prop.gender === 'male';

                return (
                  <div
                    key={prop.tempId}
                    className="p-4 rounded-2xl bg-white border border-dashed border-[#B59A6B] hover:border-[#16382F] transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isMale ? 'bg-[#16382F] text-[#E8DCC8]' : 'bg-[#5C3D38] text-white'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#16382F]">{prop.shortName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8DCC8] text-[#16382F] font-semibold">
                            {prop.relationship === 'son' ? 'ابن' : prop.relationship === 'daughter' ? 'ابنة' : 'زوجة'}
                          </span>
                        </div>
                        <p className="text-xs text-[#687C58] mt-0.5">
                          {prop.fullName} {prop.birthYear ? `• مواليد ${prop.birthYear} م` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-[#B59A6B] font-bold px-2.5 py-1 rounded-full bg-[#F8F5EE] border border-[#E8DCC8]">
                      مقترح جديد
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reject Form Tab */}
          {activeTab === 'reject' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in">
              <label className="text-xs font-bold text-rose-900 block">
                سبب الرفض (سيتم إشعار المساهم به):
              </label>
              <textarea
                rows={2}
                placeholder="مثال: يرجى التحقق من صلة القرابة حيث لم يثبت هذا الاسم لدى كبار الغصن..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white border border-rose-300 rounded-xl p-3 text-xs text-[#202B26] focus:outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#687C58]"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => onReject(request, rejectReason || 'تم رفض الإضافة من قِبل مدقق الغصن')}
                  className="px-4 py-2 rounded-full bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs"
                >
                  تأكيد رفض الطلب
                </button>
              </div>
            </div>
          )}

          {/* Revision Request Form Tab */}
          {activeTab === 'revise' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in">
              <label className="text-xs font-bold text-amber-900 block">
                ملاحظات التعديل المطلوب من المساهم:
              </label>
              <textarea
                rows={2}
                placeholder="مثال: يرجى إضافة الأسماء الكاملة وتواريخ الميلاد لتوثيقها بدقة..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs text-[#202B26] focus:outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#687C58]"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => onRequestRevision(request, revisionNote || 'يرجى مراجعة وتحديث البيانات')}
                  className="px-4 py-2 rounded-full bg-[#B59A6B] hover:bg-[#9E8354] text-[#16382F] font-bold text-xs"
                >
                  إرسال طلب التعديل
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 sm:p-6 border-t border-[#E8DCC8] bg-[#F8F5EE] flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'reject' ? 'overview' : 'reject')}
              className="px-4 py-2 rounded-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>رفض</span>
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'revise' ? 'overview' : 'revise')}
              className="px-4 py-2 rounded-full bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>طلب تعديل</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#687C58] hover:text-[#16382F]"
            >
              إغلاق
            </button>
            <button
              onClick={() => onApproveAll(request)}
              className="px-6 py-2.5 rounded-full bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#B59A6B]" />
              <span>قبول واعتماد كامل الإضافات ({request.proposedPeople.length})</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
