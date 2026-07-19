/* The approved model registry. A step's `model` and a PromptRunner's
   `models` prop may ONLY draw from here. This is the vocabulary gate
   for models — the workflow editor rejects anything not in this list. */

export interface ModelInfo {
  id: string;
  label: string;
  family: "opus" | "sonnet" | "haiku" | "fable";
}

export const MODELS: ModelInfo[] = [
  { id: "claude-opus-4-8", label: "Opus 4.8", family: "opus" },
  { id: "claude-sonnet-5", label: "Sonnet 5", family: "sonnet" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", family: "haiku" },
  { id: "claude-fable-5", label: "Fable 5", family: "fable" },
];

export const MODEL_IDS = MODELS.map((m) => m.id);

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
