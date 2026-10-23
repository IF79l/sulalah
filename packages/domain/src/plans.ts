export type PlanId = 'family' | 'extended' | 'tribe';

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
