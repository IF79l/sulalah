import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { History, Shield, Plus, FileCheck } from 'lucide-react';
import { formatArabicDate, formatArabicRelativeTime } from '../../lib/arabic-utils';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const filteredLogs = logs.filter(log => {
    if (filter !== 'ALL' && log.action !== filter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return log.details.toLowerCase().includes(q) || log.actorName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 text-right text-[#202B26] space-y-6 animate-in fade-in duration-300">
      
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C6D3B] font-semibold mb-1.5">
            <History className="w-4 h-4 text-[#B59A6B]" />
            <span>سجل تدقيق وأمان العمليات (Audit Trail)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            تاريخ التعديلات والاعتمادات في الشجرة
          </h2>
          <p className="text-xs text-[#687C58] mt-1 max-w-xl leading-relaxed">
            توثيق رقمي غير قابل للتعديل يوضح من قام بالإضافة، التدقيق، أو الاعتماد مع الطابع الزمني الموثق.
          </p>
        </div>

        <div className="bg-[#F8F5EE] px-4 py-3 rounded-2xl border border-[#E8DCC8] text-xs">
          <span className="text-[#687C58] block mb-0.5">إجمالي العمليات الموثقة:</span>
          <span className="font-bold text-[#16382F] text-base">{logs.length} عملية</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              filter === 'ALL' ? 'bg-[#16382F] text-[#F8F5EE]' : 'bg-[#F8F5EE] text-[#687C58] hover:text-[#16382F]'
            }`}
          >
            الكل ({logs.length})
          </button>
          <button
            onClick={() => setFilter('PERSON_ADDED')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              filter === 'PERSON_ADDED' ? 'bg-[#16382F] text-[#F8F5EE]' : 'bg-[#F8F5EE] text-[#687C58] hover:text-[#16382F]'
            }`}
          >
            إضافة أفراد
          </button>
          <button
            onClick={() => setFilter('CONTRIBUTION_APPROVED')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              filter === 'CONTRIBUTION_APPROVED' ? 'bg-[#16382F] text-[#F8F5EE]' : 'bg-[#F8F5EE] text-[#687C58] hover:text-[#16382F]'
            }`}
          >
            اعتماد مساهمات
          </button>
          <button
            onClick={() => setFilter('REVIEWER_INVITED')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              filter === 'REVIEWER_INVITED' ? 'bg-[#16382F] text-[#F8F5EE]' : 'bg-[#F8F5EE] text-[#687C58] hover:text-[#16382F]'
            }`}
          >
            دعوات المدققين
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="بحث في سجل التعديلات..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#F8F5EE] border border-[#E8DCC8] text-xs text-[#202B26] px-3.5 py-2 rounded-xl focus:border-[#16382F] focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-3">
        {filteredLogs.map(log => (
          <div
            key={log.id}
            className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-[#B59A6B] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-[#E8DCC8] text-[#16382F] flex items-center justify-center font-bold shadow-xs">
                {log.action === 'PERSON_ADDED' ? <Plus className="w-4 h-4 text-[#B59A6B]" /> : <FileCheck className="w-4 h-4 text-[#687C58]" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#16382F]">{log.actorName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E8DCC8] text-[#687C58] font-medium">
                    {log.action}
                  </span>
                </div>
                <p className="text-[#4A5D53] mt-1 leading-relaxed">{log.details}</p>
              </div>
            </div>

            <div className="text-left shrink-0 self-end sm:self-center text-[#687C58] text-[11px]">
              <div>{formatArabicDate(log.createdAt)}</div>
              <div className="text-[10px] text-[#8C6D3B]">{formatArabicRelativeTime(log.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
