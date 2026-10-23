export type Gender = 'male' | 'female';

export type RelationshipType = 'father' | 'mother' | 'spouse' | 'son' | 'daughter';

export type UserRole = 'owner' | 'reviewer' | 'contributor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface Person {
  id: string;
  treeId: string;
  fullName: string;
  shortName: string;
  gender: Gender;
  generation: number;
  branchRootId?: string; // which main branch this person belongs to
  fatherId?: string;
  motherId?: string;
  spouseIds?: string[];
  birthYear?: number;
  deathYear?: number;
  isDeceased?: boolean;
  biography?: string;
  avatarUrl?: string;
  occupation?: string;
  residence?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRelationship {
  id: string;
  treeId: string;
  person1Id: string;
  person2Id: string;
  type: 'parent_child' | 'marriage';
  marriageDate?: string;
  notes?: string;
}

export interface ProposedPerson {
  tempId: string;
  fullName: string;
  shortName: string;
  gender: Gender;
  relativeToId: string; // attachment node in approved tree or another proposed node
  relationship: 'son' | 'daughter' | 'spouse';
  birthYear?: number;
  biography?: string;
  notes?: string;
  parentId?: string;
}

export interface ProposedRelationship {
  sourceTempId: string;
  targetId: string;
  type: 'parent_child' | 'marriage';
}

export type ContributionStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';

export interface ContributionRequest {
  id: string;
  treeId: string;
  contributorName: string;
  contributorEmail?: string;
  contributorPhone?: string;
  branchName: string;
  targetPersonId: string;
  targetPersonName: string;
  proposedPeople: ProposedPerson[];
  proposedRelationships: ProposedRelationship[];
  status: ContributionStatus;
  notes?: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  approvedPersonIds?: string[];
}

export interface ReviewerInvitation {
  id: string;
  treeId: string;
  email: string;
  name?: string;
  scope: 'ALL_TREE' | 'BRANCH';
  branchRootId?: string;
  branchName?: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  invitedAt: string;
  acceptedAt?: string;
}

export interface TreeInvitation {
  id: string;
  treeId: string;
  token: string;
  name: string;
  scopeBranchId?: string;
  scopeBranchName?: string;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
  usageCount: number;
}

export interface SubscriptionPlan {
  id: 'family' | 'extended' | 'tribe';
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  priceMonthlySAR: number;
  priceAnnualSAR: number;
  maxPeople: number;
  maxReviewers: number; // excluding owner
  featuresAr: string[];
  isPopular?: boolean;
}

export interface Subscription {
  id: string;
  treeId: string;
  planId: 'family' | 'extended' | 'tribe';
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'expired' | 'canceled';
  amountPaidSAR: number;
  paymentMethod: 'mada' | 'visa' | 'apple_pay' | 'sandbox';
  paymentReference: string;
  startDate: string;
  expiresAt: string;
  autoRenew: boolean;
}

export interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  rootAncestorId: string;
  ownerId: string;
  isPrivate: boolean;
  subscriptionPlanId: 'family' | 'extended' | 'tribe';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  treeId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'contribution_submitted' | 'contribution_approved' | 'contribution_rejected' | 'reviewer_invited' | 'plan_limit_warning';
  linkTarget?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  treeId: string;
  actorName: string;
  action: 'PERSON_ADDED' | 'PERSON_UPDATED' | 'RELATIONSHIP_ADDED' | 'CONTRIBUTION_APPROVED' | 'CONTRIBUTION_REJECTED' | 'REVIEWER_INVITED' | 'REVIEWER_REVOKED' | 'PLAN_UPGRADED';
  details: string;
  createdAt: string;
}
