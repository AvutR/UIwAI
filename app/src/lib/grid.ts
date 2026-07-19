import type { WidgetSize, Widget } from "../types";

/* WidgetKit-style discrete sizing on a 4-column grid.
   These spans are the single source of truth for how big each size is. */
export const SPAN: Record<WidgetSize, { w: number; h: number }> = {
  sm: { w: 1, h: 1 },
  md: { w: 2, h: 1 },
  lg: { w: 2, h: 2 },
  xl: { w: 4, h: 2 },
};

export const GRID_COLS = 4;

/* Pixel dimensions — must match the tokens in index.css (--cell/--row/--gap). */
export const CELL = 168;
export const ROW = 132;
export const GAP = 24;

export interface Rect { col: number; row: number; w: number; h: number }

export function rectOf(w: Widget): Rect {
  const s = SPAN[w.size];
  return { col: w.pos.col, row: w.pos.row, w: s.w, h: s.h };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.col < b.col + b.w && a.col + a.w > b.col && a.row < b.row + b.h && a.row + a.h > b.row;
}

export function fitsHorizontally(col: number, size: WidgetSize): boolean {
  return col >= 0 && col + SPAN[size].w <= GRID_COLS;
}

/** True if a widget with `size` at `pos` collides with any other widget or overflows. */
export function isValidPlacement(
  widgets: Widget[],
  id: string,
  pos: { col: number; row: number },
  size: WidgetSize
): boolean {
  if (!fitsHorizontally(pos.col, size)) return false;
  if (pos.row < 0) return false;
  const me: Rect = { col: pos.col, row: pos.row, ...SPAN[size] };
  return !widgets.some((w) => w.id !== id && overlaps(me, rectOf(w)));
}

/** First free top-left slot for a widget of `size`, scanning row by row. */
export function firstFreeSlot(widgets: Widget[], size: WidgetSize): { col: number; row: number } {
  const maxRow = widgets.reduce((m, w) => Math.max(m, w.pos.row + SPAN[w.size].h), 0) + 2;
  for (let row = 0; row < maxRow; row++) {
    for (let col = 0; col + SPAN[size].w <= GRID_COLS; col++) {
      if (isValidPlacement(widgets, "__new__", { col, row }, size)) return { col, row };
    }
  }
  return { col: 0, row: maxRow };
}

/** Pixel position on the grid for a cell coordinate (used for absolute layout). */
export function cellToPx(col: number, row: number, cell: number, rowH: number, gap: number) {
  return { left: col * (cell + gap), top: row * (rowH + gap) };
}

/** Snap a pixel delta to the nearest grid cell coordinate. */
export function pxToCell(left: number, top: number, cell: number, rowH: number, gap: number) {
  return {
    col: Math.max(0, Math.round(left / (cell + gap))),
    row: Math.max(0, Math.round(top / (rowH + gap))),
  };
}
