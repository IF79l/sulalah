'use client';

import { Button, Chip, Field, Icon, IconButton, Segmented, Sheet, cn } from '@sulalah/ui';
import { NAME_MAX, cleanName, latinDigits, nameProblem, yearsProblem } from '@sulalah/domain';
import { useState } from 'react';
import { fold, type Person } from '@/lib/demo-store';

export interface PersonDraft {
  name: string;
  gender: 'male' | 'female';
  deceased: boolean;
  birthYear?: number;
  deathYear?: number;
  kunya?: string;
  bio?: string;
}

/**
 * S09: add children under a father, several in a row, or edit one person. A contributor's
 * additions go in as pending; the owner's are approved straight away.
 */
export function AddPersonSheet({
  father,
  gender,
  editing,
  siblings,
  contributor,
  hasChildren,
  onSave,
  onDelete,
  onClose,
}: {
  father: Person;
  gender: 'male' | 'female';
  /** The person being edited; adding when absent. */
  editing?: Person;
  /** The father's children already in the tree, for the duplicate check. */
  siblings: Person[];
  contributor?: boolean;
  hasChildren?: boolean;
  onSave: (draft: PersonDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const blank = (g: 'male' | 'female'): PersonDraft => ({ name: '', gender: g, deceased: false });
  const [d, setD] = useState<PersonDraft>(
    editing
      ? {
          name: editing.name,
          gender: editing.gender,
          deceased: !!editing.deceased,
          birthYear: editing.birthYear,
          deathYear: editing.deathYear,
          kunya: editing.kunya,
          bio: editing.bio,
        }
      : blank(gender),
  );
  const [more, setMore] = useState(!!editing && !!(editing.birthYear || editing.kunya || editing.bio));
  const [added, setAdded] = useState<string[]>([]);
  const [warned, setWarned] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();

  const rel = d.gender === 'female' ? 'ابنة' : 'ابن';
  const duplicate =
    d.name.trim() &&
    siblings.find((s) => s.id !== editing?.id && s.gender === d.gender && fold(s.name) === fold(d.name));

  const [yearError, setYearError] = useState<string>();

  const save = () => {
    const bad = nameProblem(d.name);
    if (bad) {
      setError(bad);
      return;
    }
    // Someone alive has no death year, whatever was typed before the switch was flipped.
    const clean = { ...d, name: cleanName(d.name), deathYear: d.deceased ? d.deathYear : undefined };
    const years = yearsProblem(clean);
    if (years) {
      setYearError(years);
      setMore(true);
      return;
    }
    if (duplicate && !warned) {
      setWarned(true);
      return;
    }
    onSave(clean);
    if (editing) return;
    setAdded((a) => [...a, clean.name]);
    setD(blank(d.gender));
    setWarned(false);
    setError(undefined);
    setYearError(undefined);
  };

  const year = (v: string) => {
    setYearError(undefined);
    const digits = latinDigits(v).replace(/\D/g, '').slice(0, 4);
    return digits ? Number(digits) || undefined : undefined;
  };

  return (
    <Sheet label={editing ? `تعديل ${editing.name}` : `إضافة ${rel}`}>
      <div className="flex items-center justify-between border-b border-line/25 bg-surface-low/60 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-body font-semibold text-forest">
          <Icon name={editing ? 'edit' : 'person_add'} className="text-olive" />
          <span className="truncate">
            {editing ? `تعديل ${editing.name}` : `إضافة ${rel} لـ ${father.name}`}
          </span>
        </span>
        <IconButton label="إغلاق" className="size-8" onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </div>

      <form
        className="grid gap-4 overflow-y-auto p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {added.length ? (
          <div className="grid gap-2 rounded-xl border border-success/20 bg-success-soft p-3">
            <p className="flex items-center gap-1.5 text-body font-semibold text-success">
              <Icon name="check_circle" fill />
              تمت إضافة {added.at(-1)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {added.map((n, i) => (
                <Chip key={`${n}-${i}`} tone={contributor ? 'pending' : 'success'}>
                  {n}
                </Chip>
              ))}
            </div>
            <p className="text-caption text-muted">اكتب اسم التالي، أو أغلق إذا خلصت.</p>
          </div>
        ) : null}

        <Field
          label="الاسم"
          autoFocus
          maxLength={NAME_MAX}
          value={d.name}
          placeholder={d.gender === 'female' ? 'مثل: نورة' : 'مثل: سلمان'}
          error={error}
          onChange={(e) => {
            setD({ ...d, name: e.target.value });
            setError(undefined);
            setWarned(false);
          }}
          hint={d.name.trim() ? `يظهر: ${d.name.trim()} ${d.gender === 'female' ? 'بنت' : 'بن'} ${father.name}` : undefined}
        />

        {duplicate ? (
          <p
            className={cn(
              'flex items-start gap-2 rounded-xl border p-3 text-caption leading-relaxed',
              warned ? 'border-pending/50 bg-pending-soft text-pending' : 'border-line/40 bg-surface-low text-ink-soft',
            )}
          >
            <Icon name="warning" className="mt-0.5" />
            يوجد {rel} باسم {duplicate.name} مسجّل لـ {father.name}.{' '}
            {warned ? 'اضغط مرة ثانية إذا متأكد إنه شخص آخر.' : ''}
          </p>
        ) : null}

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <span className="text-body font-medium text-ink">الجنس</span>
            <Segmented
              label="الجنس"
              value={d.gender}
              onChange={(g) => setD({ ...d, gender: g })}
              options={[
                { value: 'male', label: 'ابن' },
                { value: 'female', label: 'ابنة' },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-body font-medium text-ink">الحالة</span>
            <Segmented
              label="الحالة"
              value={d.deceased ? 'dead' : 'alive'}
              onChange={(v) => setD({ ...d, deceased: v === 'dead' })}
              options={[
                { value: 'alive', label: 'على قيد الحياة' },
                { value: 'dead', label: 'متوفى' },
              ]}
            />
          </div>
        </div>

        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
          className="flex items-center justify-between rounded-xl border border-line/40 px-4 py-2.5 text-body font-medium text-forest hover:bg-surface-low"
        >
          تفاصيل أكثر (اختياري)
          <Icon name="expand_more" className={cn('transition', more && 'rotate-180')} />
        </button>
        {more ? (
          <div className="grid animate-rise gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="سنة الميلاد"
                inputMode="numeric"
                dir="ltr"
                placeholder="1985"
                value={d.birthYear ?? ''}
                onChange={(e) => setD({ ...d, birthYear: year(e.target.value) })}
              />
              <Field
                label="سنة الوفاة"
                inputMode="numeric"
                dir="ltr"
                placeholder="—"
                disabled={!d.deceased}
                value={d.deceased ? (d.deathYear ?? '') : ''}
                onChange={(e) => setD({ ...d, deathYear: year(e.target.value) })}
              />
            </div>
            {yearError ? (
              <p role="alert" className="text-caption font-medium text-danger">
                {yearError}
              </p>
            ) : null}
            <Field
              label="اللقب أو الكنية"
              maxLength={NAME_MAX}
              placeholder="مثل: أبو فهد"
              value={d.kunya ?? ''}
              onChange={(e) => setD({ ...d, kunya: e.target.value })}
            />
            <label className="grid gap-1.5">
              <span className="text-body font-medium text-ink">نبذة قصيرة</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={d.bio ?? ''}
                onChange={(e) => setD({ ...d, bio: e.target.value })}
                placeholder="سطر أو سطرين يعرفه فيها أهله"
                className="rounded-xl border border-line/70 bg-card px-4 py-3 text-body-lg outline-none focus:border-forest focus:ring-2 focus:ring-gold-light/50"
              />
            </label>
          </div>
        ) : null}

        {contributor && !editing ? (
          <p className="flex items-start gap-2 rounded-xl bg-pending-soft p-3 text-caption leading-relaxed text-pending">
            <Icon name="schedule" className="mt-0.5" />
            تظهر إضافتك كبرعم بحدود منقطة، وترسلها للاعتماد من الشريط تحت.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" className="flex-1 rounded-xl">
            <Icon name={editing ? 'save' : 'add'} />
            {editing ? 'حفظ التعديل' : warned ? 'أضف على أي حال' : contributor ? `أضف ${rel}` : `احفظ وأضف ${rel}`}
          </Button>
          <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>
            {added.length ? 'خلصت' : 'إلغاء'}
          </Button>
        </div>

        {editing && onDelete ? (
          <div className="border-t border-line/30 pt-3">
            {hasChildren ? (
              <p className="text-caption text-muted">لا يمكن حذف من له أبناء مسجّلون. انقل أبناءه أو احذفهم أولًا.</p>
            ) : confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3">
                <span className="flex-1 text-caption text-danger">يُحذف {editing.name} من الشجرة. متأكد؟</span>
                <Button size="sm" variant="danger" onClick={onDelete}>
                  احذف
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  لا
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 text-caption font-semibold text-danger hover:underline"
              >
                <Icon name="delete" className="text-[1.1em]" />
                حذف من الشجرة
              </button>
            )}
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
