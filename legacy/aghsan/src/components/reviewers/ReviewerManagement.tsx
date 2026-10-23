import React, { useState } from 'react';
import { ReviewerInvitation, Person, SubscriptionPlan, FamilyTree } from '../../types';
import { 
  UserCheck, 
  UserPlus, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check,
  Crown
} from 'lucide-react';

interface ReviewerManagementProps {
  tree: FamilyTree;
  reviewers: ReviewerInvitation[];
  people: Person[];
  plan: SubscriptionPlan;
  onInviteReviewer: (data: {
    email: string;
    name?: string;
    scope: 'ALL_TREE' | 'BRANCH';
    branchRootId?: string;
    branchName?: string;
  }) => { success: boolean; message?: string };
  onRevokeReviewer: (id: string) => void;
}

export const ReviewerManagement: React.FC<ReviewerManagementProps> = ({
  tree,
  reviewers,
  people,
  plan,
  onInviteReviewer,
  onRevokeReviewer
}) => {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'ALL_TREE' | 'BRANCH'>('BRANCH');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Main branches (children of root)
  const mainBranches = people.filter(p => p.fatherId === tree.rootAncestorId);

  // Active reviewers count (excluding revoked)
  const activeReviewers = reviewers.filter(r => r.status !== 'REVOKED');
  const seatsRemaining = Math.max(0, plan.maxReviewers - activeReviewers.length);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال البريد الإلكتروني للمدقق.' });
      return;
    }

    const branch = mainBranches.find(b => b.id === selectedBranchId);

    const res = onInviteReviewer({
      email: email.trim(),
      name: name.trim() || undefined,
      scope,
      branchRootId: scope === 'BRANCH' ? branch?.id : undefined,
      branchName: scope === 'BRANCH' ? (branch?.shortName ? `فرع ${branch.shortName}` : undefined) : 'كامل الشجرة'
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'تم إنشاء وإرسال دعوة المدقق بنجاح!' });
      setEmail('');
      setName('');
      setInviteModalOpen(false);
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'تعذر إضافة المدقق' });
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite-reviewer/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-right text-[#202B26] space-y-6">
      
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C6D3B] font-semibold mb-1.5">
            <UserCheck className="w-4 h-4 text-[#B59A6B]" />
            <span>إدارة صلاحيات وتدقيق العائلة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            المدققون المعتمدون ومقاعد الباقة
          </h2>
          <p className="text-xs text-[#687C58] mt-1 max-w-xl leading-relaxed">
            تعيين أعيان الفروع لمراجعة وتدقيق الإضافات المقترحة لغصنهم يحافظ على دقة الأنساب وصحة التوثيق.
          </p>
        </div>

        {/* Seat Limit Meter */}
        <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#E8DCC8] flex items-center gap-4 text-xs">
          <div>
            <span className="text-[#687C58] block">المقاعد المستهلكة:</span>
            <span className="font-extrabold text-[#16382F] text-base">
              {activeReviewers.length} من {plan.maxReviewers} مدقق
            </span>
            <span className="text-[10px] text-[#8C6D3B] block font-semibold">باقة {plan.nameAr}</span>
          </div>

          <button
            onClick={() => setInviteModalOpen(true)}
            disabled={seatsRemaining === 0}
            className="px-4 py-2.5 rounded-full bg-[#16382F] hover:bg-[#20493E] disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>دعوة مدقق جديد</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
          statusMessage.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-900'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
        }`}>
          {statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-700" /> : <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Reviewers List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-4">
        <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#B59A6B]" />
          <span>قائمة المدققين المعتمدين:</span>
        </h3>

        <div className="divide-y divide-[#E8DCC8]">
          
          {/* Owner Entry (Permanent) */}
          <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#16382F] text-[#B59A6B] flex items-center justify-center font-bold text-sm shadow-sm">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#16382F]">عبد العزيز بن محمد</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16382F]/10 text-[#16382F] font-semibold border border-[#16382F]/20">
                    المدقق الرئيسي (المالك)
                  </span>
                </div>
                <p className="text-xs text-[#687C58]">صلاحية تدقيق كاملة على الشجرة والفواتير وإدارة الأفرع</p>
              </div>
            </div>

            <span className="text-xs text-[#687C58] bg-[#F8F5EE] px-3 py-1.5 rounded-xl border border-[#E8DCC8]">
              صلاحية دائمة
            </span>
          </div>

          {/* Invited Reviewers */}
          {activeReviewers.map(rev => (
            <div key={rev.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F8F5EE] text-[#16382F] border border-[#E8DCC8] flex items-center justify-center font-bold text-sm">
                  {rev.name ? rev.name.charAt(0) : 'م'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#16382F]">{rev.name || 'مدقق مساعد'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                      {rev.status === 'ACCEPTED' ? 'مدقق نشط' : 'بانتظار قبول الدعوة'}
                    </span>
                  </div>
                  <p className="text-xs text-[#687C58]">
                    البريد: {rev.email} • نطاق الصلاحية: <span className="text-[#16382F] font-bold">{rev.branchName || 'كامل الشجرة'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyInviteLink(rev.token)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F5EE] hover:bg-[#E8DCC8] text-xs font-semibold text-[#16382F] border border-[#E8DCC8] flex items-center gap-1.5 transition-colors"
                >
                  {copiedToken === rev.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#B59A6B]" />}
                  <span>{copiedToken === rev.token ? 'تم النسخ' : 'نسخ رابط الدعوة'}</span>
                </button>

                <button
                  onClick={() => onRevokeReviewer(rev.id)}
                  title="إلغاء صلاحية المدقق فوراً"
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إلغاء الصلاحية</span>
                </button>
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#16382F]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E8DCC8] rounded-3xl shadow-[0_20px_50px_rgba(22,56,47,0.15)] p-6 text-[#202B26] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
              <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#B59A6B]" />
                <span>دعوة مدقق مساعد جديد</span>
              </h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F8F5EE] flex items-center justify-center text-[#687C58] hover:text-[#16382F]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="text-xs text-[#4A5D53] block mb-1.5">البريد الإلكتروني للمدقق (مطلوب):</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[#4A5D53] block mb-1.5">اسم المدقق (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: سالم بن متروك آل محمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                />
              </div>

              {/* Scope Selection */}
              <div>
                <label className="text-xs text-[#16382F] font-semibold block mb-1.5">نطاق صلاحية التدقيق:</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setScope('BRANCH')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      scope === 'BRANCH'
                        ? 'bg-[#16382F] text-white'
                        : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                    }`}
                  >
                    غصن محدد فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('ALL_TREE')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      scope === 'ALL_TREE'
                        ? 'bg-[#16382F] text-white'
                        : 'bg-[#F8F5EE] text-[#4A5D53] border border-[#E8DCC8]'
                    }`}
                  >
                    كامل الشجرة
                  </button>
                </div>

                {scope === 'BRANCH' && (
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] font-semibold focus:border-[#16382F] focus:outline-none mt-2"
                  >
                    <option value="">-- اختر الغصن المصرح له بمراجعته --</option>
                    {mainBranches.map(b => (
                      <option key={b.id} value={b.id}>
                        فرع {b.shortName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 border-t border-[#E8DCC8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#687C58] hover:text-[#16382F]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#16382F] hover:bg-[#20493E] text-white font-semibold text-xs shadow-sm"
                >
                  إرسال الدعوة وتوليد الرابط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
