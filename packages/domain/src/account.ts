/** How recent a sign in must be to delete an account. */
export const FRESH_SIGN_IN_MINUTES = 10;

/**
 * Whether the session's latest sign in (the `amr` claim of a Supabase access token) is within
 * `minutes` of `nowSeconds`. Entries without a time, and a missing claim, never count, so a
 * token that cannot show when it was made is treated as old.
 */
export function signedInWithin(
  amr: readonly (string | { method?: string; timestamp?: number })[] | undefined,
  nowSeconds: number,
  minutes = FRESH_SIGN_IN_MINUTES,
) {
  const latest = Math.max(
    0,
    ...(amr ?? []).map((a) => (typeof a === 'string' ? 0 : Number(a.timestamp) || 0)),
  );
  return latest > 0 && latest <= nowSeconds + 60 && nowSeconds - latest <= minutes * 60;
}
