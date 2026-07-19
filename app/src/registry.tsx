import type { PrimitiveType } from "./types";
import type { PrimProps } from "./primitives/common";
import { Metric, OutputCard, Compare, Distribution, CaseTable } from "./primitives/data";
import { PromptRunner, PipelineStep, RunControl } from "./primitives/control";
import { Note, Group } from "./primitives/framing";

/* The registry: the ONLY place a primitive type resolves to a component.
   The renderer can draw nothing that isn't in this map — which is exactly
   why an AI editing the board can't produce an off-vocabulary interface. */

export const REGISTRY: Record<PrimitiveType, (p: PrimProps) => React.ReactNode> = {
  Metric,
  OutputCard,
  Compare,
  Distribution,
  CaseTable,
  PromptRunner,
  PipelineStep,
  RunControl,
  Note,
  Group,
};

/** A widget title for the card chrome: an explicit prop, else the primitive's name. */
export function titleFor(type: PrimitiveType, props: Record<string, unknown>): string {
  return (props.title as string) || (props.label as string) || defaultTitle[type];
}

const defaultTitle: Record<PrimitiveType, string> = {
  Metric: "Metric", OutputCard: "Output", Compare: "Compare", Distribution: "Distribution",
  CaseTable: "Cases", PromptRunner: "Prompt runner", PipelineStep: "Step", RunControl: "Run",
  Note: "Note", Group: "Group",
};
