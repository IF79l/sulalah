'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/** True once the element has scrolled into view; stays true after that. */
export function useInView<T extends Element>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, seen]);
  return [ref, seen] as const;
}

/**
 * Marks its box `data-in` once seen, so the CSS in globals.css can play that box's own
 * entrance (children with `data-reveal`, drawn strokes, and so on). Nothing moves before then.
 */
export function InView({
  as: Tag = 'div',
  className,
  children,
  id,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} id={id} data-in={seen ? '' : undefined} className={className}>
      {children}
    </Tag>
  );
}
