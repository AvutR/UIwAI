/* ============================================================
   Bench — the two-layer spec, as types.
   Mirrors design/layout-spec.md. This is the contract every
   editor (drag, inspector, AI) writes against.
   ============================================================ */

/* ---------- shared ---------- */

export type WidgetSize = "sm" | "md" | "lg" | "xl";

export type PrimitiveType =
  | "Metric" | "OutputCard" | "Compare" | "Distribution" | "CaseTable"
  | "PromptRunner" | "PipelineStep" | "RunControl"
  | "Note" | "Group";

/** A binding is always a READ into the workflow. Never a write. */
export interface Binding {
  step: string;
  field: "output" | "score" | "params" | "meta" | "perCase";
}

/* ---------- Layer 1: workflow (semantics — what runs) ---------- */

export interface StepResult {
  output?: string;
  score?: number;
  perCase?: { input: string; output: string; score: number; model?: string; latencyMs?: number }[];
  meta?: { model: string; latencyMs?: number; tokens?: number; status: "ok" | "error" | "pending" };
}

export interface Run {
  id: string;
  startedAt: string;
  label?: string;
  results: Record<string, StepResult>;
}

export interface Step {
  id: string;
  role: string;
  model: string;
  params: Record<string, number | string>;
  prompt: string;
  inputs: string[];
}

export interface Workflow {
  version: 1;
  id: string;
  title: string;
  steps: Step[];
  runs: Run[];
}

/* ---------- Layer 2: board (presentation — what you see) ---------- */

export interface Widget {
  id: string;
  type: PrimitiveType;
  size: WidgetSize;
  pos: { col: number; row: number };
  props: Record<string, unknown>;
  bind?: Binding;
}

export interface Board {
  version: 1;
  id: string;
  workflowId: string;
  activeRun: string;
  grid: { cols: number };
  widgets: Widget[];
}

/* ---------- Patches — the only way anything changes ---------- */

export type Layer = "board" | "workflow";

export type Patch =
  | { op: "add"; layer: Layer; path: string; value: unknown }
  | { op: "remove"; layer: Layer; path: string }
  | { op: "move"; layer: "board"; path: string; value: { col: number; row: number } }
  | { op: "resize"; layer: "board"; path: string; value: WidgetSize }
  | { op: "set"; layer: Layer; path: string; value: unknown };

/** A proposed edit: patches plus a human-readable summary and (for workflow) impact. */
export interface EditProposal {
  patches: Patch[];
  summary: string;
  impact?: string;
  /** true when the proposal crosses into the workflow layer (consequential). */
  consequential: boolean;
}

/** Result of validating a patch set through the five gates. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; gate: string; reason: string };
