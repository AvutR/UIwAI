import { useRef } from "react";
import type { Widget } from "../types";
import type { Store } from "../lib/store";
import { REGISTRY, titleFor } from "../registry";
import { PRIMITIVE_META } from "../primitives/meta";
import { SPAN, CELL, ROW, GAP, pxToCell, isValidPlacement } from "../lib/grid";
import { usePointerDrag } from "../lib/usePointerDrag";

/* The board. Renders widgets on the discrete grid, drag-to-move with
   snapping, click-to-select. Every move goes through the store's patch
   pipeline, so an illegal drop (overlap / overflow) is simply rejected
   and the widget snaps back. */

export function Canvas({ store, selected, onSelect }: { store: Store; selected: string | null; onSelect: (id: string | null) => void }) {
  const { world } = store;
  const rows = Math.max(4, ...world.board.widgets.map((w) => w.pos.row + SPAN[w.size].h)) + 1;
  const width = 4 * CELL + 3 * GAP;
  const height = rows * ROW + (rows - 1) * GAP;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "var(--space-6)" }} onPointerDown={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
      <div style={{ position: "relative", width, height, margin: "0 auto" }}
        onPointerDown={(e) => { if (e.currentTarget === e.target) onSelect(null); }}>
        {/* subtle grid guides */}
        <GridGuides rows={rows} />
        {world.board.widgets.map((w) => (
          <WidgetCard key={w.id} widget={w} store={store} selected={selected === w.id} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function GridGuides({ rows }: { rows: number }) {
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < 4; c++)
      cells.push(
        <div key={`${r}-${c}`} style={{
          position: "absolute", left: c * (CELL + GAP), top: r * (ROW + GAP), width: CELL, height: ROW,
          borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)", opacity: 0.5,
        }} />
      );
  return <>{cells}</>;
}

function WidgetCard({ widget, store, selected, onSelect }: { widget: Widget; store: Store; selected: boolean; onSelect: (id: string) => void }) {
  const span = SPAN[widget.size];
  const w = span.w * CELL + (span.w - 1) * GAP;
  const h = span.h * ROW + (span.h - 1) * GAP;
  const left = widget.pos.col * (CELL + GAP);
  const top = widget.pos.row * (ROW + GAP);
  const cardRef = useRef<HTMLDivElement>(null);

  const { state, handlers } = usePointerDrag((dx, dy) => {
    const target = pxToCell(left + dx, top + dy, CELL, ROW, GAP);
    // clamp horizontally so the widget can't be dropped off-grid
    target.col = Math.max(0, Math.min(4 - span.w, target.col));
    if (target.col === widget.pos.col && target.row === widget.pos.row) return;
    if (!isValidPlacement(store.world.board.widgets, widget.id, target, widget.size)) return; // snap back
    store.apply([{ op: "move", layer: "board", path: `/widgets/#${widget.id}/pos`, value: target }], false, `move ${widget.type}`);
  });

  const Comp = REGISTRY[widget.type];
  const dragging = state.dragging;

  return (
    <div
      ref={cardRef}
      {...handlers}
      onClick={(e) => { e.stopPropagation(); onSelect(widget.id); }}
      style={{
        position: "absolute", left, top, width: w, height: h,
        transform: dragging ? `translate(${state.dx}px, ${state.dy}px)` : undefined,
        transition: dragging ? "none" : "left .18s var(--ease), top .18s var(--ease), width .18s var(--ease), height .18s var(--ease)",
        zIndex: dragging ? 50 : selected ? 5 : 1,
        background: "var(--bg-widget)", borderRadius: "var(--radius-lg)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        boxShadow: dragging ? "var(--shadow-lift)" : "var(--shadow)",
        outline: selected ? "2px solid var(--accent)" : "none", outlineOffset: 1,
        cursor: dragging ? "grabbing" : "grab", touchAction: "none",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border)" }}>
        <span className="t-title" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleFor(widget.type, widget.props)}</span>
        <span className="t-caption" style={{ color: "var(--fg-faint)" }}>{PRIMITIVE_META[widget.type].label} · {widget.size}</span>
      </div>
      <div style={{ padding: "var(--space-3)", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {Comp({ widget, world: store.world })}
      </div>
    </div>
  );
}
