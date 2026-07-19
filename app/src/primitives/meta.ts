import type { PrimitiveType, WidgetSize, Widget } from "../types";

/* The machine-readable half of design/primitives.md.
   The validator, the add-widget palette, and the AI interpreter all
   read this — one source of truth for the closed vocabulary. */

export interface PrimitiveMeta {
  label: string;
  blurb: string;
  kind: "data" | "control" | "framing";
  /** the ONLY sizes this primitive may take */
  sizes: WidgetSize[];
  defaultSize: WidgetSize;
  /** must a binding be present for this to show data? (framing = never) */
  dataBound: boolean;
  /** props applied when the widget is first created */
  defaultProps: Record<string, unknown>;
}

export const PRIMITIVE_META: Record<PrimitiveType, PrimitiveMeta> = {
  Metric: {
    label: "Metric", blurb: "One number with a label", kind: "data",
    sizes: ["sm", "md"], defaultSize: "sm", dataBound: true,
    defaultProps: { label: "Metric", format: "float2", trend: "none" },
  },
  OutputCard: {
    label: "Output", blurb: "One model output, rendered", kind: "data",
    sizes: ["md", "lg"], defaultSize: "md", dataBound: true,
    defaultProps: { wrap: "pretty", showTokens: false },
  },
  Compare: {
    label: "Compare", blurb: "2–4 outputs side by side", kind: "data",
    sizes: ["lg", "xl"], defaultSize: "lg", dataBound: false,
    defaultProps: { mode: "side-by-side", highlight: "divergence", sources: [] },
  },
  Distribution: {
    label: "Distribution", blurb: "Histogram of a metric across cases", kind: "data",
    sizes: ["md", "lg"], defaultSize: "md", dataBound: true,
    defaultProps: { metric: "score", bins: 11, mark: "bar" },
  },
  CaseTable: {
    label: "Case table", blurb: "Per-case rows, sortable & filterable", kind: "data",
    sizes: ["lg", "xl"], defaultSize: "lg", dataBound: true,
    defaultProps: { columns: ["input", "output", "score"], sortBy: "score", filter: "all" },
  },
  PromptRunner: {
    label: "Prompt runner", blurb: "Prompt + model + run", kind: "control",
    sizes: ["md", "lg"], defaultSize: "md", dataBound: true,
    defaultProps: { models: ["claude-sonnet-5"], showParams: true },
  },
  PipelineStep: {
    label: "Pipeline step", blurb: "One node in a chain", kind: "control",
    sizes: ["sm", "md"], defaultSize: "md", dataBound: true,
    defaultProps: { role: "step", showStatus: true },
  },
  RunControl: {
    label: "Run control", blurb: "Run / re-run / pin a run", kind: "control",
    sizes: ["sm", "md"], defaultSize: "sm", dataBound: false,
    defaultProps: { scope: "board" },
  },
  Note: {
    label: "Note", blurb: "A markdown sticky", kind: "framing",
    sizes: ["sm", "md", "lg"], defaultSize: "sm", dataBound: false,
    defaultProps: { body: "New note", tone: "plain" },
  },
  Group: {
    label: "Group", blurb: "A titled region", kind: "framing",
    sizes: ["md", "lg", "xl"], defaultSize: "lg", dataBound: false,
    defaultProps: { title: "Group", collapsed: false },
  },
};

export const ALL_PRIMITIVES = Object.keys(PRIMITIVE_META) as PrimitiveType[];

export function isPrimitive(t: string): t is PrimitiveType {
  return t in PRIMITIVE_META;
}

/** Build a fresh widget of a given type with sane defaults. */
export function makeWidget(type: PrimitiveType, id: string, pos: { col: number; row: number }): Widget {
  const meta = PRIMITIVE_META[type];
  return {
    id,
    type,
    size: meta.defaultSize,
    pos,
    props: structuredClone(meta.defaultProps),
  };
}
