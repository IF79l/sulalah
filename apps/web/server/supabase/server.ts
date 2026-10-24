import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseKey, supabaseUrl } from '@/lib/backend';
import type { Database } from '@/lib/supabase/types';

/** Acts as the signed in person, so row level security applies exactly as in the browser. */
export async function createSupabaseServerClient() {
  const store = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
