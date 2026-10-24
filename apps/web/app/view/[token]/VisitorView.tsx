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
    'key_off',
    'الرابط ناقص',
    'آخر الرابط فيه مفتاح العرض، ويبدو إنه انقص وقت النسخ. افتحه من الرسالة نفسها.',
  ],
  failed: ['cloud_off', 'ما قدرنا نفتح الشجرة', 'تأكد من اتصالك وحاول مرة ثانية.'],
};

/**
 * S22 on a real tree: a visitor's read-only look. The link carries the view key after the
 * `#`; the copy it opens was filtered by the tree's privacy settings before it was sealed.
 */
export function VisitorView({ token }: { token: string }) {
  const [state, setState] = useState<{ file: TreeFile } | { problem: ViewProblem | 'failed' } | null>(
    null,
  );

  useEffect(() => {
    const key = window.location.hash.slice(1);
    if (!key) {
      setState({ problem: 'wrong-key' });
      return;
    }
    openViewLink(token, key)
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
