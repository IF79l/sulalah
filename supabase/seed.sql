-- Local development only (supabase db reset). Accounts are made by signing in with a test
-- number from config.toml; the sample family is planted from the app or `pnpm seed:staging`,
-- because its names must be sealed on a device, never written here in plain text.

-- Test prices (as testPlanPrices in packages/domain/src/plans.ts), so the payment sandbox has
-- something to charge. Staging sets its own on the admin desk; production starts with none.
update public.plans set price_monthly_halalas = 1900, price_annual_halalas = 19000 where id = 'family';
update public.plans set price_monthly_halalas = 4900, price_annual_halalas = 49000 where id = 'extended';
update public.plans set price_monthly_halalas = 14900, price_annual_halalas = 149000 where id = 'tribe';
