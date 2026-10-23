import type { Metadata } from 'next';
import { Reviewers } from './Reviewers';

export const metadata: Metadata = { title: 'المدققون | سُلالة', robots: { index: false } };

export default function Page() {
  return <Reviewers />;
}
