'use client';

import { CONFIRM_DELETE } from '@/lib/account-confirm';
import { supabase } from '@/lib/supabase/client';

export { CONFIRM_DELETE };

/** A tree the person owns, as deleting their account sees it. */
export interface OwnedTree {
  treeId: string;
  /** Everyone else in it; any at all and it must be handed over or deleted first. */
  others: number;
  /** A paid plan is still running on it. */
  paid: boolean;
}

export async function ownedTrees(): Promise<OwnedTree[]> {
  const { data, error } = await supabase().rpc('my_owned_trees');
  if (error) throw error;
  return (data ?? []).map((t) => ({ treeId: t.tree_id, others: t.others, paid: t.paid }));
}

/** Answers null once the account is gone, or the reason it is not. */
export async function deleteMyAccount(): Promise<string | null> {
  const r = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirm: CONFIRM_DELETE }),
  });
  if (r.ok) return null;
  const b = (await r.json().catch(() => ({}))) as { error?: { message: string } };
  return b.error?.message ?? 'ما قدرنا نحذف الحساب، حاول بعد شوي';
}
