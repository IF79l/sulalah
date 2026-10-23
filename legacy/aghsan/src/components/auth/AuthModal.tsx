import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { 
  X, 
  Mail, 
  Lock, 
  ShieldCheck, 
  CheckCircle2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (newUser: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  onRegisterSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('owner@aghsan.sa');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole] = useState<UserRole>('owner');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Status & error
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(u => u.email.toLowerCase() === loginEmail.trim().toLowerCase());
    if (found) {
      onLoginSuccess(found);
      onClose();
    } else {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يمكنك اختيار أحد الحسابات التجريبية بالجانب.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    if (!agreedTerms) {
      setError('يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole,
      createdAt: new Date().toISOString()
    };

    onRegisterSuccess(newUser);
    onClose();
  };

  const handleQuickLogin = (user: User) => {
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#16382F]/50 backdrop-blur-sm flex items-center justify-center p-4 text-right">
      <div className="w-full max-w-3xl bg-white border border-[#E8DCC8] rounded-3xl shadow-[0_20px_50px_rgba(22,56,47,0.15)] text-[#202B26] overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-in zoom-in-95 duration-200">
        
        {/* Left Art / Heritage Side (5 cols on Desktop) */}
        <div className="hidden md:flex md:col-span-5 bg-[#16382F] p-8 flex-col justify-between border-l border-[#20493E] text-white relative">
          <div className="space-y-4">
            {/* Bespoke Botanical Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#FAF8F3]/10 border border-[#B59A6B]/30 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-6 h-6 stroke-[#B59A6B] fill-none stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 34V16" />
                  <path d="M20 26C15 24 12 19 12 14" />
                  <path d="M20 22C25 20 28 16 28 11" />
                  <circle cx="12" cy="14" r="2.5" className="fill-[#B59A6B]" />
                  <circle cx="28" cy="11" r="2.5" className="fill-[#B59A6B]" />
                  <circle cx="20" cy="12" r="2.5" className="fill-[#B59A6B]" />
                </svg>
              </div>
              <span className="font-['Alexandria'] text-lg font-bold tracking-wide">أغصان</span>
            </div>

            <h3 className="text-xl font-bold font-['Alexandria'] leading-tight text-[#F8F5EE]">
              كل عائلة لها جذور، وكل غصن يحمل حكاية.
            </h3>
            <p className="text-xs text-[#E8DCC8]/80 leading-relaxed">
              منصة توثيق الأنساب الرقمية التشاركية بتدقيق أعيان العائلة وحفظ الخصوصية.
            </p>
          </div>

          {/* Quick Demo Switcher on Art Side */}
          <div className="space-y-2.5 pt-6 border-t border-white/10">
            <span className="text-[11px] font-semibold text-[#B59A6B] block">
              تسجيل دخول سريع للتجربة (أدوار تجريبية):
            </span>
            <div className="space-y-1.5">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="w-full text-right p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[11px] font-medium transition-all flex items-center justify-between border border-white/5 hover:border-[#B59A6B]/40"
                >
                  <span className="truncate">{u.name}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#B59A6B]/20 text-[#E8DCC8]">
                    {u.role === 'owner' ? 'المالك' : u.role === 'reviewer' ? 'مدقق' : u.role === 'contributor' ? 'مساهم' : 'مدير'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Form Side (7 cols) */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          
          <div>
            {/* Top Close & Tab Buttons */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DCC8]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setTab('login'); setError(null); }}
                  className={`text-xs font-bold pb-2 transition-colors relative ${
                    tab === 'login' ? 'text-[#16382F]' : 'text-[#687C58]'
                  }`}
                >
                  تسجيل الدخول
                  {tab === 'login' && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#16382F]" />}
                </button>
                <button
                  onClick={() => { setTab('register'); setError(null); }}
                  className={`text-xs font-bold pb-2 transition-colors relative ${
                    tab === 'register' ? 'text-[#16382F]' : 'text-[#687C58]'
                  }`}
                >
                  إنشاء حساب جديد
                  {tab === 'register' && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#16382F]" />}
                </button>
              </div>

              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full hover:bg-[#F8F5EE] flex items-center justify-center text-[#687C58] hover:text-[#16382F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                {error}
              </div>
            )}

            {/* TAB: LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 pt-6">
                <div>
                  <label className="text-xs text-[#4A5D53] block mb-1.5 font-medium">البريد الإلكتروني:</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#687C58] absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl pr-9 pl-3 py-2.5 text-xs text-[#16382F] font-semibold focus:border-[#16382F] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs text-[#4A5D53] font-medium">كلمة المرور:</label>
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-[11px] text-[#8C6D3B] hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#687C58] absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl pr-9 pl-3 py-2.5 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#16382F] hover:bg-[#20493E] text-white font-semibold text-xs shadow-sm transition-all"
                >
                  تسجيل الدخول
                </button>
              </form>
            )}

            {/* TAB: REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5 pt-4">
                <div>
                  <label className="text-xs text-[#4A5D53] block mb-1 font-medium">الاسم الكامل:</label>
                  <input
                    type="text"
                    placeholder="مثال: سلمان بن فهد آل محمد"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] font-semibold focus:border-[#16382F] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#4A5D53] block mb-1 font-medium">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[#4A5D53] block mb-1 font-medium">كلمة المرور:</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3 py-2 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="rounded border-[#E8DCC8] text-[#16382F] focus:ring-[#16382F]"
                  />
                  <label htmlFor="terms" className="text-[11px] text-[#687C58] cursor-pointer">
                    أوافق على الشروط وميثاق دقة الأنساب وحماية البيانات الشخصية
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#16382F] hover:bg-[#20493E] text-white font-semibold text-xs shadow-sm transition-all"
                >
                  إنشاء الحساب والمتابعة
                </button>
              </form>
            )}

            {/* TAB: FORGOT PASSWORD */}
            {tab === 'forgot' && (
              <div className="space-y-4 pt-6">
                <p className="text-xs text-[#687C58]">
                  أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور فوراً.
                </p>

                {forgotSent ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      className="w-full bg-[#F8F5EE] border border-[#E8DCC8] rounded-xl px-3.5 py-2.5 text-xs text-[#16382F] focus:border-[#16382F] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setForgotSent(true)}
                      className="w-full py-2.5 rounded-full bg-[#16382F] text-white font-semibold text-xs hover:bg-[#20493E] transition-colors"
                    >
                      إرسال رابط الاستعادة
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-xs text-[#687C58] hover:text-[#16382F] block text-center w-full"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-[#E8DCC8] flex items-center justify-between text-[11px] text-[#687C58]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B59A6B]" />
              حفظ مشفر ومعتمد وفق معايير PDPL
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
