import React, { useState } from 'react';
import { ContributionRequest, Person, User } from '../../types';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft
} from 'lucide-react';
import { formatArabicRelativeTime } from '../../lib/arabic-utils';

interface ReviewQueueProps {
  requests: ContributionRequest[];
  people: Person[];
  currentUser: User | null;
  onOpenDetail: (request: ContributionRequest) => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  requests,
  people,
  currentUser,
  onOpenDetail
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Scope filter: if currentUser is reviewer, only show their branch
  const scopedRequests = requests.filter(req => {
    if (currentUser?.role === 'reviewer') {
      return req.branchName.includes('متروك');
    }
    return true;
  });

  const filteredRequests = scopedRequests.filter(req => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        req.contributorName.toLowerCase().includes(term) ||
        req.branchName.toLowerCase().includes(term) ||
        req.targetPersonName.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const pendingCount = scopedRequests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-right text-[#202B26] space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#687C58] font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-[#B59A6B]" />
            <span>نظام التدقيق والاعتماد الموثوق</span>
          </div>
          <h2 className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            طلبات الإضافة والمراجعة
          </h2>
          <p className="text-xs text-[#687C58] mt-1">
            {currentUser?.role === 'reviewer' 
              ? 'صلاحيتك كمدقق مساعد محددة على: فرع متروك بن محمد' 
              : 'بصفتك مالك الشجرة، تملك صلاحية التدقيق الشاملة على كافة الأغصان'}
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8F5EE] border border-[#E8DCC8] text-xs">
          <span className="text-[#687C58]">الطلبات المعلقة:</span>
          <span className="font-extrabold text-[#16382F] text-base tabular-nums">{pendingCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8DCC8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#16382F] text-[#F8F5EE]'
                : 'bg-[#F8F5EE] text-[#202B26]/80 hover:bg-[#E8DCC8]'
            }`}
          >
            الكل ({scopedRequests.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-[#B59A6B] text-[#16382F]'
                : 'bg-[#F8F5EE] text-amber-900 hover:bg-[#E8DCC8]'
            }`}
          >
            بانتظار الاعتماد ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-[#16382F] text-[#F8F5EE]'
                : 'bg-[#F8F5EE] text-emerald-900 hover:bg-[#E8DCC8]'
            }`}
          >
            معتمد
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-700 text-white'
                : 'bg-[#F8F5EE] text-rose-900 hover:bg-[#E8DCC8]'
            }`}
          >
            مرفوض
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="ابحث باسم المساهم أو الغصن..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8F5EE] border border-[#E8DCC8] text-xs text-[#202B26] px-3.5 py-2 rounded-full focus:border-[#B59A6B] focus:outline-none"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.map(req => {
          const isPending = req.status === 'PENDING';
          const isApproved = req.status === 'APPROVED' || req.status === 'PARTIALLY_APPROVED';
          const isRejected = req.status === 'REJECTED';

          return (
            <div
              key={req.id}
              onClick={() => onOpenDetail(req)}
              className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-xs hover:shadow-sm hover:border-[#B59A6B] transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                  isPending
                    ? 'bg-amber-100 text-amber-800'
                    : isApproved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {isPending ? <Clock className="w-5 h-5" /> : isApproved ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#16382F]">
                      {req.contributorName}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      isPending
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : isApproved
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                    }`}>
                      {isPending ? 'بانتظار المراجعة' : isApproved ? 'معتمد' : 'مرفوض'}
                    </span>
                  </div>

                  <p className="text-xs text-[#687C58] mt-0.5">
                    الغصن: <span className="text-[#16382F] font-bold">{req.branchName}</span> • 
                    الأب المستهدف: <span className="text-[#16382F] font-bold">{req.targetPersonName}</span>
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#A5B39A] mt-1">
                    <span>{req.proposedPeople.length} أفراد مقترحون</span>
                    <span>·</span>
                    <span>{formatArabicRelativeTime(req.submittedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(req);
                  }}
                  className="px-4 py-2 rounded-full bg-[#F8F5EE] group-hover:bg-[#16382F] group-hover:text-[#F8F5EE] text-xs font-bold text-[#16382F] transition-colors flex items-center gap-1.5"
                >
                  <span>عرض التفاصيل والفروقات</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="bg-white rounded-3xl p-12 border border-[#E8DCC8] text-center space-y-2">
            <h3 className="text-base font-bold text-[#16382F]">لا توجد طلبات في هذه القائمة</h3>
            <p className="text-xs text-[#687C58] max-w-sm mx-auto">
              جميع طلبات الإضافة تمت مراجعتها بالكامل أو لم يتم تقديم طلبات جديدة بعد.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
