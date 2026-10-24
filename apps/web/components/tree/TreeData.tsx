'use client';

import {
  TreeFileError,
  generateTreeKey,
  openTree,
  sealTree,
  toCsv,
  type TreeFile,
} from '@sulalah/domain';
import { Button, Icon } from '@sulalah/ui';
import { useRef, useState } from 'react';
import { Panel } from '@/components/AppShell';
import { names, num, restoreTreeFile, toTreeFile, update, useDemo } from '@/lib/demo-store';

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const problem: Record<TreeFileError['code'], string> = {
  'wrong-key': 'هذي النسخة من شجرة ثانية. اختر نسخة من نفس الشجرة.',
  'not-a-tree': 'هذا الملف مو نسخة احتياطية من سُلالة.',
  'bad-recovery-code': 'هذا الملف مو نسخة احتياطية من سُلالة.',
  'bad-key': 'هذا الملف مو نسخة احتياطية من سُلالة.',
};

/**
 * The family's own copy of the tree: a CSV anyone can open, and an encrypted backup that opens
 * again from this tree. Nothing here goes to the server.
 */
export function TreeData({ onToast }: { onToast: (t: string) => void }) {
  const s = useDemo();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; body: unknown } | null>(null);
  const [error, setError] = useState<string>();
  const [opened, setOpened] = useState<TreeFile | null>(null);

  const approved = s.people.filter((p) => p.status === 'approved');
  const key = s.treeKey;

  const exportCsv = () => {
    download(`${s.tree.title}.csv`, toCsv(approved), 'text/csv;charset=utf-8');
    onToast(`نزّلنا ${names(approved.length)} في ملف CSV`);
  };

  const backup = async () => {
    setBusy(true);
    try {
      let k = key;
      if (!k) {
        k = generateTreeKey();
        update((st) => ({ ...st, treeKey: k }));
      }
      const sealed = await sealTree(toTreeFile(s), k);
      download(`${s.tree.title}.sulalah`, JSON.stringify(sealed), 'application/json');
      onToast('نزّلنا النسخة المشفّرة');
    } finally {
      setBusy(false);
    }
  };

  const pick = async (f: File | undefined) => {
    setError(undefined);
    setOpened(null);
    if (!f) return;
    try {
      setPicked({ name: f.name, body: JSON.parse(await f.text()) });
    } catch {
      setPicked(null);
      setError(problem['not-a-tree']);
    }
  };

  const open = async () => {
    if (!picked) return;
    setError(undefined);
    setBusy(true);
    try {
      if (!key) throw new TreeFileError('wrong-key');
      setOpened(await openTree(picked.body, key));
    } catch (e) {
      setError(e instanceof TreeFileError ? problem[e.code] : problem['not-a-tree']);
    } finally {
      setBusy(false);
    }
  };

  const restore = () => {
    if (!opened) return;
    restoreTreeFile(opened);
    setOpened(null);
    setPicked(null);
    onToast('استرجعنا الشجرة من النسخة');
  };

  return (
    <Panel title="بيانات الشجرة" icon="folder_shared">
      <p className="flex items-start gap-2 border-b border-line/30 bg-olive-soft/30 px-5 py-3 text-caption leading-relaxed text-on-olive-soft">
        <Icon name="encrypted" className="mt-0.5 text-[1.1rem]" />
        أسماء الشجرة تُحفظ مشفّرة، ويفتحها أعضاء الشجرة بعد الدخول برقم جوالهم.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/30 px-5 py-4">
        <span className="grid gap-0.5">
          <span className="text-body font-semibold text-ink">تصدير CSV</span>
          <span className="text-caption text-muted">
            الأسماء المعتمدة ({num(approved.length)})، يفتح في Excel أو Google Sheets. غير مشفّر.
          </span>
        </span>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          <Icon name="table_view" />
          نزّل CSV
        </Button>
      </div>

      <div className="grid gap-3 border-b border-line/30 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="grid gap-0.5">
            <span className="text-body font-semibold text-ink">نسخة احتياطية مشفّرة</span>
            <span className="text-caption text-muted">
              الشجرة كاملة مع الإضافات المنتظرة. تسترجعها هنا متى احتجت.
            </span>
          </span>
          <Button size="sm" onClick={backup} disabled={busy}>
            <Icon name="download" />
            نزّل النسخة
          </Button>
        </div>
      </div>

      <div className="grid gap-3 px-5 py-4">
        <span className="grid gap-0.5">
          <span className="text-body font-semibold text-ink">استرجاع من نسخة</span>
          <span className="text-caption text-muted">
            تحل النسخة مكان الشجرة الحالية. الإعدادات والروابط والمدققون يبقون.
          </span>
        </span>
        <input
          ref={fileInput}
          type="file"
          accept=".sulalah,application/json"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
            <Icon name="upload_file" />
            اختر ملف النسخة
          </Button>
          {picked ? (
            <span className="min-w-0 truncate text-caption text-ink-soft">{picked.name}</span>
          ) : null}
        </div>
        {picked && !opened ? (
          <Button
            size="sm"
            className="justify-self-start animate-rise"
            onClick={open}
            disabled={busy}
          >
            <Icon name="lock_open" />
            افتح النسخة
          </Button>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-caption text-danger"
          >
            <Icon name="error" className="mt-0.5 text-[1.1rem]" />
            {error}
          </p>
        ) : null}
        {opened ? (
          <div className="grid animate-rise gap-3 rounded-xl border border-success/25 bg-success-soft p-3">
            <p className="flex items-start gap-2 text-body text-ink">
              <Icon name="check_circle" fill className="mt-0.5 text-success" />
              <span>
                انفتحت النسخة: <strong className="text-forest">{opened.tree.title}</strong>، فيها{' '}
                {names(opened.people.length)}، آخر حفظ{' '}
                {new Date(opened.updatedAt).toLocaleDateString('ar-SA-u-nu-latn', {
                  dateStyle: 'medium',
                })}
                .
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={restore}>
                استرجعها مكان الشجرة الحالية
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpened(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
