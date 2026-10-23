import { 
  FamilyTree, 
  Person, 
  PersonRelationship, 
  ContributionRequest, 
  ReviewerInvitation, 
  TreeInvitation, 
  SubscriptionPlan, 
  Subscription, 
  NotificationItem, 
  AuditLog, 
  User 
} from '../types';

const STORAGE_KEY = 'aghsan_data_v1';

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'family',
    nameAr: 'العائلة',
    nameEn: 'Family',
    descriptionAr: 'مثالية للعائلات الصغيرة لتوثيق الأجيال ومشاركة الرابط مع الأبناء.',
    priceMonthlySAR: 99,
    priceAnnualSAR: 890,
    maxPeople: 50,
    maxReviewers: 1,
    featuresAr: [
      'توثيق حتى 50 فرداً في الشجرة',
      'شجرة عائلة تفاعلية كاملة',
      'مدقق مساعد واحد بجانب المالك',
      'روابط دعوة للمساهمة من العائلة',
      'نظام مراجعة واعتماد الإضافات',
      'ملفات تعريفية شخصية لكل فرد',
      'بحث سريع في أفراد العائلة'
    ]
  },
  {
    id: 'extended',
    nameAr: 'العائلة الممتدة',
    nameEn: 'Extended Family',
    descriptionAr: 'الخيار الأفضل للعائلات الكبيرة والأفخاذ مع إدارة موزعة للأغصان.',
    priceMonthlySAR: 199,
    priceAnnualSAR: 1790,
    maxPeople: 500,
    maxReviewers: 5,
    isPopular: true,
    featuresAr: [
      'توثيق حتى 500 فرد في الشجرة',
      'كل مزايا باقة العائلة',
      '5 مدققين مساعدين مع تحديد الأغصان',
      'صلاحيات تدقيق خاصة لكل غصن',
      'سجل تاريخ التعديلات والاعتمادات',
      'تصدير الشجرة بجودة عالية للطباعة',
      'دعم فني مخصص ذو أولوية'
    ]
  },
  {
    id: 'tribe',
    nameAr: 'القبيلة',
    nameEn: 'Tribe & Lineage',
    descriptionAr: 'مصممة للقبائل والأسر العريقة لتوثيق الأنساب الضخمة وحفظ التاريخ.',
    priceMonthlySAR: 499,
    priceAnnualSAR: 4490,
    maxPeople: 10000,
    maxReviewers: 20,
    featuresAr: [
      'توثيق حتى 10,000 فرد في الشجرة',
      '20 مدققاً مساعداً مع إدارة صلاحيات معقدة',
      'محرك عالي الأداء للأشجار الضخمة',
      'سجل تدقيق كامل ومؤرشف (Audit Log)',
      'تخصيص كامل لواجهة الشجرة والعرض',
      'تصدير وطباعة بمقاسات جدارية ضخمة',
      'استشارات أنساب ومدير حساب خاص'
    ]
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-owner',
    name: 'عبد العزيز بن محمد آل محمد',
    email: 'owner@aghsan.sa',
    role: 'owner',
    phone: '+966501234567',
    createdAt: '2026-01-01T10:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-reviewer',
    name: 'سالم بن متروك آل محمد',
    email: 'reviewer@aghsan.sa',
    role: 'reviewer',
    phone: '+966507654321',
    createdAt: '2026-01-05T12:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-contributor',
    name: 'فهد بن سالم آل محمد',
    email: 'contributor@aghsan.sa',
    role: 'contributor',
    phone: '+966509988776',
    createdAt: '2026-01-10T09:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-admin',
    name: 'مدير منصة أغصان',
    email: 'admin@aghsan.sa',
    role: 'admin',
    phone: '+966500000000',
    createdAt: '2025-12-01T08:00:00Z',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  }
];

const TREE_ID = 'tree-mohammed-main';
const ROOT_PERSON_ID = 'p-root-mohammed';

export const INITIAL_PEOPLE: Person[] = [
  // Generation 1 (Root Ancestor)
  {
    id: ROOT_PERSON_ID,
    treeId: TREE_ID,
    fullName: 'محمد بن عبدالله بن إبراهيم آل محمد',
    shortName: 'الجد محمد بن عبدالله',
    gender: 'male',
    generation: 1,
    birthYear: 1910,
    deathYear: 1988,
    isDeceased: true,
    biography: 'مؤسس فرع العائلة في الرياض، عُرف بالحكمة والكرم وإصلاح ذات البين بين القبائل.',
    occupation: 'تاجر ووجيه',
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 2 (Main Branches)
  {
    id: 'p-matrook',
    treeId: TREE_ID,
    fullName: 'متروك بن محمد بن عبدالله آل محمد',
    shortName: 'متروك بن محمد',
    gender: 'male',
    generation: 2,
    fatherId: ROOT_PERSON_ID,
    branchRootId: 'p-matrook',
    birthYear: 1935,
    deathYear: 2012,
    isDeceased: true,
    biography: 'الابن الأكبر للجد محمد، رأس فرع متروك.',
    occupation: 'مسؤول حكومي سابق',
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-dayfallah',
    treeId: TREE_ID,
    fullName: 'ضيف الله بن محمد بن عبدالله آل محمد',
    shortName: 'ضيف الله بن محمد',
    gender: 'male',
    generation: 2,
    fatherId: ROOT_PERSON_ID,
    branchRootId: 'p-dayfallah',
    birthYear: 1940,
    deathYear: 2019,
    isDeceased: true,
    biography: 'رأس فرع ضيف الله، كان صاحب مجلس عامر في القصيم.',
    residence: 'عنيزة',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-abdullah',
    treeId: TREE_ID,
    fullName: 'عبدالله بن محمد بن عبدالله آل محمد',
    shortName: 'عبدالله بن محمد',
    gender: 'male',
    generation: 2,
    fatherId: ROOT_PERSON_ID,
    branchRootId: 'p-abdullah',
    birthYear: 1945,
    isDeceased: false,
    biography: 'رأس فرع عبدالله، أطال الله في عمره، مهتم بتاريخ الأنساب وتوثيق العائلة.',
    residence: 'الدرعية',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-sarah',
    treeId: TREE_ID,
    fullName: 'سارة بنت محمد بن عبدالله آل محمد',
    shortName: 'سارة بنت محمد',
    gender: 'female',
    generation: 2,
    fatherId: ROOT_PERSON_ID,
    birthYear: 1948,
    isDeceased: false,
    biography: 'كريمة الجد محمد، مربية أجيال ومعلمة قرآن سابقة.',
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 3 - Branch Matrook
  {
    id: 'p-salem',
    treeId: TREE_ID,
    fullName: 'سالم بن متروك بن محمد آل محمد',
    shortName: 'سالم بن متروك',
    gender: 'male',
    generation: 3,
    fatherId: 'p-matrook',
    branchRootId: 'p-matrook',
    birthYear: 1968,
    isDeceased: false,
    biography: 'مهندس استشاري ورئيس لجنة صندوق العائلة.',
    residence: 'الرياض',
    spouseIds: ['p-mariam'],
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-mariam',
    treeId: TREE_ID,
    fullName: 'مريم بنت صالح التميمي',
    shortName: 'مريم التميمي',
    gender: 'female',
    generation: 3,
    spouseIds: ['p-salem'],
    birthYear: 1972,
    isDeceased: false,
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-ahmed',
    treeId: TREE_ID,
    fullName: 'أحمد بن متروك بن محمد آل محمد',
    shortName: 'أحمد بن متروك',
    gender: 'male',
    generation: 3,
    fatherId: 'p-matrook',
    branchRootId: 'p-matrook',
    birthYear: 1973,
    isDeceased: false,
    biography: 'رجل أعمال ومدير شركة استثمارية.',
    residence: 'الرياض',
    spouseIds: ['p-hayla'],
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-hayla',
    treeId: TREE_ID,
    fullName: 'هيلة بنت فهد الشمري',
    shortName: 'هيلة الشمري',
    gender: 'female',
    generation: 3,
    spouseIds: ['p-ahmed'],
    birthYear: 1978,
    isDeceased: false,
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 4 - Under Salem
  {
    id: 'p-fahad',
    treeId: TREE_ID,
    fullName: 'فهد بن سالم بن متروك آل محمد',
    shortName: 'فهد بن سالم',
    gender: 'male',
    generation: 4,
    fatherId: 'p-salem',
    motherId: 'p-mariam',
    branchRootId: 'p-matrook',
    birthYear: 1996,
    isDeceased: false,
    biography: 'طبيب جراحة عامة، مساهم نشط في منصة أغصان.',
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-khaled',
    treeId: TREE_ID,
    fullName: 'خالد بن سالم بن متروك آل محمد',
    shortName: 'خالد بن سالم',
    gender: 'male',
    generation: 4,
    fatherId: 'p-salem',
    motherId: 'p-mariam',
    branchRootId: 'p-matrook',
    birthYear: 2000,
    isDeceased: false,
    biography: 'طالب هندسة برمجيات في جامعة الملك سعود.',
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-noura',
    treeId: TREE_ID,
    fullName: 'نورة بنت سالم بن متروك آل محمد',
    shortName: 'نورة بنت سالم',
    gender: 'female',
    generation: 4,
    fatherId: 'p-salem',
    motherId: 'p-mariam',
    branchRootId: 'p-matrook',
    birthYear: 2004,
    isDeceased: false,
    biography: 'طالبة إدارة أعمال ومصممة جرافيك.',
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 4 - Under Ahmed
  {
    id: 'p-faisal',
    treeId: TREE_ID,
    fullName: 'فيصل بن أحمد بن متروك آل محمد',
    shortName: 'فيصل بن أحمد',
    gender: 'male',
    generation: 4,
    fatherId: 'p-ahmed',
    motherId: 'p-hayla',
    branchRootId: 'p-matrook',
    birthYear: 2002,
    isDeceased: false,
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-reem',
    treeId: TREE_ID,
    fullName: 'ريم بنت أحمد بن متروك آل محمد',
    shortName: 'ريم بنت أحمد',
    gender: 'female',
    generation: 4,
    fatherId: 'p-ahmed',
    motherId: 'p-hayla',
    branchRootId: 'p-matrook',
    birthYear: 2007,
    isDeceased: false,
    residence: 'الرياض',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 3 - Branch Dayfallah
  {
    id: 'p-saad',
    treeId: TREE_ID,
    fullName: 'سعد بن ضيف الله بن محمد آل محمد',
    shortName: 'سعد بن ضيف الله',
    gender: 'male',
    generation: 3,
    fatherId: 'p-dayfallah',
    branchRootId: 'p-dayfallah',
    birthYear: 1970,
    isDeceased: false,
    residence: 'عنيزة',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-majed',
    treeId: TREE_ID,
    fullName: 'ماجد بن ضيف الله بن محمد آل محمد',
    shortName: 'ماجد بن ضيف الله',
    gender: 'male',
    generation: 3,
    fatherId: 'p-dayfallah',
    branchRootId: 'p-dayfallah',
    birthYear: 1975,
    isDeceased: false,
    residence: 'بريدة',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 4 - Under Saad & Majed
  {
    id: 'p-tariq',
    treeId: TREE_ID,
    fullName: 'طارق بن سعد بن ضيف الله آل محمد',
    shortName: 'طارق بن سعد',
    gender: 'male',
    generation: 4,
    fatherId: 'p-saad',
    branchRootId: 'p-dayfallah',
    birthYear: 1999,
    isDeceased: false,
    residence: 'عنيزة',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-alanoud',
    treeId: TREE_ID,
    fullName: 'العنود بنت سعد بن ضيف الله آل محمد',
    shortName: 'العنود بنت سعد',
    gender: 'female',
    generation: 4,
    fatherId: 'p-saad',
    branchRootId: 'p-dayfallah',
    birthYear: 2003,
    isDeceased: false,
    residence: 'عنيزة',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-rayan',
    treeId: TREE_ID,
    fullName: 'ريان بن ماجد بن ضيف الله آل محمد',
    shortName: 'ريان بن ماجد',
    gender: 'male',
    generation: 4,
    fatherId: 'p-majed',
    branchRootId: 'p-dayfallah',
    birthYear: 2008,
    isDeceased: false,
    residence: 'بريدة',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 3 - Branch Abdullah
  {
    id: 'p-ibrahim',
    treeId: TREE_ID,
    fullName: 'إبراهيم بن عبدالله بن محمد آل محمد',
    shortName: 'إبراهيم بن عبدالله',
    gender: 'male',
    generation: 3,
    fatherId: 'p-abdullah',
    branchRootId: 'p-abdullah',
    birthYear: 1974,
    isDeceased: false,
    residence: 'الدرعية',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-youssef',
    treeId: TREE_ID,
    fullName: 'يوسف بن عبدالله بن محمد آل محمد',
    shortName: 'يوسف بن عبدالله',
    gender: 'male',
    generation: 3,
    fatherId: 'p-abdullah',
    branchRootId: 'p-abdullah',
    birthYear: 1980,
    isDeceased: false,
    residence: 'الدرعية',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  // Generation 4 - Under Ibrahim & Youssef
  {
    id: 'p-salman',
    treeId: TREE_ID,
    fullName: 'سلمان بن إبراهيم بن عبدالله آل محمد',
    shortName: 'سلمان بن إبراهيم',
    gender: 'male',
    generation: 4,
    fatherId: 'p-ibrahim',
    branchRootId: 'p-abdullah',
    birthYear: 2005,
    isDeceased: false,
    residence: 'الدرعية',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'p-aljawhara',
    treeId: TREE_ID,
    fullName: 'الجوهرة بنت يوسف بن عبدالله آل محمد',
    shortName: 'الجوهرة بنت يوسف',
    gender: 'female',
    generation: 4,
    fatherId: 'p-youssef',
    branchRootId: 'p-abdullah',
    birthYear: 2011,
    isDeceased: false,
    residence: 'الدرعية',
    isApproved: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z'
  }
];

export const INITIAL_TREE: FamilyTree = {
  id: TREE_ID,
  name: 'شجرة عائلة آل محمد بن عبدالله',
  description: 'توثيق رسمي ومعتمد لأنساب وفروع وأبناء الجد محمد بن عبدالله بن إبراهيم آل محمد.',
  rootAncestorId: ROOT_PERSON_ID,
  ownerId: 'usr-owner',
  isPrivate: true,
  subscriptionPlanId: 'extended',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-15T15:30:00Z'
};

export const INITIAL_SUBSCRIPTION: Subscription = {
  id: 'sub-mohammed-extended',
  treeId: TREE_ID,
  planId: 'extended',
  billingCycle: 'annual',
  status: 'active',
  amountPaidSAR: 1790,
  paymentMethod: 'mada',
  paymentReference: 'MOY-SA-892401',
  startDate: '2026-01-01T10:00:00Z',
  expiresAt: '2027-01-01T10:00:00Z',
  autoRenew: true
};

export const INITIAL_CONTRIBUTIONS: ContributionRequest[] = [
  {
    id: 'req-contrib-001',
    treeId: TREE_ID,
    contributorName: 'أحمد بن متروك آل محمد',
    contributorEmail: 'ahmed.m@example.com',
    contributorPhone: '+966505544332',
    branchName: 'فرع متروك بن محمد',
    targetPersonId: 'p-ahmed',
    targetPersonName: 'أحمد بن متروك',
    status: 'PENDING',
    notes: 'أضفت أبنائي الصغار (زياد، ليان، سارة) وتواريخ ميلادهم لتوثيقهم في الشجرة.',
    submittedAt: '2026-01-20T14:20:00Z',
    proposedPeople: [
      {
        tempId: 'prop-ziad',
        fullName: 'زياد بن أحمد بن متروك آل محمد',
        shortName: 'زياد بن أحمد',
        gender: 'male',
        relativeToId: 'p-ahmed',
        relationship: 'son',
        birthYear: 2014,
        biography: 'طالب في المرحلة الابتدائية.'
      },
      {
        tempId: 'prop-layan',
        fullName: 'ليان بنت أحمد بن متروك آل محمد',
        shortName: 'ليان بنت أحمد',
        gender: 'female',
        relativeToId: 'p-ahmed',
        relationship: 'daughter',
        birthYear: 2017,
        biography: 'المولودة الثانية للأخ أحمد.'
      },
      {
        tempId: 'prop-sarah-jr',
        fullName: 'سارة بنت أحمد بن متروك آل محمد',
        shortName: 'سارة بنت أحمد',
        gender: 'female',
        relativeToId: 'p-ahmed',
        relationship: 'daughter',
        birthYear: 2021,
        biography: 'أصغر بنات الأخ أحمد، سُمّيت على عمتها.'
      }
    ],
    proposedRelationships: [
      { sourceTempId: 'prop-ziad', targetId: 'p-ahmed', type: 'parent_child' },
      { sourceTempId: 'prop-layan', targetId: 'p-ahmed', type: 'parent_child' },
      { sourceTempId: 'prop-sarah-jr', targetId: 'p-ahmed', type: 'parent_child' }
    ]
  }
];

export const INITIAL_REVIEWERS: ReviewerInvitation[] = [
  {
    id: 'rev-001',
    treeId: TREE_ID,
    email: 'reviewer@aghsan.sa',
    name: 'سالم بن متروك آل محمد',
    scope: 'BRANCH',
    branchRootId: 'p-matrook',
    branchName: 'فرع متروك بن محمد',
    token: 'tok-rev-salem-matrook',
    status: 'ACCEPTED',
    invitedAt: '2026-01-05T12:00:00Z',
    acceptedAt: '2026-01-05T12:15:00Z'
  }
];

export const INITIAL_TREE_INVITATIONS: TreeInvitation[] = [
  {
    id: 'inv-share-main',
    treeId: TREE_ID,
    name: 'رابط مشاركة فرع متروك عبر واتساب',
    token: 'aghsan-matrook-share-2026',
    scopeBranchId: 'p-matrook',
    scopeBranchName: 'فرع متروك بن محمد',
    isRevoked: false,
    expiresAt: '2026-12-31T23:59:59Z',
    createdAt: '2026-01-10T11:00:00Z',
    usageCount: 14
  },
  {
    id: 'inv-share-general',
    treeId: TREE_ID,
    name: 'رابط دعوة كبار العائلة العام',
    token: 'aghsan-general-mohammed-tree',
    isRevoked: false,
    expiresAt: '2026-12-31T23:59:59Z',
    createdAt: '2026-01-12T10:00:00Z',
    usageCount: 28
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    treeId: TREE_ID,
    title: 'طلب إضافة غصن عائلي جديد',
    message: 'قام أحمد بن متروك بتقديم طلب إضافة 3 أفراد تحت فرع متروك بن محمد.',
    type: 'contribution_submitted',
    linkTarget: 'reviews',
    isRead: false,
    createdAt: '2026-01-20T14:20:00Z'
  },
  {
    id: 'notif-002',
    treeId: TREE_ID,
    title: 'انضمام مدقق مساعد',
    message: 'قبل سالم بن متروك دعوتك وأصبح مدققاً معتمداً لفرع متروك بن محمد.',
    type: 'reviewer_invited',
    linkTarget: 'reviewers',
    isRead: true,
    createdAt: '2026-01-05T12:15:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-001',
    treeId: TREE_ID,
    actorName: 'عبد العزيز بن محمد (المالك)',
    action: 'PERSON_ADDED',
    details: 'إنشاء الشجرة وإضافة الجد الأساسي محمد بن عبدالله بن إبراهيم.',
    createdAt: '2026-01-01T10:00:00Z'
  },
  {
    id: 'audit-002',
    treeId: TREE_ID,
    actorName: 'عبد العزيز بن محمد (المالك)',
    action: 'REVIEWER_INVITED',
    details: 'دعوة سالم بن متروك مدققاً مساعداً على فرع متروك بن محمد.',
    createdAt: '2026-01-05T12:00:00Z'
  },
  {
    id: 'audit-003',
    treeId: TREE_ID,
    actorName: 'سالم بن متروك (المدقق)',
    action: 'PLAN_UPGRADED',
    details: 'ترقية باقة الشجرة إلى باقة العائلة الممتدة وسداد 1,790 ر.س بنجاح.',
    createdAt: '2026-01-15T15:30:00Z'
  }
];

export interface AghsanDatabase {
  users: User[];
  currentUser: User;
  trees: FamilyTree[];
  activeTreeId: string;
  people: Person[];
  plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  contributions: ContributionRequest[];
  reviewers: ReviewerInvitation[];
  treeInvitations: TreeInvitation[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

function getDefaultData(): AghsanDatabase {
  return {
    users: INITIAL_USERS,
    currentUser: INITIAL_USERS[0], // Tree Owner by default
    trees: [INITIAL_TREE],
    activeTreeId: TREE_ID,
    people: INITIAL_PEOPLE,
    plans: INITIAL_PLANS,
    subscriptions: [INITIAL_SUBSCRIPTION],
    contributions: INITIAL_CONTRIBUTIONS,
    reviewers: INITIAL_REVIEWERS,
    treeInvitations: INITIAL_TREE_INVITATIONS,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS
  };
}

export function loadDatabase(): AghsanDatabase {
  if (typeof window === 'undefined') return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultData();
      saveDatabase(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    // Ensure active tree and current user exist
    if (!parsed.activeTreeId) parsed.activeTreeId = TREE_ID;
    if (!parsed.currentUser) parsed.currentUser = INITIAL_USERS[0];
    return parsed;
  } catch (err) {
    console.error('Failed to load database from localStorage, resetting:', err);
    const initial = getDefaultData();
    saveDatabase(initial);
    return initial;
  }
}

export function saveDatabase(data: AghsanDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
  }
}

export function resetDatabaseToDemo(): AghsanDatabase {
  const initial = getDefaultData();
  saveDatabase(initial);
  return initial;
}

// Tree and Genealogy helpers

export function getTreeById(db: AghsanDatabase, treeId: string): FamilyTree | undefined {
  return db.trees.find(t => t.id === treeId);
}

export function getActiveTree(db: AghsanDatabase): FamilyTree {
  const tree = db.trees.find(t => t.id === db.activeTreeId);
  return tree || db.trees[0] || INITIAL_TREE;
}

export function getPeopleForTree(db: AghsanDatabase, treeId: string): Person[] {
  return db.people.filter(p => p.treeId === treeId);
}

export function getPersonById(db: AghsanDatabase, personId: string): Person | undefined {
  return db.people.find(p => p.id === personId);
}

export function getChildrenOfPerson(people: Person[], personId: string): Person[] {
  return people.filter(p => p.fatherId === personId || p.motherId === personId);
}

export function getMainBranches(people: Person[], rootAncestorId: string): Person[] {
  return people.filter(p => p.fatherId === rootAncestorId);
}

/**
 * Checks for ancestry cycles (prevent linking someone as their own ancestor).
 * Returns true if candidateAncestorId is already a descendant of personId.
 */
export function wouldCreateCycle(people: Person[], personId: string, candidateAncestorId: string): boolean {
  if (personId === candidateAncestorId) return true;
  
  const visited = new Set<string>();
  const queue = [personId];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (currId === candidateAncestorId) return true;
    visited.add(currId);

    const children = getChildrenOfPerson(people, currId);
    for (const child of children) {
      if (!visited.has(child.id)) {
        queue.push(child.id);
      }
    }
  }

  return false;
}

/**
 * Validates plan limits before adding people.
 */
export function canAddPeopleToTree(db: AghsanDatabase, treeId: string, countToAdd: number = 1): { allowed: boolean; message?: string } {
  const tree = getTreeById(db, treeId);
  if (!tree) return { allowed: false, message: 'الشجرة غير موجودة' };
  
  const plan = db.plans.find(p => p.id === tree.subscriptionPlanId);
  if (!plan) return { allowed: false, message: 'الباقة غير صالحة' };

  const currentCount = db.people.filter(p => p.treeId === treeId).length;
  if (currentCount + countToAdd > plan.maxPeople) {
    return {
      allowed: false,
      message: `تم الوصول إلى الحد الأقصى للباقة الحالية (${plan.maxPeople} فرد). يرجى ترقية الباقة لتمكين إضافة المزيد.`
    };
  }

  return { allowed: true };
}

/**
 * Validates reviewer seat limits based on the active subscription.
 */
export function canInviteReviewer(db: AghsanDatabase, treeId: string): { allowed: boolean; message?: string } {
  const tree = getTreeById(db, treeId);
  if (!tree) return { allowed: false, message: 'الشجرة غير موجودة' };

  const plan = db.plans.find(p => p.id === tree.subscriptionPlanId);
  if (!plan) return { allowed: false, message: 'الباقة غير صالحة' };

  const activeReviewers = db.reviewers.filter(r => r.treeId === treeId && r.status !== 'REVOKED').length;
  if (activeReviewers >= plan.maxReviewers) {
    return {
      allowed: false,
      message: `تم استهلاك جميع مقاعد المدققين المسموح بها في باقة ${plan.nameAr} (${plan.maxReviewers} مدقق). يمكنك ترقية الباقة لإضافة مقاعد إضافية.`
    };
  }

  return { allowed: true };
}
