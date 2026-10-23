import { easeInOutCubic, flyTo, type View } from '@sulalah/tree-engine';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Owns the 2D camera: cinematic flights between views, plus drag, wheel and pinch.
 * Any touch from the viewer cancels a flight in progress.
 */
export function useCamera(svg: RefObject<SVGSVGElement | null>, initial: View) {
  const [view, setView] = useState(initial);
  const viewRef = useRef(view);
  viewRef.current = view;
  const flight = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setSize({ w: e.contentRect.width || 1, h: e.contentRect.height || 1 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [svg]);

  const stop = () => {
    if (flight.current !== null) cancelAnimationFrame(flight.current);
    flight.current = null;
  };

  const fly = useCallback((to: View) => {
    stop();
    const path = flyTo(viewRef.current, to);
    const duration = prefersReducedMotion() ? 1 : path.duration;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setView(path.at(easeInOutCubic(t)));
      flight.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    flight.current = requestAnimationFrame(step);
  }, []);

  // Gestures. A drag of more than a few pixels marks the pointer-up as "not a click".
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinchStart = useRef<{ dist: number; view: View; mid: { x: number; y: number } } | null>(
    null,
  );

  const toWorld = (px: number, py: number, v: View) => {
    const rect = svg.current!.getBoundingClientRect();
    const scale = v.width / rect.width;
    return {
      x: v.cx + (px - rect.left - rect.width / 2) * scale,
      y: v.cy + (py - rect.top - rect.height / 2) * scale,
    };
  };

  const zoomAt = (px: number, py: number, factor: number, base = viewRef.current) => {
    const width = Math.min(12000, Math.max(120, base.width * factor));
    const p = toWorld(px, py, base);
    const k = width / base.width;
    setView({ cx: p.x + (base.cx - p.x) * k, cy: p.y + (base.cy - p.y) * k, width });
  };

  const handlers = {
    onPointerDown(e: React.PointerEvent) {
      stop();
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragged.current = false;
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()] as [
          { x: number; y: number },
          { x: number; y: number },
        ];
        pinchStart.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          view: viewRef.current,
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
      }
    },
    onPointerMove(e: React.PointerEvent) {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.current.set(e.pointerId, next);
      if (pointers.current.size === 2 && pinchStart.current) {
        const [a, b] = [...pointers.current.values()] as [
          { x: number; y: number },
          { x: number; y: number },
        ];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        dragged.current = true;
        const s = pinchStart.current;
        zoomAt(s.mid.x, s.mid.y, s.dist / Math.max(dist, 1), s.view);
        return;
      }
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        if (!dragged.current && Math.hypot(dx, dy) < 4) return;
        dragged.current = true;
        if (!svg.current?.hasPointerCapture(e.pointerId))
          svg.current?.setPointerCapture(e.pointerId);
        const v = viewRef.current;
        const scale = v.width / svg.current!.getBoundingClientRect().width;
        setView({ ...v, cx: v.cx - dx * scale, cy: v.cy - dy * scale });
      }
    },
    onPointerUp(e: React.PointerEvent) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinchStart.current = null;
    },
    onWheel(e: React.WheelEvent) {
      stop();
      zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015));
    },
  };

  /** Zoom about the centre of the view, as the on-screen +/- buttons do. */
  const zoomBy = useCallback(
    (factor: number) => {
      const v = viewRef.current;
      fly({ ...v, width: Math.min(12000, Math.max(120, v.width * factor)) });
    },
    [fly],
  );

  return { view, size, fly, zoomBy, handlers, wasDrag: () => dragged.current };
}
