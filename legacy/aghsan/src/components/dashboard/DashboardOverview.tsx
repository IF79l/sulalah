import React from 'react';
import { FamilyTree, Person, SubscriptionPlan, Subscription, ContributionRequest, ReviewerInvitation, AuditLog, User } from '../../types';
import { 
  Users, 
  GitBranch, 
  Layers, 
  Clock, 
  UserCheck, 
  Share2, 
  CreditCard, 
  Activity,
  ArrowLeft,
  ChevronLeft
} from 'lucide-react';
import { formatArabicDate, formatArabicRelativeTime } from '../../lib/arabic-utils';

interface DashboardOverviewProps {
  tree: FamilyTree;
  people: Person[];
  plan: SubscriptionPlan;
  subscription: Subscription;
  contributions: ContributionRequest[];
  reviewers: ReviewerInvitation[];
  auditLogs: AuditLog[];
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
  onOpenShareModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tree,
  people,
  plan,
  subscription,
  contributions,
  reviewers,
  auditLogs,
  currentUser,
  onNavigate,
  onOpenShareModal
}) => {
  const totalApproved = people.filter(p => p.isApproved).length;
  const mainBranchesCount = people.filter(p => p.fatherId === tree.rootAncestorId).length;
  const maxGeneration = Math.max(...people.map(p => p.generation), 1);
  const pendingRequestsCount = contributions.filter(c => c.status === 'PENDING').length;
  const activeReviewersCount = reviewers.filter(r => r.status !== 'REVOKED').length;

  const quotaPercent = Math.min(Math.round((totalApproved / plan.maxPeople) * 100), 100);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-right text-[#202B26] space-y-8 animate-in fade-in duration-300">
      
      {/* Top Refined Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8DCC8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#687C58]">
            <span>لوحة تحكم شجرة العائلة</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#B59A6B]">شجرة موثقة ومعتمدة</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold font-['Alexandria'] text-[#16382F]">
            {tree.name}
          </h1>

          <p className="text-xs sm:text-sm text-[#202B26]/75 max-w-xl leading-relaxed">
            مرحباً بك يا {currentUser?.name || 'المالك'}. يمكنك إدارة الفروع وتدقيق الإضافات الجديدة وإرسال روابط المساهمة للعائلة من هنا.
          </p>
        </div>

        {/* Top Direct Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('tree')}
            className="px-5 py-2.5 rounded-full bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] font-bold text-xs shadow-xs transition-all flex items-center gap-2"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#B59A6B]" />
            <span>عرض الشجرة التفاعلية</span>
          </button>

          <button
            onClick={onOpenShareModal}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-[#F8F5EE] border border-[#E8DCC8] text-[#16382F] font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-[#687C58]" />
            <span>مشاركة الرابط مع العائلة</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-xs space-y-1">
          <span className="text-xs text-[#687C58] block">الأفراد المعتمدون</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F] tabular-nums">
            {totalApproved}
          </div>
          <span className="text-[10px] text-[#A5B39A] block">من أصل {plan.maxPeople} فرد</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-xs space-y-1">
          <span className="text-xs text-[#687C58] block">الأغصان الرئيسية</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F] tabular-nums">
            {mainBranchesCount}
          </div>
          <span className="text-[10px] text-[#A5B39A] block">أبناء الجد المؤسس</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-xs space-y-1">
          <span className="text-xs text-[#687C58] block">أعمق جيل موثق</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F] tabular-nums">
            {maxGeneration}
          </div>
          <span className="text-[10px] text-[#A5B39A] block">أجيال متعاقبة</span>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => onNavigate('dashboard', 'reviews')}
          className="bg-white p-5 rounded-3xl border border-[#E8DCC8] hover:border-[#B59A6B] shadow-xs space-y-1 cursor-pointer transition-colors"
        >
          <span className="text-xs text-[#B59A6B] font-semibold block">طلبات معلقة</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#B59A6B] tabular-nums">
            {pendingRequestsCount}
          </div>
          <span className="text-[10px] text-[#B59A6B] font-medium block">مراجعة الآن ←</span>
        </div>

        {/* Metric 5 */}
        <div 
          onClick={() => onNavigate('dashboard', 'reviewers')}
          className="bg-white p-5 rounded-3xl border border-[#E8DCC8] hover:border-[#687C58] shadow-xs space-y-1 cursor-pointer transition-colors"
        >
          <span className="text-xs text-[#687C58] block">المدققون المساعدون</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F] tabular-nums">
            {activeReviewersCount}
          </div>
          <span className="text-[10px] text-[#A5B39A] block">من {plan.maxReviewers} مقاعد</span>
        </div>

        {/* Metric 6: Quota */}
        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-xs space-y-1">
          <span className="text-xs text-[#687C58] block">استهلاك الباقة</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F] tabular-nums">
            {quotaPercent}%
          </div>
          <div className="w-full bg-[#F8F5EE] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#B59A6B] h-full rounded-full transition-all" 
              style={{ width: `${quotaPercent}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Pending Requests & Plan Overview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Pending Contributions Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
              <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2 font-['Alexandria']">
                <Clock className="w-4 h-4 text-[#B59A6B]" />
                <span>إضافات بانتظار المراجعة والاعتماد:</span>
              </h3>
              <button
                onClick={() => onNavigate('dashboard', 'reviews')}
                className="text-xs font-bold text-[#B59A6B] hover:underline"
              >
                عرض كل الطلبات ({pendingRequestsCount})
              </button>
            </div>

            {contributions.filter(c => c.status === 'PENDING').length > 0 ? (
              <div className="space-y-3">
                {contributions.filter(c => c.status === 'PENDING').slice(0, 3).map(req => (
                  <div
                    key={req.id}
                    onClick={() => onNavigate('dashboard', 'reviews')}
                    className="p-4 rounded-2xl bg-[#F8F5EE] hover:bg-white border border-[#E8DCC8] transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#16382F]">
                          {req.contributorName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8DCC8] text-[#16382F] font-bold">
                          +{req.proposedPeople.length} أفراد
                        </span>
                      </div>
                      <p className="text-[11px] text-[#687C58] mt-0.5">
                        الغصن: {req.branchName} • الأب: {req.targetPersonName}
                      </p>
                    </div>

                    <button className="px-3.5 py-1.5 rounded-full bg-[#16382F] text-white text-xs font-bold">
                      تدقيق الفروقات
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#687C58]">
                <span>رائع! لا توجد طلبات معلقة حالياً، جميع الإضافات معتمدة.</span>
              </div>
            )}
          </div>

          {/* Subscription and Package Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs text-[#687C58] block">اشتراك الشجرة الحالي:</span>
              <h4 className="text-xl font-bold font-['Alexandria'] text-[#16382F]">
                باقة {plan.nameAr} ({subscription.billingCycle === 'annual' ? 'اشتراك سنوي' : 'اشتراك شهري'})
              </h4>
              <p className="text-xs text-[#687C58]">
                الحالة: <span className="text-emerald-700 font-bold">نشط ومفعل</span> • ينتهي في: {formatArabicDate(subscription.expiresAt)}
              </p>
            </div>

            <button
              onClick={() => onNavigate('dashboard', 'billing')}
              className="px-5 py-2.5 rounded-full bg-[#F8F5EE] hover:bg-[#E8DCC8] text-xs font-bold text-[#16382F] transition-all border border-[#E8DCC8]"
            >
              إدارة الفواتير والترقية
            </button>
          </div>

        </div>

        {/* Audit Log / Recent Activity Stream (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
            <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2 font-['Alexandria']">
              <Activity className="w-4 h-4 text-[#687C58]" />
              <span>سجل تاريخ العمليات (Audit Log):</span>
            </h3>
            <button
              onClick={() => onNavigate('dashboard', 'history')}
              className="text-xs font-semibold text-[#687C58] hover:text-[#16382F]"
            >
              عرض السجل كاملاً
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 5).map(log => (
              <div key={log.id} className="p-3.5 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#16382F]">{log.actorName}</span>
                  <span className="text-[10px] text-[#A5B39A]">{formatArabicRelativeTime(log.createdAt)}</span>
                </div>
                <p className="text-[#202B26]/85 leading-relaxed">{log.details}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
