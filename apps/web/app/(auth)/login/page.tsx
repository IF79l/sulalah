import type { Metadata } from 'next';
import { backendOn } from '@/lib/backend';
import { createSupabaseServerClient } from '@/server/supabase/server';
import { SignIn } from './SignIn';

export const metadata: Metadata = { title: 'الدخول | سُلالة' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; next?: string }>;
}) {
  const { invite, next } = await searchParams;
  if (!backendOn)
    // The demo build has no invites stored; any invite link shows the sample family's banner.
    return <SignIn invite={invite ? { from: 'فهد', tree: 'شجرة آل السهلي' } : undefined} />;

  let banner: { from: string; tree: string; token: string } | undefined;
  if (invite) {
    const db = await createSupabaseServerClient();
    const { data } = await db.rpc('invite_preview', { token: invite });
    const row = data?.[0];
    // The tree's name is sealed in its file, so the banner names the person who invited.
    // Even a stopped link sends the person back to it: members may still bring the key over.
    if (row) banner = { from: row.inviter, tree: 'شجرة عائلته', token: invite };
  }
  return <SignIn live invite={banner} next={next} />;
}
