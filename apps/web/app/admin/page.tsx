import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { backendOn } from '@/lib/backend';
import { createSupabaseServerClient } from '@/server/supabase/server';
import { Admin } from './Admin';

export const metadata: Metadata = { title: 'إدارة المنصة | سُلالة', robots: { index: false } };

/** With real accounts, only a platform admin sees this page; everyone else gets a 404. */
export default async function Page() {
  if (backendOn) {
    const db = await createSupabaseServerClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) notFound();
    const { data } = await db
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!data?.is_platform_admin) notFound();
  }
  return <Admin live={backendOn} />;
}
