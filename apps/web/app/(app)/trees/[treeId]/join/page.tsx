import type { Metadata } from 'next';
import { JoinBranch } from './JoinBranch';

export const metadata: Metadata = { title: 'وين غصنك؟ | سُلالة', robots: { index: false } };

export default function JoinPage() {
  return <JoinBranch />;
}
