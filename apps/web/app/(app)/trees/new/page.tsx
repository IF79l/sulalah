import type { Metadata } from 'next';
import { backendOn } from '@/lib/backend';
import { NewTreeWizard } from './NewTreeWizard';

export const metadata: Metadata = { title: 'شجرة جديدة | سُلالة' };

export default function NewTreePage() {
  return <NewTreeWizard live={backendOn} />;
}
