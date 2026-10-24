import type { PlanOffer } from './billing';

export type PlanId = 'family' | 'extended' | 'tribe';

export const planIds: PlanId[] = ['family', 'extended', 'tribe'];

export interface PlanLimits {
  maxPersons: number;
  /** Assistant reviewers, not counting the owner. */
  maxReviewers: number;
}

/** Defaults from the product report; real values live in the `plans` table. */
export const defaultPlanLimits: Record<PlanId, PlanLimits> = {
  family: { maxPersons: 50, maxReviewers: 1 },
  extended: { maxPersons: 500, maxReviewers: 5 },
  tribe: { maxPersons: 10_000, maxReviewers: 20 },
};

/**
 * Prices used only on the sample tree and on staging, so the whole payment path can be tried
 * before the real prices are announced. Production starts with no price at all.
 */
export const testPlanPrices: Record<PlanId, { monthly: number; annual: number }> = {
  family: { monthly: 1_900, annual: 19_000 },
  extended: { monthly: 4_900, annual: 49_000 },
  tribe: { monthly: 14_900, annual: 149_000 },
};

/** The plans as they ship: the default limits, no prices until launch. */
export const defaultPlanOffers: PlanOffer[] = planIds.map((id) => ({
  id,
  limits: defaultPlanLimits[id],
  prices: { monthly: null, annual: null },
}));
