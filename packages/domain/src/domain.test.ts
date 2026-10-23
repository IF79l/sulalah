import { describe, expect, it } from 'vitest';
import { can, matchesArabic, normalizeArabic } from './index';

describe('arabic search', () => {
  it('ignores hamza and taa marbuta differences', () => {
    expect(normalizeArabic('أحمد')).toBe(normalizeArabic('احمد'));
    expect(matchesArabic('نورة بنت ضيف الله', 'نوره')).toBe(true);
  });
});

describe('permissions', () => {
  const reviewer = {
    userId: 'u2',
    membership: { role: 'reviewer' as const, scopePersonIds: ['matrouk'] },
  };

  it('lets a branch reviewer review inside their branch only', () => {
    expect(
      can(reviewer, {
        type: 'contribution.review',
        anchorAncestorIds: ['mohammed', 'matrouk', 'salem'],
      }),
    ).toBe(true);
    expect(
      can(reviewer, { type: 'contribution.review', anchorAncestorIds: ['mohammed', 'daifallah'] }),
    ).toBe(false);
  });

  it('keeps billing and reviewer invites with the owner', () => {
    expect(can(reviewer, { type: 'billing.manage' })).toBe(false);
    expect(can(reviewer, { type: 'reviewer.invite' })).toBe(false);
    expect(
      can(
        { userId: 'u1', membership: { role: 'owner', scopePersonIds: [] } },
        { type: 'billing.manage' },
      ),
    ).toBe(true);
  });

  it('gives platform admins no implicit access to private trees', () => {
    expect(can({ userId: 'admin', isPlatformAdmin: true }, { type: 'tree.view' })).toBe(false);
  });
});
