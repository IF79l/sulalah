import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { backendOn } from '@/lib/backend';
import type { TreeRole } from '@/lib/supabase/types';
import { createSupabaseServerClient } from '@/server/supabase/server';
import { LiveTrees, type Membership } from './LiveTrees';
import { MyTrees } from './MyTrees';

export const metadata: Metadata = { title: 'أشجاري | سُلالة' };

interface Row {
  tree_id: string;
  role: TreeRole;
  trees: { updated_at: string } | null;
  inviter: { first_name: string; father_name: string } | null;
}

export default async function MyTreesPage() {
  if (!backendOn) return <MyTrees />;
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login?next=/trees');

  const [profile, members] = await Promise.all([
    db.from('profiles').select('first_name').eq('id', user.id).maybeSingle(),
    db
      .from('tree_members')
      .select(
        'tree_id, role, trees(updated_at), inviter:profiles!tree_members_invited_by_fkey(first_name, father_name)',
      )
      .eq('user_id', user.id)
      .order('created_at'),
  ]);
  const rows = (members.data ?? []) as unknown as Row[];
  const memberships: Membership[] = rows.map((r) => ({
    treeId: r.tree_id,
    role: r.role,
    updatedAt: r.trees?.updated_at ?? new Date().toISOString(),
    invitedBy:
      r.role !== 'owner' && r.inviter
        ? [r.inviter.first_name, r.inviter.father_name && `بن ${r.inviter.father_name}`]
            .filter(Boolean)
            .join(' ')
        : undefined,
  }));
  return <LiveTrees me={profile.data?.first_name ?? ''} memberships={memberships} />;
}
