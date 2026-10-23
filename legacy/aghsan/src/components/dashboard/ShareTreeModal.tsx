import React, { useState } from 'react';
import { FamilyTree, Person, TreeInvitation } from '../../types';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Lock
} from 'lucide-react';

interface ShareTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTree;
  people: Person[];
  invitations: TreeInvitation[];
  onCreateInvitation: (name: string, scopeBranchId?: string) => void;
}

export const ShareTreeModal: React.FC<ShareTreeModalProps> = ({
  isOpen,
  onClose,
  tree,
  invitations,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeInvitation = invitations[0];
  const shareToken = activeInvitation ? activeInvitation.token : 'aghsan-share-default';
  const shareUrl = `${window.location.origin}/contribute/${shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته،\nأدعوكم للمشاركة في توثيق شجرة عائلتنا الكريمة (${tree.name}) عبر منصة أغصان الرقمية. يمكنك استعراض غصنك وإضافة أبنائك وأسرتك عبر الرابط:\n${shareUrl}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#16382F]/50 backdrop-blur-sm flex items-center justify-center p-4 text-right">
      <div className="w-full max-w-lg bg-white border border-[#E8DCC8] rounded-3xl shadow-[0_20px_50px_rgba(22,56,47,0.15)] p-6 text-[#202B26] space-y-6 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8DCC8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#F8F5EE] border border-[#E8DCC8] flex items-center justify-center text-[#16382F]">
              <Share2 className="w-5 h-5 text-[#B59A6B]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#16382F]">مشاركة شجرة العائلة</h3>
              <p className="text-xs text-[#687C58]">دعوة أفراد العائلة للمساهمة في بناء أغصانهم</p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F8F5EE] flex items-center justify-center text-[#687C58] hover:text-[#16382F]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Direct Share Link */}
        <div>
          <a
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>مشاركة مباشرة عبر واتساب مع الأهل</span>
          </a>
        </div>

        {/* Share Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#16382F] block">
            رابط المساهمة والاستعراض:
          </label>
          <div className="flex items-center gap-2 bg-[#F8F5EE] p-2 rounded-2xl border border-[#E8DCC8]">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-[#202B26] flex-1 px-2 focus:outline-none font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-[#16382F] hover:bg-[#20493E] text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#B59A6B]" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E8DCC8] text-xs space-y-2 text-[#4A5D53]">
          <div className="flex items-center gap-2 text-[#16382F] font-bold">
            <Lock className="w-4 h-4 text-[#B59A6B]" />
            <span>ضمان الخصوصية والتحقق:</span>
          </div>
          <p className="leading-relaxed">
            من يحصل على هذا الرابط يستطيع استعراض الشجرة واقتراح إضافات تحت غصنه فقط. لن تظهر أي إضافة في الشجرة المعتمدة إلا بعد موافقتك كمدقق.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#F8F5EE] hover:bg-[#E8DCC8] text-xs font-medium text-[#16382F] transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
