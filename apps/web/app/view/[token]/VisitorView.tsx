'use client';

import type { TreeFile } from '@sulalah/domain';
import { Chip, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sprouting, StatePage } from '@/components/States';
import { TreeExplorer } from '@/components/TreeExplorer';
import { openViewLink, type ViewProblem } from '@/lib/collab-cloud';

const problems: Record<ViewProblem | 'failed', [string, string, string]> = {
  stopped: ['link_off', 'هذا الرابط موقوف', 'أوقفه صاحب الشجرة. اطلب منه رابطًا جديدًا.'],
  expired: ['timer_off', 'انتهت صلاحية هذا الرابط', 'اطلب رابطًا جديدًا من صاحب الشجرة.'],
  'used-up': ['link_off', 'هذا الرابط استُخدم بالكامل', 'اطلب رابطًا جديدًا من صاحب الشجرة.'],
  closed: [
    'lock',
    'الشجرة مقفلة على أهلها',
    'صاحب الشجرة قفلها عن روابط المشاهدة. يقدر يفتحها من إعدادات الخصوصية.',
  ],
  'not-ready': ['hourglass_top', 'الشجرة تتجهز', 'افتح الرابط بعد دقيقة.'],
  missing: ['search_off', 'ما لقينا هذا الرابط', 'تأكد إنك نسخته كاملًا من الرسالة.'],
  'wrong-key': [
    'cloud_off',
    'ما قدرنا نفتح الشجرة',
    'النسخة المعروضة ما انفتحت. اطلب من صاحب الشجرة رابطًا جديدًا.',
  ],
  failed: ['cloud_off', 'ما قدرنا نفتح الشجرة', 'تأكد من اتصالك وحاول مرة ثانية.'],
};

/**
 * S22 on a real tree: a visitor's read-only look. The link is a plain token; the server hands
 * out the copy's key with its path. The copy was filtered by the tree's privacy settings before it was sealed.
 */
export function VisitorView({ token }: { token: string }) {
  const [state, setState] = useState<{ file: TreeFile } | { problem: ViewProblem | 'failed' } | null>(
    null,
  );

  useEffect(() => {
    openViewLink(token)
      .then(setState)
      .catch(() => setState({ problem: 'failed' }));
  }, [token]);

  if (!state) return <Sprouting />;
  if ('problem' in state) {
    const [icon, title, body] = problems[state.problem];
    return (
      <StatePage
        icon={icon}
        title={title}
        body={body}
        action={
          <Link href="/" className={buttonClass('quiet')}>
            تعرّف على سُلالة
          </Link>
        }
      />
    );
  }
  const { file } = state;
  return (
    <main className="h-dvh overflow-hidden">
      <TreeExplorer
        people={file.people}
        unions={file.unions}
        rootId={file.tree.rootId}
        ancestors={file.tree.ancestors}
        title={file.tree.title}
        headerEnd={
          <>
            <Chip tone="neutral" icon="visibility">
              عرض فقط
            </Chip>
            <Link
              href="/login"
              className={cn(buttonClass('primary', 'sm'), 'rounded-xl max-sm:hidden')}
            >
              سجّل دخولك
            </Link>
          </>
        }
        notice="تشوف الشجرة كما يسمح بها أهلها. للإضافة اطلب رابط مساهمة."
      />
    </main>
  );
}
