import type { Metadata } from 'next';
import { SignIn } from './SignIn';

export const metadata: Metadata = { title: 'الدخول | سُلالة' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  // Invites are not stored yet (batch 4); any invite link shows the demo family's banner.
  return <SignIn invite={invite ? { from: 'فهد', tree: 'شجرة آل السهلي' } : undefined} />;
}
