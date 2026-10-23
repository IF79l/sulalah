'use client';

import { LivingTree } from '@sulalah/tree-svg';
import type { LineagePerson, LineageUnion } from '@sulalah/tree-engine';
import {
  Button,
  Chip,
  Icon,
  IconButton,
  LineagePath,
  Logo,
  Medallion,
  Sheet,
  TreeLegend,
  buttonClass,
  cn,
  floating,
} from '@sulalah/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

export interface TreeExplorerProps {
  people: LineagePerson[];
  unions?: LineageUnion[];
  rootId: string;
  ancestors?: string[];
  title: string;
  /** Adding is offered only when this is given; the caller decides where the new person goes. */
  onAdd?: (father: LineagePerson, gender: 'male' | 'female') => void;
  /** Where the back arrow goes; no arrow without it. */
  back?: { href: string; label: string };
  /** Replaces the owner's actions at the end of the top bar. */
  headerEnd?: ReactNode;
  /** A one-line note under the top bar, e.g. for the demo. */
  notice?: ReactNode;
}

const num = (n: number) => n.toLocaleString('en-US');

/** "فهد بن عبدالله بن محمد" from the path root → person. */
function nasab(path: LineagePerson[]) {
  return [...path]
    .reverse()
    .map((p, i, all) => (i === 0 ? p.name : `${all[i - 1]!.gender === 'female' ? 'بنت' : 'بن'} ${p.name}`))
    .join(' ');
}

function tone(p: LineagePerson) {
  if (p.status === 'proposed') return 'pending' as const;
  if (p.deceased) return 'deceased' as const;
  return p.gender === 'female' ? ('blossom' as const) : ('leaf' as const);
}

function StatusChip({ person }: { person: LineagePerson }) {
  if (person.status === 'proposed') return <Chip tone="pending">بانتظار الاعتماد</Chip>;
  if (person.deceased) return <Chip tone="deceased">رحمه الله</Chip>;
  return (
    <Chip tone="success" icon="verified">
      معتمد
    </Chip>
  );
}

/**
 * The living tree with its chrome: a top bar with the lineage path, the person card for
 * whoever is chosen, zoom controls and the legend. One component for the demo and the real
 * tree, so they never drift apart.
 */
export function TreeExplorer({
  people,
  unions = [],
  rootId,
  ancestors,
  title,
  onAdd,
  back,
  headerEnd,
  notice,
}: TreeExplorerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<LineagePerson[]>([]);
  const [fit, setFit] = useState(0);
  const [zoom, setZoom] = useState<{ n: number; factor: number }>();
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const childrenOf = (id: string) => people.filter((p) => p.fatherId === id);
  const lineagePeople = people.filter((p) => p.id === rootId || p.fatherId);
  const generations = useMemo(() => {
    const depth = (p: LineagePerson): number =>
      p.fatherId && byId.has(p.fatherId) ? 1 + depth(byId.get(p.fatherId)!) : 1;
    return Math.max(1, ...lineagePeople.map(depth));
  }, [byId, lineagePeople]);
  const pending = lineagePeople.filter((p) => p.status === 'proposed');

  const pathOf = (id: string) => {
    const out: LineagePerson[] = [];
    for (let p = byId.get(id); p; p = p.fatherId ? byId.get(p.fatherId) : undefined) out.unshift(p);
    return out;
  };
  const choose = (id: string | null) => {
    setSelected(id);
    setPath(id ? pathOf(id) : []);
  };
  const showAll = () => {
    choose(null);
    setFit((f) => f + 1);
  };

  const person = path.at(-1);
  const kids = person ? childrenOf(person.id) : [];
  const spouses = person
    ? unions
        .filter((u) => u.aId === person.id || u.bId === person.id)
        .map((u) => byId.get(u.aId === person.id ? u.bId : u.aId))
        .filter((p): p is LineagePerson => !!p)
    : [];

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(done);
    } catch {
      setToast('تعذّر النسخ');
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-14 bottom-0 md:top-16">
        <LivingTree
          people={people}
          unions={unions}
          rootId={rootId}
          ancestors={ancestors}
          title={title}
          selectedId={selected}
          fitSignal={fit}
          zoomSignal={zoom}
          onSelect={(id, p) => {
            setSelected(id);
            setPath(p);
          }}
        />
      </div>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line/30 bg-ivory/90 shadow-xs backdrop-blur-md md:h-16',
          'pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] md:px-8',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <>
              <Link
                href={back.href}
                className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-body font-semibold text-forest hover:bg-surface"
              >
                <Icon name="arrow_forward" />
                <span className="hidden sm:inline">{back.label}</span>
              </Link>
              <span className="hidden h-5 w-px bg-line/60 sm:block" />
            </>
          ) : null}
          <Link href="/" aria-label="سُلالة" className="hidden text-[0.95rem] sm:block">
            <Logo />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-title font-bold text-forest">{title}</h1>
            <span className="hidden rounded-full bg-surface px-2 py-0.5 text-caption whitespace-nowrap text-muted md:inline">
              {num(generations)} أجيال · {num(lineagePeople.length)} فردًا
            </span>
          </div>
        </div>

        {path.length ? (
          <div className="hidden items-center gap-2 xl:flex">
            <LineagePath
              items={path.map((p) => ({ id: p.id, label: p.name }))}
              onPick={(i) => choose(path[i]!.id)}
            />
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {pending.length > 0 && onAdd ? (
            <button
              type="button"
              onClick={() => choose(pending[0]!.id)}
              className="hidden items-center gap-2 rounded-full border border-pending/30 bg-pending-soft px-3 py-1.5 text-body font-medium text-pending transition hover:bg-pending/10 md:inline-flex"
            >
              <Icon name="assignment_late" />
              {num(pending.length)} بانتظار الاعتماد
            </button>
          ) : null}
          <IconButton label="بحث في الشجرة" onClick={() => setSearching(true)}>
            <Icon name="search" />
          </IconButton>
          <IconButton
            label="انسخ رابط الشجرة"
            onClick={() => copy(window.location.href, 'نسخنا رابط الشجرة')}
          >
            <Icon name="share" />
          </IconButton>
          {headerEnd ??
            (onAdd ? (
              <>
                <span className="mx-1 hidden h-6 w-px bg-line/50 sm:block" />
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() => choose(person?.id ?? rootId)}
                >
                  <Icon name="person_add" />
                  <span className="hidden sm:inline">إضافة فرد</span>
                </Button>
              </>
            ) : null)}
        </div>
      </header>

      {notice ? (
        <p
          className={cn(
            floating,
            'fixed top-[4.25rem] left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-1.5 text-caption whitespace-nowrap text-ink-soft shadow-sm md:top-20',
            path.length > 0 && 'max-xl:hidden',
          )}
        >
          {notice}
        </p>
      ) : null}

      {path.length ? (
        <div className="fixed inset-x-0 top-[4.25rem] z-20 flex justify-center px-4 xl:hidden">
          <LineagePath
            items={path.map((p) => ({ id: p.id, label: p.name }))}
            onPick={(i) => choose(path[i]!.id)}
          />
        </div>
      ) : null}

      {person ? (
        <Sheet label={person.name}>
          <div className="flex items-center justify-between border-b border-line/25 bg-surface-low/60 px-4 py-2.5">
            <span className="flex items-center gap-2 text-caption font-semibold text-muted">
              <Icon name="badge" className="text-forest" />
              بطاقة الشخص
            </span>
            <IconButton label="إغلاق" className="size-8" onClick={() => choose(null)}>
              <Icon name="close" />
            </IconButton>
          </div>

          <div className="grid gap-4 overflow-y-auto p-5">
            <div className="flex items-start gap-4">
              <span className="relative">
                <Medallion name={person.name} size="lg" />
                {person.status === 'approved' && !person.deceased ? (
                  <span className="absolute -bottom-0.5 -left-0.5 flex size-5 items-center justify-center rounded-full border-2 border-card bg-leaf text-white">
                    <Icon name="check" className="text-[0.75rem]" />
                  </span>
                ) : null}
              </span>
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone="olive">
                    الجيل {num(path.length)}
                    {path.length > 2 ? ` · فرع ${path[1]!.name}` : ''}
                  </Chip>
                  <StatusChip person={person} />
                </div>
                <h2 className="text-h2 font-bold text-balance text-forest">{nasab(path)}</h2>
                <p className="text-caption text-muted">
                  {kids.length
                    ? `${num(kids.length)} من الأبناء والبنات مسجّلون`
                    : 'لا أبناء مسجّلون بعد'}
                </p>
              </div>
            </div>

            {onAdd && person.gender === 'male' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button className="rounded-xl" onClick={() => onAdd(person, 'male')}>
                  <Icon name="add" />
                  إضافة ابن
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => onAdd(person, 'female')}
                >
                  <Icon name="add" />
                  إضافة ابنة
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-line/30 py-2.5 text-caption font-medium text-olive">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:underline"
                onClick={() => copy(nasab(path), 'نسخنا سلسلة النسب')}
              >
                <Icon name="content_copy" className="text-[1.1em]" />
                نسخ سلسلة النسب
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:underline"
                onClick={showAll}
              >
                <Icon name="account_tree" className="text-[1.1em]" />
                الشجرة كاملة
              </button>
            </div>

            {kids.length ? (
              <section className="grid gap-2">
                <h3 className="flex items-center gap-1.5 text-title font-semibold text-forest">
                  <Icon name="family_restroom" className="text-olive" />
                  الأبناء والبنات ({num(kids.length)})
                </h3>
                <ul className="grid gap-2">
                  {kids.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        onClick={() => choose(k.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-start transition hover:border-gold-light',
                          k.status === 'proposed'
                            ? 'border-pending/40 bg-pending-soft/60'
                            : 'border-line/30 bg-surface-low',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Medallion name={k.name} size="sm" tone={tone(k)} />
                          <span className="grid min-w-0">
                            <span
                              className={cn(
                                'text-body font-semibold',
                                k.deceased ? 'text-muted' : 'text-forest',
                              )}
                            >
                              {k.name} {k.gender === 'female' ? 'بنت' : 'بن'} {person.name}
                            </span>
                            <span className="text-caption text-muted">
                              {k.gender === 'female' ? 'ابنة' : 'ابن'}
                              {childrenOf(k.id).length
                                ? ` · ${num(childrenOf(k.id).length)} من الأبناء`
                                : ''}
                            </span>
                          </span>
                        </span>
                        <StatusChip person={k} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {spouses.length ? (
              <section className="grid gap-2 border-t border-line/30 pt-3">
                <h3 className="text-caption font-semibold text-muted">
                  {person.gender === 'female' ? 'الزوج' : spouses.length > 1 ? 'الزوجات' : 'الزوجة'}
                </h3>
                {spouses.map((s) => (
                  <p
                    key={s.id}
                    className="flex items-center gap-2 rounded-xl border border-line/20 bg-surface-low p-2.5 text-body font-medium text-forest"
                  >
                    <Icon name="favorite" fill className="text-blossom" />
                    {s.name}
                  </p>
                ))}
              </section>
            ) : null}
          </div>
        </Sheet>
      ) : null}

      <div
        className={cn(
          'fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-[max(16px,env(safe-area-inset-left,0px))] z-20 flex-col gap-2 md:left-6',
          person ? 'hidden md:flex' : 'flex max-md:bottom-[calc(76px+env(safe-area-inset-bottom,0px))]',
        )}
      >
        <div className={cn(floating, 'flex flex-col overflow-hidden rounded-2xl shadow-float')}>
          <IconButton
            label="تكبير"
            className="rounded-none"
            onClick={() => setZoom((z) => ({ n: (z?.n ?? 0) + 1, factor: 0.7 }))}
          >
            <Icon name="add" />
          </IconButton>
          <span className="h-px bg-line/30" />
          <IconButton
            label="تصغير"
            className="rounded-none"
            onClick={() => setZoom((z) => ({ n: (z?.n ?? 0) + 1, factor: 1.4 }))}
          >
            <Icon name="remove" />
          </IconButton>
        </div>
        <button
          type="button"
          onClick={showAll}
          className={cn(
            floating,
            'hidden h-11 items-center gap-1.5 rounded-xl px-3 text-caption font-semibold text-forest shadow-float hover:bg-surface md:inline-flex',
          )}
        >
          <Icon name="account_tree" />
          الشجرة كاملة
        </button>
      </div>

      <TreeLegend className={person ? 'max-md:hidden md:start-[424px]' : undefined} />

      {searching ? (
        <SearchOverlay
          people={lineagePeople}
          nasabOf={(id) => nasab(pathOf(id))}
          onClose={() => setSearching(false)}
          onPick={(id) => {
            setSearching(false);
            choose(id);
          }}
        />
      ) : null}

      {toast ? (
        <p
          role="status"
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 animate-rise rounded-full bg-forest px-5 py-2.5 text-body text-ivory shadow-toast"
        >
          {toast}
        </p>
      ) : null}
    </>
  );
}

/** Arabic-aware name search: hamza forms and taa marbuta match their plain letters. */
const fold = (s: string) =>
  s
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();

function SearchOverlay({
  people,
  nasabOf,
  onPick,
  onClose,
}: {
  people: LineagePerson[];
  nasabOf: (id: string) => string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query = fold(q);
  const hits = query
    ? people.filter((p) => fold(nasabOf(p.id)).includes(query)).slice(0, 12)
    : [];
  return (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-forest-deep/40 px-4 pt-20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="بحث في الشجرة"
        className="h-fit w-full max-w-lg animate-rise overflow-hidden rounded-2xl border border-gold-light/40 bg-card shadow-float"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <label className="flex items-center gap-2 border-b border-line/30 px-4">
          <Icon name="search" className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو النسب… مثل: فهد بن عبدالله"
            className="h-14 flex-1 bg-transparent text-body-lg outline-none placeholder:text-outline/70"
          />
        </label>
        {query ? (
          hits.length ? (
            <ul className="max-h-[50dvh] overflow-y-auto p-2">
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPick(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-start hover:bg-surface-low"
                  >
                    <Medallion name={p.name} size="sm" tone={tone(p)} />
                    <span className="grid">
                      <span className="text-body font-semibold text-forest">{p.name}</span>
                      <span className="text-caption text-muted">{nasabOf(p.id)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-body text-muted">ما لقينا أحد بهذا الاسم</p>
          )
        ) : (
          <p className="p-6 text-center text-caption text-muted">
            نطابق اختلاف الهمزات والتاء المربوطة: أحمد = احمد
          </p>
        )}
      </div>
    </div>
  );
}
