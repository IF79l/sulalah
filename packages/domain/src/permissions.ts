/**
 * The single permission check every server action goes through.
 * Branch scope is checked against materialized paths (ancestor ids), never names.
 */
export type TreeRole = 'owner' | 'reviewer' | 'contributor';

export interface Actor {
  userId: string;
  isPlatformAdmin?: boolean;
  /** The actor's membership in the tree being acted on, if any. */
  membership?: {
    role: TreeRole;
    /** Person ids whose whole sub-branch the reviewer covers; empty means the whole tree. */
    scopePersonIds: string[];
  };
}

export type Action =
  | { type: 'tree.view' }
  | { type: 'tree.manage' }
  | { type: 'billing.manage' }
  | { type: 'reviewer.invite' }
  | { type: 'person.edit' }
  | { type: 'contribution.submit' }
  | { type: 'contribution.review'; anchorAncestorIds: string[] };

export function can(actor: Actor, action: Action): boolean {
  const m = actor.membership;
  if (!m) return false; // Platform admins do not browse private trees by default.

  if (m.role === 'owner') return true;

  switch (action.type) {
    case 'tree.view':
      return true;
    case 'contribution.submit':
      return true;
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
