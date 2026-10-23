'use client';

import { LivingTree } from '@sulalah/tree-svg';
import type { LineagePerson, LineageUnion } from '@sulalah/tree-engine';
import { Button, LineagePath, Sheet, SheetHeader, TopBar, TreeLegend } from '@sulalah/ui';
import { useState, type ReactNode } from 'react';

export interface TreeExplorerProps {
  people: LineagePerson[];
  unions?: LineageUnion[];
  rootId: string;
  ancestors?: string[];
  title?: string;
  /** Adding is offered only when this is given; the caller decides where the new person goes. */
  onAdd?: (father: LineagePerson, gender: 'male' | 'female') => void;
  /** Extra controls at the end of the top bar. */
  topEnd?: ReactNode;
}

/**
 * The living tree with its chrome: the lineage path at the top, and a sheet for the chosen
 * person. One component for the demo and the real editor, so they never drift apart.
 */
export function TreeExplorer({
  people,
  unions,
  rootId,
  ancestors,
  title,
  onAdd,
  topEnd,
}: TreeExplorerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<LineagePerson[]>([]);
  const [fit, setFit] = useState(0);

  const person = path.at(-1);
  const childCount = person ? people.filter((p) => p.fatherId === person.id).length : 0;
  const showAll = () => {
    setSelected(null);
    setPath([]);
    setFit((f) => f + 1);
  };

  return (
    <>
      <div className="fixed inset-0">
        <LivingTree
          people={people}
          unions={unions}
          rootId={rootId}
          ancestors={ancestors}
          title={title}
          selectedId={selected}
          fitSignal={fit}
          onSelect={(id, p) => {
            setSelected(id);
            setPath(p);
          }}
        />
      </div>
      <TopBar end={topEnd}>
        <LineagePath
          items={path.map((p) => ({ id: p.id, label: p.name }))}
          onPick={(i) => {
            setSelected(path[i]!.id);
            setPath(path.slice(0, i + 1));
          }}
        />
      </TopBar>

      {person ? (
        <Sheet label={person.name}>
          <SheetHeader
            eyebrow={`الجيل ${path.length}${person.status === 'proposed' ? ' · بانتظار الاعتماد' : ''}`}
            title={person.name}
            meta={childCount ? `${childCount} من الأبناء والبنات` : 'لا أبناء مسجّلون بعد'}
            aside={
              <Button variant="ghost" size="sm" onClick={showAll}>
                الشجرة كاملة
              </Button>
            }
          />
          {onAdd ? (
            <div className="flex flex-wrap gap-2.5">
              <Button className="flex-[1_1_140px]" onClick={() => onAdd(person, 'male')}>
                إضافة ابن
              </Button>
              <Button
                variant="soft"
                className="flex-[1_1_140px]"
                onClick={() => onAdd(person, 'female')}
              >
                إضافة ابنة
              </Button>
            </div>
          ) : null}
        </Sheet>
      ) : (
        <TreeLegend />
      )}
    </>
  );
}
