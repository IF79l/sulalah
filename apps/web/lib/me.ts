'use client';

import { useEffect, useState } from 'react';
import { backendOn } from '@/lib/backend';
import { supabase } from '@/lib/supabase/client';

let cached: string | null = null;

/** The signed in person's first name, for pages that have no tree open. */
export function useMyFirstName(): string | null {
  const [name, setName] = useState(cached);
  useEffect(() => {
    if (!backendOn || cached) return;
    void (async () => {
      const db = supabase();
      const {
        data: { session },
      } = await db.auth.getSession();
      if (!session) return;
      const { data } = await db
        .from('profiles')
        .select('first_name')
        .eq('id', session.user.id)
        .maybeSingle();
      cached = data?.first_name ?? '';
      setName(cached);
    })();
  }, []);
  return name;
}
