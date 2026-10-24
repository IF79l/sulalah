'use client';

import { Button, Chip, Icon, Medallion, buttonClass, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppShell, EmptyState, Panel, Toast } from '@/components/AppShell';
import {
  currentTreeId,
  actingName,
  allows,
  byId,
  childrenOf,
  inBranch,
  lineage,
  myName,
  nasab,
  newId,
  num,
  pathTo,
  update,
  useDemo,
  type Person,
  when,
} from '@/lib/demo-store';

const t = (p = '') => `/trees/${currentTreeId()}${p}`;

function leafTone(p: Person) {
  if (p.status === 'proposed') return 'border-dashed border-pending bg-pending-soft text-pending';
  if (p.deceased) return 'border-transparent bg-[#efe3c6] text-[#7a6236]';
  return p.gender === 'female'
    ? 'border-transparent bg-blossom/15 text-[#a2466f]'
    : 'border-transparent bg-leaf/12 text-leaf';
}

/** S10: one person, in full. */
export function Profile({ personId }: { personId: string }) {
  const s = useDemo();
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState('');
  const [moveError, setMoveError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const visitor = s.as === 'visitor';
  // Visitors get the tree as the privacy settings show it: approved names, daughters hidden
  // unless the owner chose otherwise.
  const shown = visitor
    ? s.people
        .filter((x) => x.status === 'approved')
        .map((x) =>
          x.gender === 'female' && !s.settings.showDaughtersToVisitors ? { ...x, name: 'ابنة' } : x,
        )
    : s.people;
  const m = byId(shown);
  const hidden =
    visitor && m.get(personId)?.gender === 'female' && !s.settings.showDaughtersToVisitors;
  const p = hidden || (visitor && !allows(s, { type: 'tree.view' })) ? undefined : m.get(personId);
  const owner = allows(s, { type: 'person.edit' });
  if (!p) {
    return (
      <AppShell title="الملف الشخصي" back={{ href: t(), label: 'الشجرة' }}>
        <EmptyState
          icon="search_off"
          title="هذا الغصن غير موجود"
          body="يمكن انحذف أو تغيّر مكانه في الشجرة."
          action={
            <Link href={t()} className={buttonClass('primary', 'sm')}>
              ارجع للشجرة
            </Link>
          }
        />
      </AppShell>
    );
  }
  const path = pathTo(shown, p.id);
  const full = nasab(path, s.tree.family);
  const kids = childrenOf(shown, p.id);
  const siblings = p.fatherId ? childrenOf(shown, p.fatherId).filter((x) => x.id !== p.id) : [];
  const fathers = lineage(s.people, s.tree.rootId).filter(
    (x) => x.gender === 'male' && x.id !== p.id && x.id !== p.fatherId && x.status === 'approved',
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setToast('نسخنا سلسلة النسب');
    } catch {
      setToast('تعذّر النسخ');
    }
  };

  const move = () => {
    const to = m.get(target);
    if (!to) return;
    if (inBranch(s.people, to.id, p.id)) {
      setMoveError(
        `ما يصير ${to.name} أبًا لـ ${p.name}، لأنه من ذريته. الشخص ما يكون جدًا لنفسه.`,
      );
      return;
    }
    update((st) => ({
      ...st,
      people: st.people.map((x) => (x.id === p.id ? { ...x, fatherId: to.id } : x)),
      log: [
        {
          id: newId('l'),
          who: myName(st),
          action: 'edit',
          text: `نقل ${p.name} تحت ${to.name}`,
          personId: p.id,
          at: 'الآن',
        },
        ...st.log,
      ],
    }));
    setMoving(false);
    setToast(`نقلنا ${p.name} تحت ${to.name}`);
  };

  const history = s.log.filter((l) => l.personId === p.id || l.personId === p.fatherId).slice(0, 4);
  const rel = p.gender === 'female' ? 'بنت' : 'بن';

  return (
    <AppShell
      title={<span className="sr-only">الملف الشخصي</span>}
      back={{ href: `${t()}?focus=${p.id}`, label: 'الشجرة' }}
    >
      <div className="-mt-6 grid gap-6 lg:grid-cols-12">
        <section className="relative overflow-hidden rounded-3xl bg-forest p-6 text-ivory md:p-8 lg:col-span-12">
          <div
            aria-hidden="true"
            className="star-ground absolute inset-0 opacity-30 mix-blend-soft-light"
          />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <Medallion
              name={p.name}
              size="lg"
              className="size-20 border-gold-light text-[1.5rem] md:size-24"
            />
            <div className="grid flex-1 gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Chip tone="forest" className="border border-gold-light/30">
                  الجيل {num(path.length)}
                </Chip>
                {path.length > 2 ? (
                  <Chip tone="forest" className="border border-gold-light/30">
                    فرع {path[1]!.name}
                  </Chip>
                ) : null}
                {p.status === 'proposed' ? <Chip tone="pending">بانتظار الاعتماد</Chip> : null}
                {p.deceased ? <Chip tone="deceased">رحمه الله</Chip> : null}
              </div>
              <h1 className="text-[1.75rem]/[1.3] font-bold md:text-[2.25rem]/[1.3]">
                {p.name}
                {p.kunya ? (
                  <span className="ms-2 text-title font-medium text-gold-light">({p.kunya})</span>
                ) : null}
              </h1>
              <p className="flex flex-wrap items-center gap-2 font-title text-[1.25rem]/[1.6] text-gold-light md:text-[1.5rem]">
                {full}
                <button
                  type="button"
                  onClick={copy}
                  aria-label="نسخ سلسلة النسب"
                  className="rounded-full p-1.5 font-sans text-ivory/80 hover:bg-ivory/10"
                >
                  <Icon name="content_copy" className="text-[1.1rem]" />
                </button>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${t()}?focus=${p.id}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gold-light px-4 font-semibold text-forest hover:bg-ivory"
              >
                <Icon name="my_location" />
                اعرضه على الشجرة
              </Link>
            </div>
          </div>
        </section>

        <div className="grid content-start gap-6 lg:col-span-8">
          <Panel title="المعلومات" icon="info">
            <dl className="grid gap-px overflow-hidden rounded-b-2xl bg-line/30 sm:grid-cols-3">
              {[
                [
                  'الميلاد',
                  p.birthYear && (!visitor || s.settings.showBirthYears)
                    ? String(p.birthYear)
                    : '—',
                ],
                [
                  'الوفاة',
                  p.deceased ? (p.deathYear ? String(p.deathYear) : 'متوفى') : 'على قيد الحياة',
                ],
                ['الأبناء والبنات', num(kids.length)],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-0.5 bg-card px-5 py-4">
                  <dt className="text-caption text-muted">{k}</dt>
                  <dd className="text-title font-semibold text-forest">{v}</dd>
                </div>
              ))}
            </dl>
            {p.bio ? (
              <p className="border-t border-line/30 px-5 py-4 text-body-lg leading-[1.9] text-ink-soft">
                {p.bio}
              </p>
            ) : null}
          </Panel>

          <Panel title={`الأبناء والبنات (${num(kids.length)})`} icon="family_restroom">
            <div className="p-5">
              {kids.length ? (
                <ul className="flex flex-wrap gap-2">
                  {kids.map((k) => (
                    <li key={k.id}>
                      <Link
                        href={t(`/people/${k.id}`)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-[0_1rem_0_1rem] border px-3.5 py-1.5 text-body font-semibold transition hover:shadow-sm',
                          leafTone(k),
                        )}
                      >
                        {k.name}
                        {childrenOf(s.people, k.id).length ? (
                          <span className="text-caption opacity-70">
                            {num(childrenOf(s.people, k.id).length)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body text-muted">لا أبناء مسجّلون بعد.</p>
              )}
            </div>
          </Panel>

          {siblings.length ? (
            <Panel title={`الإخوة والأخوات (${num(siblings.length)})`} icon="diversity_3">
              <ul className="flex flex-wrap gap-2 p-5">
                {siblings.map((k) => (
                  <li key={k.id}>
                    <Link
                      href={t(`/people/${k.id}`)}
                      className={cn(
                        'inline-flex rounded-[0_1rem_0_1rem] border px-3.5 py-1.5 text-body font-semibold',
                        leafTone(k),
                      )}
                    >
                      {k.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <div className="grid content-start gap-6 lg:col-span-4">
          {visitor ? null : (
            <Panel title="سجل التعديلات" icon="history">
              <ol className="grid gap-4 p-5">
                <li className="flex gap-3">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-olive" />
                  <span className="grid text-body">
                    <span className="text-ink">أضافه {p.addedBy ?? 'المالك'}</span>
                    <span className="text-caption text-muted">{p.addedAt ? when(p.addedAt) : '—'}</span>
                  </span>
                </li>
                {p.approvedBy ? (
                  <li className="flex gap-3">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-leaf" />
                    <span className="grid text-body">
                      <span className="text-ink">اعتمده {p.approvedBy}</span>
                      <span className="text-caption text-muted">{p.addedAt ? when(p.addedAt) : '—'}</span>
                    </span>
                  </li>
                ) : null}
                {history.map((l) => (
                  <li key={l.id} className="flex gap-3">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-gold" />
                    <span className="grid text-body">
                      <span className="text-ink">{l.text}</span>
                      <span className="text-caption text-muted">
                        {l.who}، {when(l.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {owner && p.id !== s.tree.rootId ? (
            <Panel title="إجراءات المالك" icon="admin_panel_settings">
              <div className="grid gap-2 p-5">
                <Link
                  href={`${t()}?focus=${p.id}`}
                  className={cn(buttonClass('quiet', 'sm'), 'justify-start rounded-xl')}
                >
                  <Icon name="edit" />
                  تعديل من الشجرة
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMoving((v) => !v);
                    setMoveError(undefined);
                  }}
                  className={cn(buttonClass('quiet', 'sm'), 'justify-start rounded-xl')}
                >
                  <Icon name="move_down" />
                  نقل إلى أب آخر
                </button>
                {moving ? (
                  <div className="grid animate-rise gap-2 rounded-xl border border-line/40 bg-surface-low p-3">
                    <label className="grid gap-1 text-caption font-semibold text-ink">
                      الأب الجديد
                      <select
                        value={target}
                        onChange={(e) => {
                          setTarget(e.target.value);
                          setMoveError(undefined);
                        }}
                        className="h-11 rounded-xl border border-line/70 bg-card px-3 text-body font-normal"
                      >
                        <option value="">اختر</option>
                        {fathers.map((f) => (
                          <option key={f.id} value={f.id}>
                            {nasab(pathTo(s.people, f.id))}
                          </option>
                        ))}
                      </select>
                    </label>
                    {moveError ? (
                      <p
                        role="alert"
                        className="flex items-start gap-2 rounded-lg bg-danger-soft p-2.5 text-caption text-danger"
                      >
                        <Icon name="block" className="mt-0.5" />
                        {moveError}
                      </p>
                    ) : null}
                    <Button size="sm" disabled={!target} onClick={move}>
                      انقل
                    </Button>
                  </div>
                ) : null}
                {kids.length ? (
                  <p className="px-1 pt-1 text-caption text-muted">
                    الحذف متاح لمن ليس له أبناء مسجّلون.
                  </p>
                ) : confirmDelete ? (
                  <div className="flex items-center gap-2 rounded-xl bg-danger-soft p-3">
                    <span className="flex-1 text-caption text-danger">
                      يُحذف {p.name} {rel} {path.at(-2)?.name}. متأكد؟
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        update((st) => ({
                          ...st,
                          people: st.people.filter((x) => x.id !== p.id),
                          log: [
                            {
                              id: newId('l'),
                              who: actingName(st),
                              action: 'delete',
                              text: `حذف ${p.name}`,
                              personId: p.fatherId ?? undefined,
                              at: 'الآن',
                            },
                            ...st.log,
                          ],
                        }));
                        router.push(`${t()}?focus=${p.fatherId}`);
                      }}
                    >
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-caption font-semibold text-danger hover:underline"
                  >
                    <Icon name="delete" className="text-[1.1em]" />
                    حذف من الشجرة
                  </button>
                )}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </AppShell>
  );
}
