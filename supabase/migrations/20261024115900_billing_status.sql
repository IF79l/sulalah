-- A renewal that failed but is still inside its grace days. Its own migration, because a new
-- enum value cannot be used in the transaction that adds it.
alter type public.subscription_status add value if not exists 'past_due' after 'active';
