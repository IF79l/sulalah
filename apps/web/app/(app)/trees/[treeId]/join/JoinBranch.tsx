'use client';

import { Button, Icon, Logo, Medallion, Segmented, cn } from '@sulalah/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ROOT_ID,
  TREE_ID,
  TREE_TITLE,
  byId,
  childrenOf,
  fold,
  lineage,
  nasab,
  num,
  pathTo,
  update,
  useDemo,
} from '@/lib/demo-store';

/** S13: the relative finds himself (or his father) so his additions land in the right place. */
export function JoinBranch() {
  const s = useDemo();
  const router = useRouter();
  const [how, setHow] = useState<'search' | 'browse'>('search');
  const [q, setQ] = useState('');
  const [trail, setTrail] = useState<string[]>([ROOT_ID]);
  const [picked, setPicked] = useState<string | null>(null);
  const [who, setWho] = useState<'me' | 'father'>('me');

  const m = byId(s.people);
  const men = lineage(s.people).filter((p) => p.gender === 'male' && p.status === 'approved');
  const hits = fold(q) ? men.filter((p) => fold(nasab(pathTo(s.people, p.id))).includes(fold(q))).slice(0, 8) : [];
  const here = trail.at(-1)!;
  const sons = childrenOf(s.people, here).filter((p) => p.gender === 'male' && p.status === 'approved');
  const person = picked ? m.get(picked) : undefined;
  const me = s.me.first;

  const confirm = () => {
    if (!person) return;
    update((st) => ({ ...st, myBranch: person.id }));
    router.push(`/trees/${TREE_ID}?as=contribute`);
  };

  const Row = ({ id, onClick, chevron }: { id: string; onClick: () => void; chevron?: boolean }) => {
    const p = m.get(id)!;
    const n = childrenOf(s.people, id).length;
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border p-3 text-start transition',
          picked === id ? 'border-forest bg-olive-soft/50' : 'border-line/40 bg-card hover:border-gold-light',
        )}
      >
        <Medallion name={p.name} size="sm" />
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-body font-semibold text-forest">{nasab(pathTo(s.people, id))}</span>
          <span className="text-caption text-muted">{n ? `${num(n)} من الأبناء والبنات` : 'لا أبناء مسجّلون'}</span>
        </span>
        {chevron && n ? <Icon name="chevron_left" className="text-muted" /> : null}
      </button>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="flex h-16 items-center justify-between border-b border-line/30 px-4 md:px-8">
        <Logo />
        <span className="text-caption font-semibold text-muted">{TREE_TITLE}</span>
      </header>
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-5 px-4 py-8">
        <div className="grid gap-1.5">
          <h1 className="text-h1-m font-bold text-forest md:text-h1">وين غصنك؟</h1>
          <p className="text-body-lg text-ink-soft">اختر اسم أبيك، أو اسمك إذا كنت مسجّلًا.</p>
        </div>

        <Segmented
          label="طريقة البحث"
          value={how}
          onChange={setHow}
          options={[
            { value: 'search', label: 'بحث' },
            { value: 'browse', label: 'تصفّح' },
          ]}
        />

        {how === 'search' ? (
          <div className="grid gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-line/70 bg-card px-4 focus-within:border-forest focus-within:ring-2 focus-within:ring-gold-light/50">
              <Icon name="search" className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="مثل: ماجد بن سالم"
                className="h-13 w-0 min-w-0 flex-1 bg-transparent text-body-lg outline-none"
              />
            </label>
            <ul className="grid gap-2">
              {hits.map((p) => (
                <li key={p.id}>
                  <Row id={p.id} onClick={() => setPicked(p.id)} />
                </li>
              ))}
            </ul>
            {fold(q) && !hits.length ? (
              <p className="rounded-xl bg-surface-low p-4 text-center text-body text-muted">
                ما لقينا أحد بهذا الاسم. جرّب اسم أبيك أو جدك، أو استخدم التصفّح.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3">
            <nav aria-label="المسار" className="flex flex-wrap items-center gap-1 text-caption">
              {trail.map((id, i) => (
                <span key={id} className="flex items-center gap-1">
                  {i > 0 ? <Icon name="chevron_left" className="text-[1rem] text-gold" /> : null}
                  <button
                    type="button"
                    onClick={() => setTrail(trail.slice(0, i + 1))}
                    className={cn('rounded-full px-2 py-0.5 font-semibold', i === trail.length - 1 ? 'bg-olive-soft text-on-olive-soft' : 'text-forest hover:bg-surface')}
                  >
                    {m.get(id)?.name}
                  </button>
                </span>
              ))}
            </nav>
            <Row id={here} onClick={() => setPicked(here)} />
            <ul className="grid gap-2 border-s-2 border-gold-light/50 ps-3">
              {sons.map((p) => (
                <li key={p.id}>
                  <Row
                    id={p.id}
                    chevron
                    onClick={() => {
                      setPicked(p.id);
                      if (childrenOf(s.people, p.id).length) setTrail([...trail, p.id]);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {person ? (
          <div className="sticky bottom-4 grid animate-rise gap-3 rounded-2xl border border-gold-light/60 bg-card p-4 shadow-float">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="من هذا؟">
              {(
                [
                  ['me', 'هذا أنا', person.name],
                  ['father', 'هذا أبي، وأنا غير مسجّل', `${me} بن ${person.name}`],
                ] as const
              ).map(([v, label, name]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={who === v}
                  onClick={() => setWho(v)}
                  className={cn('grid gap-0.5 rounded-xl border p-3 text-start', who === v ? 'border-forest bg-olive-soft/40' : 'border-line/50')}
                >
                  <span className="text-caption text-muted">{label}</span>
                  <span className="text-body font-semibold text-forest">{name}</span>
                </button>
              ))}
            </div>
            <p className="rounded-xl bg-surface-low px-3 py-2.5 text-body text-ink">
              أنا <strong className="text-forest">{who === 'me' ? nasab(pathTo(s.people, person.id)) : `${me} بن ${nasab(pathTo(s.people, person.id))}`}</strong>
            </p>
            <Button className="rounded-xl" onClick={confirm}>
              <Icon name="check" />
              تأكيد
            </Button>
            <p className="text-center text-caption text-muted">تقدر تضيف داخل غصنك فقط. المالك يراجع اختيارك.</p>
          </div>
        ) : null}

        <Link href="/trees" className="justify-self-center text-caption font-semibold text-olive hover:underline">
          لاحقًا
        </Link>
      </main>
    </div>
  );
}
