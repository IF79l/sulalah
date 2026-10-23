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

  it('keeps contributors inside their own branch, and only after they pick it', () => {
    const contributor = (branchPersonId?: string) => ({
      userId: 'u3',
      membership: { role: 'contributor' as const, scopePersonIds: [], branchPersonId },
    });
    const under = {
      type: 'contribution.submit' as const,
      anchorAncestorIds: ['mohammed', 'matrouk', 'salem'],
    };
    expect(can(contributor(), under)).toBe(false);
    expect(can(contributor('salem'), under)).toBe(true);
    expect(can(contributor('daifallah'), under)).toBe(false);
    expect(can(contributor('salem'), { type: 'review.view' })).toBe(false);
    expect(can(contributor('salem'), { type: 'person.edit' })).toBe(false);
  });

  it('lets a view link open the tree and nothing else', () => {
    const visitor = { userId: 'anon', viaViewLink: true };
    expect(can(visitor, { type: 'tree.view' })).toBe(true);
    expect(can(visitor, { type: 'contribution.submit' })).toBe(false);
    expect(can({ userId: 'anon' }, { type: 'tree.view' })).toBe(false);
  });

  it('lets reviewers see the queue and the log but not settings', () => {
    expect(can(reviewer, { type: 'review.view' })).toBe(true);
    expect(can(reviewer, { type: 'activity.view' })).toBe(true);
    expect(can(reviewer, { type: 'tree.manage' })).toBe(false);
    expect(can(reviewer, { type: 'invite.manage' })).toBe(false);
  });
});
