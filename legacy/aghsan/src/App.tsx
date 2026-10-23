import React, { useState, useEffect } from 'react';
import { 
  loadDatabase, 
  saveDatabase, 
  resetDatabaseToDemo, 
  getActiveTree, 
  canAddPeopleToTree, 
  canInviteReviewer,
  AghsanDatabase
} from './lib/storage';
import { 
  User, 
  Person, 
  FamilyTree, 
  ContributionRequest, 
  ReviewerInvitation, 
  TreeInvitation, 
  SubscriptionPlan,
  Subscription,
  Gender
} from './types';

// Components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { StorytellingFlow } from './components/landing/StorytellingFlow';
import { PricingSection } from './components/landing/PricingSection';
import { FAQSection } from './components/landing/FAQSection';
import { FinalCTA } from './components/landing/FinalCTA';

import { TreeCanvas } from './components/tree/TreeCanvas';
import { BranchSelector } from './components/contribute/BranchSelector';
import { BranchBuilderWorkspace } from './components/contribute/BranchBuilderWorkspace';
import { ReviewQueue } from './components/reviews/ReviewQueue';
import { ReviewDetailModal } from './components/reviews/ReviewDetailModal';
import { ReviewerManagement } from './components/reviewers/ReviewerManagement';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { BillingView } from './components/dashboard/BillingView';
import { AuditLogView } from './components/dashboard/AuditLogView';
import { AdminPanel } from './components/dashboard/AdminPanel';
import { ShareTreeModal } from './components/dashboard/ShareTreeModal';
import { AuthModal } from './components/auth/AuthModal';

import { 
  Layers, 
  Clock, 
  UserCheck, 
  CreditCard, 
  History, 
  ShieldAlert, 
  RotateCcw,
  GitBranch,
  Home,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<AghsanDatabase>(() => loadDatabase());
  const [currentView, setCurrentView] = useState<string>('landing');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'reviews' | 'reviewers' | 'billing' | 'history' | 'admin'>('overview');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeReviewDetail, setActiveReviewDetail] = useState<ContributionRequest | null>(null);
  const [reviewFocusBranchId, setReviewFocusBranchId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Contributor Journey State
  const [contributeBranchRoot, setContributeBranchRoot] = useState<Person | null>(null);
  const [contributeTargetPerson, setContributeTargetPerson] = useState<Person | null>(null);

  // Active Tree and Subscription
  const activeTree = getActiveTree(db);
  const activePlan = db.plans.find(p => p.id === activeTree.subscriptionPlanId) || db.plans[1];
  const activeSubscription = db.subscriptions.find(s => s.treeId === activeTree.id) || db.subscriptions[0];
  const pendingReviewsCount = db.contributions.filter(c => c.status === 'PENDING').length;

  // Persist state changes
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  // Navigation router
  const handleNavigate = (view: string, param?: string) => {
    if (view === 'dashboard' && param) {
      setCurrentView('dashboard');
      setDashboardTab(param as any);
      return;
    }
    if (view === 'landing' && param === 'how-it-works') {
      setCurrentView('landing');
      setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Switch active user role
  const handleSwitchUser = (user: User) => {
    setDb(prev => ({
      ...prev,
      currentUser: user
    }));
  };

  // Direct add relative (by tree owner or reviewer)
  const handleAddRelativeDirect = (data: any, relativeToPerson: Person) => {
    const limitCheck = canAddPeopleToTree(db, activeTree.id, 1);
    if (!limitCheck.allowed) {
      setToastMessage(limitCheck.message || 'تم بلوغ الحد الأقصى لعدد الأفراد في باقتك الحالية.');
      return;
    }

    const newId = `p-${Date.now()}`;
    const isChild = data.relationType === 'son' || data.relationType === 'daughter';

    const newPerson: Person = {
      id: newId,
      treeId: activeTree.id,
      fullName: data.fullName,
      shortName: data.shortName,
      gender: data.gender,
      generation: isChild ? relativeToPerson.generation + 1 : relativeToPerson.generation,
      fatherId: isChild && relativeToPerson.gender === 'male' ? relativeToPerson.id : undefined,
      motherId: isChild && relativeToPerson.gender === 'female' ? relativeToPerson.id : undefined,
      spouseIds: data.relationType === 'spouse' ? [relativeToPerson.id] : undefined,
      branchRootId: relativeToPerson.branchRootId || (relativeToPerson.generation === 2 ? relativeToPerson.id : undefined),
      birthYear: data.birthYear,
      deathYear: data.deathYear,
      isDeceased: data.isDeceased,
      occupation: data.occupation,
      residence: data.residence,
      biography: data.biography,
      isApproved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If spouse, update relativeToPerson too
    const updatedPeople = db.people.map(p => {
      if (p.id === relativeToPerson.id && data.relationType === 'spouse') {
        const existingSpouses = p.spouseIds || [];
        return { ...p, spouseIds: [...existingSpouses, newId] };
      }
      return p;
    });

    setDb(prev => ({
      ...prev,
      people: [...updatedPeople, newPerson],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: activeTree.id,
          actorName: prev.currentUser.name,
          action: 'PERSON_ADDED',
          details: `إضافة الفرد ${data.shortName} مباشرة تحت ${relativeToPerson.shortName}.`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));
  };

  // Submit Collaborative Contribution from Branch Builder
  const handleSubmitContribution = (data: {
    contributorName: string;
    contributorPhone?: string;
    notes?: string;
    proposedPeople: any[];
    proposedRelationships: any[];
  }) => {
    const newReq: ContributionRequest = {
      id: `req-${Date.now()}`,
      treeId: activeTree.id,
      contributorName: data.contributorName,
      contributorPhone: data.contributorPhone,
      branchName: contributeBranchRoot ? `فرع ${contributeBranchRoot.shortName}` : 'غصن العائلة',
      targetPersonId: contributeTargetPerson ? contributeTargetPerson.id : activeTree.rootAncestorId,
      targetPersonName: contributeTargetPerson ? contributeTargetPerson.shortName : 'الجد الأساسي',
      proposedPeople: data.proposedPeople,
      proposedRelationships: data.proposedRelationships,
      status: 'PENDING',
      notes: data.notes,
      submittedAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      contributions: [newReq, ...prev.contributions],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          treeId: activeTree.id,
          title: 'طلب إضافة غصن عائلي جديد',
          message: `قدم ${data.contributorName} طلباً لإضافة ${data.proposedPeople.length} أفراد في ${newReq.branchName}.`,
          type: 'contribution_submitted',
          linkTarget: 'reviews',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...prev.notifications
      ]
    }));
  };

  // Review Approvals
  const handleApproveAllRequest = (request: ContributionRequest) => {
    // Plan limit check
    const limitCheck = canAddPeopleToTree(db, activeTree.id, request.proposedPeople.length);
    if (!limitCheck.allowed) {
      alert(limitCheck.message);
      return;
    }

    const idMapping = new Map<string, string>();
    const newlyCreatedPeople: Person[] = [];

    // Map temp IDs to permanent IDs
    request.proposedPeople.forEach(prop => {
      const permanentId = `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      idMapping.set(prop.tempId, permanentId);
    });

    const targetPerson = db.people.find(p => p.id === request.targetPersonId);
    const branchRootId = targetPerson?.branchRootId || targetPerson?.id;

    request.proposedPeople.forEach(prop => {
      const permanentId = idMapping.get(prop.tempId)!;
      // Resolve relative attachment
      const realParentId = idMapping.get(prop.relativeToId) || prop.relativeToId;
      const isSpouse = prop.relationship === 'spouse';

      const parentPerson = db.people.find(p => p.id === realParentId) || 
        newlyCreatedPeople.find(p => p.id === realParentId) || 
        targetPerson;

      const gen = parentPerson ? (isSpouse ? parentPerson.generation : parentPerson.generation + 1) : 3;

      newlyCreatedPeople.push({
        id: permanentId,
        treeId: activeTree.id,
        fullName: prop.fullName,
        shortName: prop.shortName,
        gender: prop.gender,
        generation: gen,
        fatherId: !isSpouse && parentPerson?.gender === 'male' ? parentPerson.id : undefined,
        motherId: !isSpouse && parentPerson?.gender === 'female' ? parentPerson.id : undefined,
        spouseIds: isSpouse && parentPerson ? [parentPerson.id] : undefined,
        branchRootId,
        birthYear: prop.birthYear,
        biography: prop.biography,
        isApproved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    // Update DB transactionally
    setDb(prev => ({
      ...prev,
      people: [...prev.people, ...newlyCreatedPeople],
      contributions: prev.contributions.map(c => 
        c.id === request.id ? { ...c, status: 'APPROVED', reviewedAt: new Date().toISOString(), reviewedBy: prev.currentUser.name } : c
      ),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: activeTree.id,
          actorName: prev.currentUser.name,
          action: 'CONTRIBUTION_APPROVED',
          details: `اعتماد طلب المساهمة المقدم من ${request.contributorName} وإضافة ${newlyCreatedPeople.length} أفراد للشجرة.`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          treeId: activeTree.id,
          title: 'تم اعتماد المساهمة بنجاح',
          message: `تم اعتماد إضافات ${request.contributorName} (${newlyCreatedPeople.length} أفراد) وربطهم بالشجرة.`,
          type: 'contribution_approved',
          linkTarget: 'tree',
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...prev.notifications
      ]
    }));

    setActiveReviewDetail(null);
  };

  // Reject Request
  const handleRejectRequest = (request: ContributionRequest, reason: string) => {
    setDb(prev => ({
      ...prev,
      contributions: prev.contributions.map(c => 
        c.id === request.id ? { 
          ...c, 
          status: 'REJECTED', 
          reviewerNotes: reason,
          reviewedAt: new Date().toISOString(), 
          reviewedBy: prev.currentUser.name 
        } : c
      ),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: activeTree.id,
          actorName: prev.currentUser.name,
          action: 'CONTRIBUTION_REJECTED',
          details: `رفض طلب المساهمة المقدم من ${request.contributorName}. السبب: ${reason}`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    setActiveReviewDetail(null);
  };

  // Request Revision
  const handleRequestRevision = (request: ContributionRequest, note: string) => {
    setDb(prev => ({
      ...prev,
      contributions: prev.contributions.map(c => 
        c.id === request.id ? { 
          ...c, 
          status: 'REVISION_REQUESTED', 
          reviewerNotes: note,
          reviewedAt: new Date().toISOString(), 
          reviewedBy: prev.currentUser.name 
        } : c
      )
    }));

    setActiveReviewDetail(null);
  };

  // Invite Reviewer
  const handleInviteReviewer = (data: {
    email: string;
    name?: string;
    scope: 'ALL_TREE' | 'BRANCH';
    branchRootId?: string;
    branchName?: string;
  }) => {
    const limitCheck = canInviteReviewer(db, activeTree.id);
    if (!limitCheck.allowed) {
      return { success: false, message: limitCheck.message };
    }

    const newRev: ReviewerInvitation = {
      id: `rev-${Date.now()}`,
      treeId: activeTree.id,
      email: data.email,
      name: data.name,
      scope: data.scope,
      branchRootId: data.branchRootId,
      branchName: data.branchName,
      token: `tok-${Math.random().toString(36).substring(2, 9)}`,
      status: 'ACCEPTED', // Demo auto-activated
      invitedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      reviewers: [...prev.reviewers, newRev],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: activeTree.id,
          actorName: prev.currentUser.name,
          action: 'REVIEWER_INVITED',
          details: `دعوة المدقق ${data.name || data.email} بنطاق: ${data.branchName || 'كامل الشجرة'}.`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    return { success: true };
  };

  // Revoke Reviewer
  const handleRevokeReviewer = (revId: string) => {
    setDb(prev => ({
      ...prev,
      reviewers: prev.reviewers.map(r => r.id === revId ? { ...r, status: 'REVOKED' } : r),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: activeTree.id,
          actorName: prev.currentUser.name,
          action: 'REVIEWER_REVOKED',
          details: `إلغاء صلاحية المدقق المساعد.`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));
  };

  // Complete Onboarding (Creating new tree & subscription)
  const handleCompleteOnboarding = (data: {
    tree: Partial<FamilyTree>;
    rootPerson: Partial<Person>;
    subscription: Partial<Subscription>;
  }) => {
    const newTree = data.tree as FamilyTree;
    const newRoot = data.rootPerson as Person;
    const newSub = data.subscription as Subscription;

    // Reset tree and people with new root
    setDb(prev => ({
      ...prev,
      trees: [newTree, ...prev.trees],
      activeTreeId: newTree.id,
      people: [newRoot],
      subscriptions: [newSub, ...prev.subscriptions],
      contributions: [],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: newTree.id,
          actorName: prev.currentUser.name,
          action: 'PERSON_ADDED',
          details: `تأسيس الشجرة وإضافة الجد المؤسس: ${newRoot.fullName}`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    setCurrentView('tree');
  };

  // Upgrade Plan
  const handleUpgradePlan = (newPlanId: 'family' | 'extended' | 'tribe', cycle: 'monthly' | 'annual') => {
    const targetPlan = db.plans.find(p => p.id === newPlanId);
    if (!targetPlan) return;

    const amount = cycle === 'annual' ? targetPlan.priceAnnualSAR : targetPlan.priceMonthlySAR;

    setDb(prev => ({
      ...prev,
      trees: prev.trees.map(t => t.id === activeTree.id ? { ...t, subscriptionPlanId: newPlanId } : t),
      subscriptions: prev.subscriptions.map(s => s.treeId === activeTree.id ? {
        ...s,
        planId: newPlanId,
        billingCycle: cycle,
        amountPaidSAR: amount,
        paymentReference: `MOY-SA-UPG-${Math.floor(100000 + Math.random() * 900000)}`
      } : s),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          treeId: activeTree.id,
          actorName: prev.currentUser.name,
          action: 'PLAN_UPGRADED',
          details: `ترقية باقة الشجرة إلى باقة ${targetPlan.nameAr} وسداد ${amount} ر.س بنجاح.`,
          createdAt: new Date().toISOString()
        },
        ...prev.auditLogs
      ]
    }));

    alert(`تمت الترقية بنجاح إلى باقة ${targetPlan.nameAr}! تتوفر الآن حدود ومقاعد إضافية للشجرة.`);
  };

  // Update SaaS Plan Pricing (Admin only)
  const handleUpdatePlanAdmin = (updatedPlan: SubscriptionPlan) => {
    setDb(prev => ({
      ...prev,
      plans: prev.plans.map(p => p.id === updatedPlan.id ? updatedPlan : p)
    }));
  };

  // Reset demo data
  const handleResetData = () => {
    setResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    const initial = resetDatabaseToDemo();
    setDb(initial);
    setCurrentView('tree');
    setResetModalOpen(false);
    setToastMessage('تمت استعادة البيانات النموذجية لشجرة الجد محمد بن عبدالله بنجاح.');
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#202B26] flex flex-col font-['IBM_Plex_Sans_Arabic',sans-serif] selection:bg-[#B59A6B]/20 selection:text-[#16382F]">
      
      {/* Universal Floating Header */}
      <Navbar
        currentUser={db.currentUser}
        users={db.users}
        currentView={currentView}
        onNavigate={handleNavigate}
        onSwitchUser={handleSwitchUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={() => {
          setDb(prev => ({ ...prev, currentUser: db.users[2] })); // Switch to Contributor role
          setCurrentView('landing');
        }}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main View Router */}
      <main className="flex-1">
        
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <div>
            <HeroSection
              onStartTree={() => setCurrentView('onboarding')}
              onExploreTree={() => setCurrentView('tree')}
              onHowItWorks={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <StorytellingFlow
              onStartTree={() => setCurrentView('onboarding')}
              onExploreTree={() => setCurrentView('tree')}
            />
            <PricingSection
              plans={db.plans}
              onSelectPlan={(pId, cycle) => {
                setCurrentView('onboarding');
              }}
            />
            <FAQSection />
            <FinalCTA onStartTree={() => setCurrentView('onboarding')} />
          </div>
        )}

        {/* VIEW 2: FULL INTERACTIVE TREE */}
        {currentView === 'tree' && (
          <div className="relative">
            <TreeCanvas
              tree={activeTree}
              people={db.people}
              currentUser={db.currentUser}
              onAddRelativeDirect={handleAddRelativeDirect}
              onNavigateToContribute={(person) => {
                const branchRoot = db.people.find(p => p.id === person.branchRootId) || person;
                setContributeBranchRoot(branchRoot);
                setContributeTargetPerson(person);
                setCurrentView('contribute_workspace');
              }}
              onOpenShareModal={() => setShareModalOpen(true)}
              reviewFocusBranchId={reviewFocusBranchId}
            />
          </div>
        )}

        {/* VIEW 3: CONTRIBUTOR JOURNEY - BRANCH SELECTOR */}
        {currentView === 'contribute_select' && (
          <div className="py-12 bg-[#F7F5EF]">
            <BranchSelector
              tree={activeTree}
              people={db.people}
              onSelectTarget={(branchRoot, targetPerson) => {
                setContributeBranchRoot(branchRoot);
                setContributeTargetPerson(targetPerson);
                setCurrentView('contribute_workspace');
              }}
              onCancel={() => setCurrentView('tree')}
            />
          </div>
        )}

        {/* VIEW 4: CONTRIBUTOR JOURNEY - BRANCH BUILDER WORKSPACE */}
        {currentView === 'contribute_workspace' && contributeBranchRoot && contributeTargetPerson && (
          <div className="py-12 bg-[#F7F5EF]">
            <BranchBuilderWorkspace
              treeName={activeTree.name}
              branchRoot={contributeBranchRoot}
              targetPerson={contributeTargetPerson}
              contributorDefaultName={db.currentUser?.role === 'contributor' ? db.currentUser.name : ''}
              onSubmitContribution={handleSubmitContribution}
              onCancel={() => setCurrentView('tree')}
            />
          </div>
        )}

        {/* VIEW 5: ONBOARDING & CHECKOUT */}
        {currentView === 'onboarding' && (
          <div className="py-12 bg-[#F7F5EF]">
            <OnboardingFlow
              plans={db.plans}
              onComplete={handleCompleteOnboarding}
              onCancel={() => setCurrentView('landing')}
            />
          </div>
        )}

        {/* VIEW 6: PRICING STANDALONE */}
        {currentView === 'pricing' && (
          <div className="py-6">
            <PricingSection
              plans={db.plans}
              onSelectPlan={() => setCurrentView('onboarding')}
            />
          </div>
        )}

        {/* VIEW 7: AUTHENTICATED DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="min-h-[calc(100vh-80px)] bg-[#F8F5EE] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              
              {/* Dashboard Sub-tabs Navigation */}
              <div className="bg-white rounded-3xl p-2 border border-[#E8DCC8] shadow-[0_4px_24px_rgba(22,56,47,0.04)] flex items-center justify-between overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDashboardTab('overview')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                      dashboardTab === 'overview'
                        ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm'
                        : 'text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>نظرة عامة</span>
                  </button>

                  <button
                    onClick={() => setDashboardTab('reviews')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 relative ${
                      dashboardTab === 'reviews'
                        ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm'
                        : 'text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>طلبات الإضافة</span>
                    {pendingReviewsCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {pendingReviewsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setDashboardTab('reviewers')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                      dashboardTab === 'reviewers'
                        ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm'
                        : 'text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>المدققون والصلاحيات</span>
                  </button>

                  <button
                    onClick={() => setDashboardTab('billing')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                      dashboardTab === 'billing'
                        ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm'
                        : 'text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>الاشتراك والفواتير</span>
                  </button>

                  <button
                    onClick={() => setDashboardTab('history')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                      dashboardTab === 'history'
                        ? 'bg-[#16382F] text-[#F8F5EE] shadow-sm'
                        : 'text-[#687C58] hover:text-[#16382F] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>سجل التدقيق</span>
                  </button>

                  {db.currentUser?.role === 'admin' && (
                    <button
                      onClick={() => setDashboardTab('admin')}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                        dashboardTab === 'admin'
                          ? 'bg-[#B59A6B] text-[#16382F] shadow-sm font-bold'
                          : 'text-[#8C6D3B] hover:bg-[#F8F5EE]'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>إدارة المنصة (SaaS Admin)</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetData}
                    title="إعادة تعيين البيانات للنموذج الأولي"
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#687C58] hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إعادة ضبط النموذج التجريبي</span>
                  </button>
                </div>
              </div>

              {/* Dashboard Content Pages */}
              {dashboardTab === 'overview' && (
                <DashboardOverview
                  tree={activeTree}
                  people={db.people}
                  plan={activePlan}
                  subscription={activeSubscription}
                  contributions={db.contributions}
                  reviewers={db.reviewers}
                  auditLogs={db.auditLogs}
                  currentUser={db.currentUser}
                  onNavigate={handleNavigate}
                  onOpenShareModal={() => setShareModalOpen(true)}
                />
              )}

              {dashboardTab === 'reviews' && (
                <ReviewQueue
                  requests={db.contributions}
                  people={db.people}
                  currentUser={db.currentUser}
                  onOpenDetail={(req) => setActiveReviewDetail(req)}
                />
              )}

              {dashboardTab === 'reviewers' && (
                <ReviewerManagement
                  tree={activeTree}
                  reviewers={db.reviewers}
                  people={db.people}
                  plan={activePlan}
                  onInviteReviewer={handleInviteReviewer}
                  onRevokeReviewer={handleRevokeReviewer}
                />
              )}

              {dashboardTab === 'billing' && (
                <BillingView
                  tree={activeTree}
                  subscription={activeSubscription}
                  plans={db.plans}
                  onUpgradePlan={handleUpgradePlan}
                />
              )}

              {dashboardTab === 'history' && (
                <AuditLogView logs={db.auditLogs} />
              )}

              {dashboardTab === 'admin' && (
                <AdminPanel
                  plans={db.plans}
                  users={db.users}
                  trees={db.trees}
                  totalPeopleCount={db.people.length}
                  onUpdatePlan={handleUpdatePlanAdmin}
                />
              )}

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Review Request Diff Inspector Modal */}
      <ReviewDetailModal
        request={activeReviewDetail}
        people={db.people}
        onClose={() => setActiveReviewDetail(null)}
        onApproveAll={handleApproveAllRequest}
        onPartialApprove={(req, ids) => handleApproveAllRequest(req)}
        onReject={handleRejectRequest}
        onRequestRevision={handleRequestRevision}
        onInspectOnTree={(targetId) => {
          setActiveReviewDetail(null);
          setReviewFocusBranchId(targetId);
          setCurrentView('tree');
        }}
      />

      {/* Share Modal */}
      <ShareTreeModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        tree={activeTree}
        people={db.people}
        invitations={db.treeInvitations}
        onCreateInvitation={() => {}}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        users={db.users}
        onLoginSuccess={(user) => {
          handleSwitchUser(user);
          setCurrentView('dashboard');
        }}
        onRegisterSuccess={(newUser) => {
          setDb(prev => ({
            ...prev,
            users: [...prev.users, newUser],
            currentUser: newUser
          }));
          setCurrentView('onboarding');
        }}
      />

      {/* Reset Demo Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#16382F]/50 backdrop-blur-sm flex items-center justify-center p-4 text-right">
          <div className="w-full max-w-md bg-white border border-[#E8DCC8] rounded-3xl shadow-[0_20px_50px_rgba(22,56,47,0.15)] p-6 text-[#202B26] space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-[#16382F]">
              إعادة ضبط النموذج التجريبي
            </h3>
            <p className="text-xs text-[#687C58] leading-relaxed">
              هل ترغب في إعادة تعيين كافة بيانات الشجرة والتعديلات الحالية والعودة للنموذج الأولي المعتمد (شجرة الجد محمد بن عبدالله)؟
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 text-xs text-[#687C58] hover:text-[#16382F]"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-6 py-2.5 rounded-full bg-rose-700 hover:bg-rose-800 text-white font-medium text-xs shadow-sm transition-all"
              >
                تأكيد إعادة الضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal In-App Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#16382F] text-[#F8F5EE] border border-[#B59A6B]/40 px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-[#E8DCC8]"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}
