'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseKey, supabaseUrl } from '@/lib/backend';
import type { Database } from './types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** The browser's client. Everything it can reach is limited by row level security. */
export function supabase() {
  client ??= createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return client;
}
