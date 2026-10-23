import React, { useState } from 'react';
import { SubscriptionPlan, User, FamilyTree } from '../../types';
import { 
  ShieldAlert, 
  Settings, 
  Save, 
  CheckCircle2, 
  Edit2
} from 'lucide-react';

interface AdminPanelProps {
  plans: SubscriptionPlan[];
  users: User[];
  trees: FamilyTree[];
  totalPeopleCount: number;
  onUpdatePlan: (updatedPlan: SubscriptionPlan) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  plans,
  users,
  trees,
  totalPeopleCount,
  onUpdatePlan
}) => {
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPriceMonthly, setEditPriceMonthly] = useState<number>(0);
  const [editPriceAnnual, setEditPriceAnnual] = useState<number>(0);
  const [editMaxPeople, setEditMaxPeople] = useState<number>(0);
  const [editMaxReviewers, setEditMaxReviewers] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState(false);

  const startEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setEditPriceMonthly(plan.priceMonthlySAR);
    setEditPriceAnnual(plan.priceAnnualSAR);
    setEditMaxPeople(plan.maxPeople);
    setEditMaxReviewers(plan.maxReviewers);
  };

  const handleSavePlan = (plan: SubscriptionPlan) => {
    onUpdatePlan({
      ...plan,
      priceMonthlySAR: editPriceMonthly,
      priceAnnualSAR: editPriceAnnual,
      maxPeople: editMaxPeople,
      maxReviewers: editMaxReviewers
    });
    setEditingPlanId(null);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 text-right text-[#202B26] space-y-8 animate-in fade-in duration-300">
      
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C6D3B] font-semibold mb-1.5">
            <ShieldAlert className="w-4 h-4 text-[#B59A6B]" />
            <span>لوحة إدارة النظام السحابي (SaaS Platform Admin)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Alexandria'] text-[#16382F]">
            إدارة المنصة والباقات والأسعار
          </h2>
          <p className="text-xs text-[#687C58] mt-1 max-w-xl leading-relaxed">
            تحكم كامل في حدود الباقات، أسعار الاشتراكات السنوية والشهرية، ومراقبة إحصائيات النظام العامة.
          </p>
        </div>

        <div className="bg-[#B59A6B]/15 text-[#8C6D3B] border border-[#B59A6B]/30 px-4 py-2 rounded-full text-xs font-semibold">
          وضع مدير المنصة
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>تم تحديث إعدادات الباقة وحدودها بنجاح وحفظها في قاعدة البيانات.</span>
        </div>
      )}

      {/* Global SaaS Platform Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-1">
          <span className="text-xs text-[#687C58] block">المستخدمون المسجلون</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">{users.length}</div>
          <span className="text-[10px] text-emerald-700 font-medium block">حسابات موثقة</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-1">
          <span className="text-xs text-[#687C58] block">الشجرات المنشأة</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">{trees.length}</div>
          <span className="text-[10px] text-[#8C6D3B] font-medium block">قواعد عائلية</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-1">
          <span className="text-xs text-[#687C58] block">أفراد الأسر الموثقين</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">{totalPeopleCount}</div>
          <span className="text-[10px] text-[#687C58] block">عبر كافة الشجرات</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-1">
          <span className="text-xs text-[#687C58] block">باقات الاشتراك</span>
          <div className="text-2xl font-bold font-['Alexandria'] text-[#16382F]">{plans.length}</div>
          <span className="text-[10px] text-[#16382F] font-medium block">قابلة للتخصيص</span>
        </div>
      </div>

      {/* Dynamic Package & Limits Editor */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] space-y-6">
        <div>
          <h3 className="text-base font-bold text-[#16382F] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#B59A6B]" />
            <span>تخصيص أسعار وحدود باقات الاشتراك:</span>
          </h3>
          <p className="text-xs text-[#687C58] mt-1">
            يمكنك تعديل أسعار الباقات بالريال السعودي وحدود أفراد الشجرة ومقاعد المدققين مباشرة دون الحاجة لتحديث الكود.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isEditing = editingPlanId === plan.id;

            return (
              <div
                key={plan.id}
                className="bg-[#F8F5EE] p-6 rounded-3xl border border-[#E8DCC8] space-y-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#16382F] font-['Alexandria']">
                    باقة {plan.nameAr}
                  </h4>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditPlan(plan)}
                      className="px-3 py-1 rounded-full bg-white hover:bg-[#16382F] hover:text-white text-[#16382F] font-medium text-[11px] border border-[#E8DCC8] flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-[#B59A6B]" />
                      <span>تعديل</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSavePlan(plan)}
                      className="px-3 py-1 rounded-full bg-[#16382F] hover:bg-[#20493E] text-white font-medium text-[11px] flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>حفظ</span>
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] text-[#687C58] block mb-1">السعر الشهري (ر.س):</label>
                      <input
                        type="number"
                        value={editPriceMonthly}
                        onChange={(e) => setEditPriceMonthly(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#E8DCC8] rounded-xl px-3 py-1.5 text-xs text-[#16382F] font-bold focus:border-[#16382F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#687C58] block mb-1">السعر السنوي (ر.س):</label>
                      <input
                        type="number"
                        value={editPriceAnnual}
                        onChange={(e) => setEditPriceAnnual(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#E8DCC8] rounded-xl px-3 py-1.5 text-xs text-[#16382F] font-bold focus:border-[#16382F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#687C58] block mb-1">الحد الأقصى للأفراد:</label>
                      <input
                        type="number"
                        value={editMaxPeople}
                        onChange={(e) => setEditMaxPeople(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#E8DCC8] rounded-xl px-3 py-1.5 text-xs text-[#16382F] font-bold focus:border-[#16382F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#687C58] block mb-1">مقاعد المدققين المساعدين:</label>
                      <input
                        type="number"
                        value={editMaxReviewers}
                        onChange={(e) => setEditMaxReviewers(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-[#E8DCC8] rounded-xl px-3 py-1.5 text-xs text-[#16382F] font-bold focus:border-[#16382F] focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex justify-between border-b border-[#E8DCC8] pb-1.5">
                      <span className="text-[#687C58]">السعر الشهري:</span>
                      <span className="font-bold text-[#16382F]">{plan.priceMonthlySAR} ر.س</span>
                    </div>
                    <div className="flex justify-between border-b border-[#E8DCC8] pb-1.5">
                      <span className="text-[#687C58]">السعر السنوي:</span>
                      <span className="font-bold text-[#16382F]">{plan.priceAnnualSAR} ر.س</span>
                    </div>
                    <div className="flex justify-between border-b border-[#E8DCC8] pb-1.5">
                      <span className="text-[#687C58]">حد الأفراد:</span>
                      <span className="font-bold text-[#16382F]">{plan.maxPeople.toLocaleString('ar-SA')} فرد</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#687C58]">مقاعد المدققين:</span>
                      <span className="font-bold text-[#16382F]">{plan.maxReviewers} مدقق</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
