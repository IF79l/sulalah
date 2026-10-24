'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Tree keys come from the server to any member who signed in with their phone code, so a
 * tree opens on any device. They are kept in memory for this visit only.
 */
const known = new Map<string, Promise<string | null>>();

export function treeKey(treeId: string): Promise<string | null> {
  let found = known.get(treeId);
  if (!found) {
    found = Promise.resolve(supabase().rpc('tree_key', { tree: treeId })).then(
      ({ data, error }) => {
        if (error) throw error;
        return data ?? null;
      },
    );
    // A failed lookup is not remembered, so the next try asks again.
    found.catch(() => known.delete(treeId));
    known.set(treeId, found);
  }
  return found;
}

/** Remembers the key of a tree this device just planted. */
export function keepKey(treeId: string, key: string) {
  known.set(treeId, Promise.resolve(key));
}

/** Forgets every key, on sign out. */
export function forgetKeys() {
  known.clear();
}
