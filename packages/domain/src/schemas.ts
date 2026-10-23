import { z } from 'zod';

export const personInput = z.object({
  givenName: z.string().trim().min(1).max(60),
  gender: z.enum(['male', 'female']),
  birthYear: z.number().int().min(1).max(3000).optional(),
  deathYear: z.number().int().min(1).max(3000).optional(),
  bio: z.string().max(2000).optional(),
});

/** One person in a contribution; parents are referenced by real id or by another item's tempKey. */
export const contributionItemInput = personInput.extend({
  tempKey: z.string().min(1).max(40),
  relation: z.enum(['son', 'daughter', 'spouse']),
  relativeRef: z.union([
    z.object({ kind: z.literal('person'), id: z.string().uuid() }),
    z.object({ kind: z.literal('temp'), tempKey: z.string() }),
  ]),
});

export const contributionInput = z.object({
  treeId: z.string().uuid(),
  anchorPersonId: z.string().uuid(),
  items: z.array(contributionItemInput).min(1).max(200),
  note: z.string().max(1000).optional(),
});

export type ContributionInput = z.infer<typeof contributionInput>;
