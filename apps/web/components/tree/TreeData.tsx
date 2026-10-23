'use client';

import {
  TreeFileError,
  generateTreeKey,
  keyFromRecoveryCode,
  openTree,
  recoveryCode,
  sealTree,
  toCsv,
  type TreeFile,
} from '@sulalah/domain';
import { Button, Field, Icon, cn } from '@sulalah/ui';
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
  'wrong-key': 'الرمز ما يفتح هذي النسخة. تأكد إنه رمز نفس الشجرة.',
  'not-a-tree': 'هذا الملف مو نسخة احتياطية من سُلالة.',
  'bad-recovery-code': 'الرمز ناقص أو فيه حرف غلط. هو 52 حرفًا ورقمًا.',
  'bad-key': 'الرمز ما يصلح مفتاحًا.',
};

/**
 * The family's own copy of the tree: a CSV anyone can open, and an encrypted backup that only
 * the recovery code opens. Nothing here goes to the server.
 */
export function TreeData({ onToast }: { onToast: (t: string) => void }) {
  const s = useDemo();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; body: unknown } | null>(null);
  const [code, setCode] = useState('');
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
        setShown(true);
      }
      const sealed = await sealTree(toTreeFile(s), k);
      download(`${s.tree.title}.sulalah`, JSON.stringify(sealed), 'application/json');
      onToast('نزّلنا النسخة المشفّرة');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode(key!));
      onToast('نسخنا الرمز');
    } catch {
      onToast('تعذّر النسخ، انسخه يدويًا');
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
      const k = code.trim() ? keyFromRecoveryCode(code) : key;
      if (!k) throw new TreeFileError('bad-recovery-code');
      setOpened(await openTree(picked.body, k));
    } catch (e) {
      setError(e instanceof TreeFileError ? problem[e.code] : problem['not-a-tree']);
    } finally {
      setBusy(false);
    }
  };

  const restore = () => {
    if (!opened) return;
    restoreTreeFile(opened);
    if (code.trim()) update((st) => ({ ...st, treeKey: keyFromRecoveryCode(code) }));
    setOpened(null);
    setPicked(null);
    setCode('');
    onToast('استرجعنا الشجرة من النسخة');
  };

  return (
    <Panel title="بيانات الشجرة" icon="folder_shared">
      <p className="flex items-start gap-2 border-b border-line/30 bg-olive-soft/30 px-5 py-3 text-caption leading-relaxed text-on-olive-soft">
        <Icon name="encrypted" className="mt-0.5 text-[1.1rem]" />
        أسماء الشجرة تُحفظ مشفّرة بمفتاح عائلتك. سُلالة ما تقدر تقرأها، فاحفظ رمز الاسترجاع عندك.
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
            <span className="text-caption text-muted">الشجرة كاملة مع الإضافات المنتظرة. ما تنفتح إلا برمز الاسترجاع.</span>
          </span>
          <Button size="sm" onClick={backup} disabled={busy}>
            <Icon name="download" />
            نزّل النسخة
          </Button>
        </div>
        {key ? (
          <div className="grid gap-2 rounded-xl border border-gold-light/70 bg-surface-low p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-caption font-semibold text-forest">
                <Icon name="key" className="text-[1.1rem] text-gold" />
                رمز الاسترجاع
              </span>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setShown((v) => !v)}>
                  <Icon name={shown ? 'visibility_off' : 'visibility'} />
                  {shown ? 'إخفاء' : 'إظهار'}
                </Button>
                <Button size="sm" variant="quiet" onClick={copyCode}>
                  <Icon name="content_copy" />
                  نسخ
                </Button>
              </span>
            </div>
            <code
              dir="ltr"
              className={cn(
                'block rounded-lg bg-card px-3 py-2 text-center font-mono text-[0.8rem] leading-relaxed tracking-wide break-words text-ink',
                !shown && 'select-none blur-[5px]',
              )}
            >
              {recoveryCode(key)}
            </code>
            <p className="text-caption leading-relaxed text-muted">
              اكتبه أو احفظه في مكان آمن. إذا ضاع ما أحد يقدر يفتح النسخ، ولا حتى سُلالة.
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 px-5 py-4">
        <span className="grid gap-0.5">
          <span className="text-body font-semibold text-ink">استرجاع من نسخة</span>
          <span className="text-caption text-muted">تحل النسخة مكان الشجرة الحالية. الإعدادات والروابط والمدققون يبقون.</span>
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
          {picked ? <span className="min-w-0 truncate text-caption text-ink-soft">{picked.name}</span> : null}
        </div>
        {picked && !opened ? (
          <div className="grid animate-rise gap-2">
            <Field
              label="رمز الاسترجاع"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX-…"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(undefined);
              }}
              hint={key ? 'اتركه فاضي إذا النسخة من هذي الشجرة على هذا الجهاز.' : undefined}
            />
            <Button size="sm" className="justify-self-start" onClick={open} disabled={busy || (!code.trim() && !key)}>
              <Icon name="lock_open" />
              افتح النسخة
            </Button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-caption text-danger">
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
                {new Date(opened.updatedAt).toLocaleDateString('ar-SA-u-nu-latn', { dateStyle: 'medium' })}.
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
