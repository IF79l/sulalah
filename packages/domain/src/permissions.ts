/**
 * The single permission check every server action goes through, and every screen asks before
 * it shows a page or a button. Branch scope is checked against materialized paths (ancestor
 * ids), never names.
 */
export type TreeRole = 'owner' | 'reviewer' | 'contributor';

/** Who is looking: a member's role, or a visitor who came in on a view link. */
export type Viewer = TreeRole | 'visitor';

export interface Actor {
  userId: string;
  isPlatformAdmin?: boolean;
  /** The actor's membership in the tree being acted on, if any. */
  membership?: {
    role: TreeRole;
    /** Person ids whose whole sub-branch the reviewer covers; empty means the whole tree. */
    scopePersonIds: string[];
    /** A contributor's own place in the tree, once picked; they add under it only. */
    branchPersonId?: string;
  };
  /** Came in on a live view link, with the tree open to link holders. */
  viaViewLink?: boolean;
}

export type Action =
  | { type: 'tree.view' }
  | { type: 'tree.manage' }
  | { type: 'billing.manage' }
  | { type: 'reviewer.invite' }
  | { type: 'invite.manage' }
  | { type: 'person.edit' }
  | { type: 'activity.view' }
  | { type: 'data.export' }
  | { type: 'review.view' }
  | { type: 'contribution.submit'; anchorAncestorIds?: string[] }
  | { type: 'contribution.review'; anchorAncestorIds: string[] };

export type ActionType = Action['type'];

export function can(actor: Actor, action: Action): boolean {
  const m = actor.membership;
  // A view link opens the tree read-only, nothing more. Platform admins do not browse private
  // trees by default.
  if (!m) return !!actor.viaViewLink && action.type === 'tree.view';

  if (m.role === 'owner') return true;

  switch (action.type) {
    case 'tree.view':
      return true;
    case 'contribution.submit':
      if (m.role === 'reviewer') return true;
      // Before a contributor picks their branch, they cannot add anywhere.
      return (
        !!m.branchPersonId &&
        (!action.anchorAncestorIds || action.anchorAncestorIds.includes(m.branchPersonId))
      );
    case 'review.view':
    case 'activity.view':
      return m.role === 'reviewer';
    case 'contribution.review':
      return m.role === 'reviewer' && inScope(m.scopePersonIds, action.anchorAncestorIds);
    default:
      return false;
  }
}

/** `anchorAncestorIds` is the anchor's path from the root, including the anchor itself. */
function inScope(scopePersonIds: string[], anchorAncestorIds: string[]): boolean {
  if (scopePersonIds.length === 0) return true;
  return anchorAncestorIds.some((id) => scopePersonIds.includes(id));
}

export const viewerLabel: Record<Viewer, string> = {
  owner: 'المالك',
  reviewer: 'مدقق',
  contributor: 'مساهم',
  visitor: 'زائر',
};

/**
 * The rules in words, as shown to owners. Each row names who may do it; a reviewer's and a
 * contributor's rights stop at their branch.
 */
export const permissionTable: { label: string; who: Partial<Record<Viewer, 'yes' | 'branch'>> }[] =
  [
    {
      label: 'تصفح الشجرة',
      who: { owner: 'yes', reviewer: 'yes', contributor: 'yes', visitor: 'yes' },
    },
    { label: 'إضافة أبناء وأحفاد', who: { owner: 'yes', reviewer: 'yes', contributor: 'branch' } },
    { label: 'اعتماد الإضافات', who: { owner: 'yes', reviewer: 'branch' } },
    { label: 'سجل النشاط', who: { owner: 'yes', reviewer: 'yes' } },
    { label: 'تعديل الأسماء ونقلها وحذفها', who: { owner: 'yes' } },
    { label: 'روابط الدعوة والمدققون', who: { owner: 'yes' } },
    { label: 'الإعدادات والخصوصية والتصدير', who: { owner: 'yes' } },
    { label: 'الباقة والفوترة', who: { owner: 'yes' } },
  ];
