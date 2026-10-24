import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabaseKey, supabaseUrl } from '@/lib/backend';
import type { BillingDatabase } from '@/lib/supabase/billing-types';

/** As the signed in person: row level security decides what billing they see. */
export async function billingAsUser() {
  const store = await cookies();
  return createServerClient<BillingDatabase>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: () => {
        // Route handlers here never refresh the session; the proxy does.
      },
    },
  });
}

/**
 * With the secret key, past row level security. Only payment code and the platform admin's
 * routes use it, each after checking who is asking.
 */
export function billingAsServer() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return createClient<BillingDatabase>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServerDb = ReturnType<typeof billingAsServer>;
