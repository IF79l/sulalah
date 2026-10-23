import type { Metadata } from 'next';
import { Notifications } from './Notifications';

export const metadata: Metadata = { title: 'الإشعارات | سُلالة', robots: { index: false } };

export default function Page() {
  return <Notifications />;
}
