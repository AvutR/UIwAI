import { useRef, useState, useCallback } from "react";

/* A tiny pointer-drag hook — no external DnD library.
   Reports a live pixel delta while dragging and fires onDrop with the
   final delta. Keeping this hand-rolled keeps the drag behavior fully
   legible and the dependency tree at just React. */

export interface DragState {
  dragging: boolean;
  dx: number;
  dy: number;
}

export function usePointerDrag(onDrop: (dx: number, dy: number) => void) {
  const [state, setState] = useState<DragState>({ dragging: false, dx: 0, dy: 0 });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const latest = useRef({ dx: 0, dy: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // ignore drags that start on interactive controls inside the widget
      const el = e.target as HTMLElement;
      if (el.closest("button, input, select, textarea, a, [data-no-drag]")) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      origin.current = { x: e.clientX, y: e.clientY };
      latest.current = { dx: 0, dy: 0 };
      setState({ dragging: true, dx: 0, dy: 0 });
    },
    []
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!origin.current) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    latest.current = { dx, dy };
    setState({ dragging: true, dx, dy });
  }, []);

  const end = useCallback(() => {
    if (!origin.current) return;
    origin.current = null;
    const { dx, dy } = latest.current;
    setState({ dragging: false, dx: 0, dy: 0 });
    onDrop(dx, dy);
  }, [onDrop]);

  return {
    state,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
