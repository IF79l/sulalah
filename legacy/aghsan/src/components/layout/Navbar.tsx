import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
  ChevronDown, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Compass,
  ArrowLeft
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  users: User[];
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  onSwitchUser: (user: User) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  pendingReviewsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  users,
  currentView,
  onNavigate,
  onSwitchUser,
  onOpenAuth,
  onLogout,
  pendingReviewsCount
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const roleLabels: Record<string, { label: string; desc: string }> = {
    owner: { label: 'مالك الشجرة والمدقق', desc: 'كامل الصلاحيات' },
    reviewer: { label: 'مدقق مساعد', desc: 'فرع متروك بن محمد' },
    contributor: { label: 'مساهم عائلي', desc: 'مساهمة وبناء أغصان' },
    admin: { label: 'مدير المنصة', desc: 'إدارة باقات SaaS' },
  };

  const isLanding = currentView === 'landing';

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300">
      <div className={`w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-[#F8F5EE]/90 backdrop-blur-md border-b border-[#E8DCC8]/80 shadow-xs' 
          : isLanding
          ? 'bg-transparent border-b border-white/10'
          : 'bg-[#F8F5EE]/95 border-b border-[#E8DCC8]'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20 gap-8">
            
            {/* Zone 1: Brand Wordmark with custom original botanical mark */}
            <div 
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3.5 cursor-pointer group shrink-0"
            >
              {/* Original Botanical Branch Symbol */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isLanding && !scrolled 
                  ? 'bg-white/10 backdrop-blur-md text-[#E8DCC8] border border-white/20 group-hover:border-[#B59A6B]' 
                  : 'bg-[#16382F] text-[#E8DCC8] border border-[#16382F]'
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22V8" />
                  <path d="M12 14C12 14 7.5 12 6 8C9.5 8 11.5 10.5 12 12" />
                  <path d="M12 11C12 11 16.5 9 18 5C14.5 5 12.5 7.5 12 9" />
                  <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="8" r="1.2" fill="currentColor" />
                  <circle cx="18" cy="5" r="1.2" fill="currentColor" />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className={`font-['Alexandria'] text-2xl font-bold tracking-tight whitespace-nowrap leading-none ${
                  isLanding && !scrolled ? 'text-[#F8F5EE]' : 'text-[#16382F]'
                }`}>
                  أغصان
                </span>
                <span className={`text-[10px] tracking-wide mt-1 font-medium ${
                  isLanding && !scrolled ? 'text-[#A5B39A]' : 'text-[#687C58]'
                }`}>
                  ذاكرة الأجيال
                </span>
              </div>
            </div>

            {/* Zone 2: 4-5 Concise Single-Line Text Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <button
                onClick={() => onNavigate('landing')}
                className={`transition-colors whitespace-nowrap py-1 relative ${
                  currentView === 'landing'
                    ? 'text-[#B59A6B] font-semibold after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-[#B59A6B]'
                    : isLanding && !scrolled 
                    ? 'text-[#F8F5EE]/85 hover:text-white' 
                    : 'text-[#202B26]/80 hover:text-[#16382F]'
                }`}
              >
                الرئيسية
              </button>

              <button
                onClick={() => onNavigate('tree')}
                className={`transition-colors whitespace-nowrap py-1 relative ${
                  currentView === 'tree'
                    ? 'text-[#B59A6B] font-semibold after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-[#B59A6B]'
                    : isLanding && !scrolled 
                    ? 'text-[#F8F5EE]/85 hover:text-white' 
                    : 'text-[#202B26]/80 hover:text-[#16382F]'
                }`}
              >
                الشجرة التفاعلية
              </button>

              <button
                onClick={() => onNavigate('landing', 'how-it-works')}
                className={`transition-colors whitespace-nowrap py-1 ${
                  isLanding && !scrolled 
                    ? 'text-[#F8F5EE]/85 hover:text-white' 
                    : 'text-[#202B26]/80 hover:text-[#16382F]'
                }`}
              >
                كيف تعمل
              </button>

              <button
                onClick={() => onNavigate('pricing')}
                className={`transition-colors whitespace-nowrap py-1 relative ${
                  currentView === 'pricing'
                    ? 'text-[#B59A6B] font-semibold after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-[#B59A6B]'
                    : isLanding && !scrolled 
                    ? 'text-[#F8F5EE]/85 hover:text-white' 
                    : 'text-[#202B26]/80 hover:text-[#16382F]'
                }`}
              >
                الباقات
              </button>

              <button
                onClick={() => onNavigate('dashboard')}
                className={`transition-colors whitespace-nowrap py-1 relative flex items-center gap-1.5 ${
                  currentView.startsWith('dashboard')
                    ? 'text-[#B59A6B] font-semibold after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-[#B59A6B]'
                    : isLanding && !scrolled 
                    ? 'text-[#F8F5EE]/85 hover:text-white' 
                    : 'text-[#202B26]/80 hover:text-[#16382F]'
                }`}
              >
                <span>لوحة التحكم</span>
                {pendingReviewsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#B59A6B] text-[#16382F] text-[10px] font-bold flex items-center justify-center">
                    {pendingReviewsCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Zone 3: 1 Primary Action & Profile Switcher */}
            <div className="flex items-center gap-3 shrink-0">
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-right transition-all border ${
                      isLanding && !scrolled
                        ? 'bg-black/20 hover:bg-black/35 border-white/20 text-[#F8F5EE]'
                        : 'bg-white hover:bg-[#F8F5EE] border-[#E8DCC8] text-[#202B26]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#16382F] text-[#E8DCC8] flex items-center justify-center font-bold text-xs">
                      {currentUser.name.charAt(0)}
                    </div>
                    <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-[#E8DCC8] shadow-xl p-2 text-right z-50 text-[#202B26] animate-in fade-in zoom-in-95">
                      <div className="p-3 border-b border-[#E8DCC8]/60">
                        <p className="text-xs font-bold text-[#16382F]">{currentUser.name}</p>
                        <p className="text-[11px] text-[#687C58]">{currentUser.email}</p>
                        <p className="text-[11px] text-[#B59A6B] font-semibold mt-1">
                          {roleLabels[currentUser.role]?.label}
                        </p>
                      </div>

                      {/* Role switcher for instant interactive testing */}
                      <div className="py-2 border-b border-[#E8DCC8]/60">
                        <span className="text-[10px] font-bold text-[#687C58] px-2 block mb-1">
                          تبديل دور المستخدم (تجربة الأدوار):
                        </span>
                        {users.map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setUserDropdownOpen(false);
                            }}
                            className={`w-full text-right px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              u.id === currentUser.id ? 'bg-[#F8F5EE] text-[#16382F] font-bold' : 'hover:bg-[#F8F5EE] text-[#202B26]/80'
                            }`}
                          >
                            <span>{u.name.split(' ')[0]}</span>
                            <span className="text-[10px] text-[#687C58]">{roleLabels[u.role]?.label.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => {
                            onNavigate('dashboard');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-right px-2.5 py-1.5 rounded-xl text-xs hover:bg-[#F8F5EE] text-[#16382F] font-medium"
                        >
                          فتح لوحة التحكم
                        </button>
                        <button
                          onClick={() => {
                            onLogout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-right px-2.5 py-1.5 rounded-xl text-xs text-rose-700 hover:bg-rose-50 font-medium"
                        >
                          تسجيل الخروج
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                    isLanding && !scrolled 
                      ? 'text-[#F8F5EE] hover:text-[#B59A6B]' 
                      : 'text-[#16382F] hover:text-[#687C58]'
                  }`}
                >
                  تسجيل الدخول
                </button>
              )}

              {/* Primary Action Button */}
              <button
                onClick={() => onNavigate('onboarding')}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16382F] hover:bg-[#202B26] text-[#F8F5EE] text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-98 whitespace-nowrap shrink-0 border border-[#16382F]"
              >
                <span>ابدأ شجرتك</span>
                <ArrowLeft className="w-3.5 h-3.5 text-[#B59A6B]" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-xl ${
                  isLanding && !scrolled ? 'text-white' : 'text-[#16382F]'
                }`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#E8DCC8]/60 bg-[#F8F5EE] rounded-b-2xl px-2 space-y-2 text-[#202B26]">
              <button
                onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
                className="block w-full text-right px-4 py-2 text-sm font-medium hover:bg-white rounded-xl"
              >
                الرئيسية
              </button>
              <button
                onClick={() => { onNavigate('tree'); setMobileMenuOpen(false); }}
                className="block w-full text-right px-4 py-2 text-sm font-semibold text-[#16382F] hover:bg-white rounded-xl"
              >
                الشجرة التفاعلية
              </button>
              <button
                onClick={() => { onNavigate('landing', 'how-it-works'); setMobileMenuOpen(false); }}
                className="block w-full text-right px-4 py-2 text-sm font-medium hover:bg-white rounded-xl"
              >
                كيف تعمل المنصة
              </button>
              <button
                onClick={() => { onNavigate('pricing'); setMobileMenuOpen(false); }}
                className="block w-full text-right px-4 py-2 text-sm font-medium hover:bg-white rounded-xl"
              >
                الباقات
              </button>
              <button
                onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                className="block w-full text-right px-4 py-2 text-sm font-medium hover:bg-white rounded-xl"
              >
                لوحة التحكم
              </button>
              <button
                onClick={() => { onNavigate('onboarding'); setMobileMenuOpen(false); }}
                className="w-full py-3 rounded-full bg-[#16382F] text-[#F8F5EE] text-xs font-bold text-center mt-2 shadow"
              >
                ابدأ بناء شجرة عائلتك الآن
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
