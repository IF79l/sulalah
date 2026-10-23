import type { Metadata } from 'next';
import { Profile } from './Profile';

export const metadata: Metadata = { title: 'الملف الشخصي | سُلالة', robots: { index: false } };

export default async function PersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  return <Profile personId={personId} />;
}
