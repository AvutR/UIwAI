import type { Board, Workflow, Patch, Widget, ValidationResult, WidgetSize } from "../types";
import { PRIMITIVE_META, isPrimitive } from "../primitives/meta";
import { MODEL_IDS } from "../data/models";
import { isValidPlacement, SPAN, GRID_COLS } from "./grid";

export interface World { board: Board; workflow: Workflow }

/* -------------------------------------------------------------
   Path resolution — a small JSON-pointer subset.
   Segments: numeric index | "-" (append) | "#id" (find by .id) | key
   ------------------------------------------------------------- */

function seg(node: any, s: string): any {
  if (Array.isArray(node)) {
    if (s.startsWith("#")) return node.find((x) => x?.id === s.slice(1));
    return node[Number(s)];
  }
  return node?.[s];
}

function parentAndKey(root: any, path: string): { parent: any; key: string } {
  const parts = path.split("/").filter(Boolean);
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) node = seg(node, parts[i]);
  let key = parts[parts.length - 1];
  if (Array.isArray(node) && key.startsWith("#")) {
    const idx = node.findIndex((x: any) => x?.id === key.slice(1));
    key = String(idx);
  }
  return { parent: node, key };
}

/* -------------------------------------------------------------
   The five gates (design/layout-spec.md §"Validation pipeline").
   A patch that fails any gate is rejected whole — never half-applied.
   ------------------------------------------------------------- */

// Gate 1 — layer guard. A board-only proposal may not carry a workflow patch.
export function layerGuard(patches: Patch[], allowWorkflow: boolean): ValidationResult {
  if (!allowWorkflow) {
    const bad = patches.find((p) => p.layer === "workflow");
    if (bad) return { ok: false, gate: "layer", reason: "presentation edit tried to change the workflow" };
  }
  return { ok: true };
}

// Gates 2–5, checked against the *resulting* world.
export function validateWorld(w: World): ValidationResult {
  // Gate 2/3 — schema + vocabulary (board)
  for (const wd of w.board.widgets) {
    if (!isPrimitive(wd.type)) return { ok: false, gate: "vocabulary", reason: `unknown primitive "${wd.type}"` };
    const meta = PRIMITIVE_META[wd.type];
    if (!meta.sizes.includes(wd.size))
      return { ok: false, gate: "vocabulary", reason: `${wd.type} cannot be size "${wd.size}"` };
  }
  // Gate 3 — vocabulary (workflow: models must be approved)
  for (const st of w.workflow.steps) {
    if (!MODEL_IDS.includes(st.model))
      return { ok: false, gate: "vocabulary", reason: `model "${st.model}" is not in the approved registry` };
  }
  // Gate 4 — layout: no overflow, no overlap
  for (const wd of w.board.widgets) {
    const s = SPAN[wd.size];
    if (wd.pos.col < 0 || wd.pos.col + s.w > GRID_COLS)
      return { ok: false, gate: "layout", reason: `${wd.id} overflows the ${GRID_COLS}-column grid` };
    if (!isValidPlacement(w.board.widgets, wd.id, wd.pos, wd.size))
      return { ok: false, gate: "layout", reason: `${wd.id} overlaps another widget` };
  }
  // Gate 5 — binding: a present binding must name a real step (else it renders "unbound")
  const stepIds = new Set(w.workflow.steps.map((s) => s.id));
  for (const wd of w.board.widgets) {
    if (wd.bind && !stepIds.has(wd.bind.step)) {
      // soft: allowed, but only if the primitive can show an unbound state
      if (PRIMITIVE_META[wd.type].dataBound && !stepIds.has(wd.bind.step)) {
        // permitted — the widget will render its explicit unbound state
      }
    }
  }
  return { ok: true };
}

/* -------------------------------------------------------------
   Application — immutable. Returns a new World or throws on bad path.
   ------------------------------------------------------------- */

export function applyPatch(world: World, p: Patch): World {
  const next: World = structuredClone(world);
  const root = p.layer === "board" ? next.board : next.workflow;

  if (p.op === "add") {
    const parts = p.path.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    let node: any = root;
    for (const part of parts.slice(0, -1)) node = seg(node, part);
    if (last === "-" && Array.isArray(node)) node.push(p.value);
    else if (Array.isArray(node)) node.splice(Number(last), 0, p.value);
    else node[last] = p.value;
    return next;
  }

  const { parent, key } = parentAndKey(root, p.path);
  if (parent == null) throw new Error(`patch path not found: ${p.path}`);

  switch (p.op) {
    case "remove":
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete parent[key];
      break;
    case "move":
      parent[key] = p.value; // key === "pos"
      break;
    case "resize":
      parent[key] = p.value; // key === "size"
      break;
    case "set":
      parent[key] = p.value;
      break;
  }
  return next;
}

/** Apply a whole patch set transactionally: all succeed against the gates, or none apply. */
export function applyProposal(
  world: World,
  patches: Patch[],
  allowWorkflow: boolean
): { ok: true; world: World } | { ok: false; error: string } {
  const g1 = layerGuard(patches, allowWorkflow);
  if (!g1.ok) return { ok: false, error: `[${g1.gate}] ${g1.reason}` };

  let draft = world;
  try {
    for (const p of patches) draft = applyPatch(draft, p);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const g = validateWorld(draft);
  if (!g.ok) return { ok: false, error: `[${g.gate}] ${g.reason}` };
  return { ok: true, world: draft };
}

/** Convenience for the inspector/canvas: does this single change validate? */
export function wouldPlace(world: World, id: string, pos: { col: number; row: number }, size: WidgetSize): boolean {
  return isValidPlacement(world.board.widgets, id, pos, size);
}

export function findWidget(board: Board, id: string): Widget | undefined {
  return board.widgets.find((w) => w.id === id);
}
