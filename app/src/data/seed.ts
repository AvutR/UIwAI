import type { Workflow, Board } from "../types";

/* A realistic starting workspace: comparing summarization faithfulness
   across two models, with a critique step scoring each summary.
   Two runs exist so the RunControl / run-pinning is demonstrable. */

const summaryA =
  "The paper introduces a retrieval-augmented decoding method that conditions each token on documents fetched on the fly, cutting hallucination on long-form QA by 31% without retraining the base model.";
const summaryA2 =
  "A new decoding approach retrieves documents per-token and conditions generation on them, reducing hallucinations in long-form QA while leaving the base model frozen.";
const summaryB =
  "This work is about making language models better by using search. It fetches things and reduces mistakes a lot on question answering tasks and is good.";

const perCase = (base: number) =>
  Array.from({ length: 24 }, (_, i) => {
    const score = Math.max(0, Math.min(10, Math.round(base + Math.sin(i * 1.7) * 2.4 + (i % 5 === 0 ? -3 : 0))));
    return {
      input: `Abstract #${i + 1}`,
      output: i % 5 === 0 ? summaryB : i % 2 ? summaryA2 : summaryA,
      score,
      model: "claude-sonnet-5",
      latencyMs: 620 + (i % 7) * 40,
    };
  });

export const seedWorkflow: Workflow = {
  version: 1,
  id: "wf_summarize_eval",
  title: "Summarization faithfulness across models",
  steps: [
    {
      id: "draft",
      role: "generate",
      model: "claude-sonnet-5",
      params: { temperature: 0.7, max_tokens: 1024 },
      prompt: "Summarize the following abstract in two sentences:\n\n{{input}}",
      inputs: ["dataset:abstracts_v3"],
    },
    {
      id: "draft_baseline",
      role: "generate",
      model: "claude-haiku-4-5-20251001",
      params: { temperature: 0.7, max_tokens: 1024 },
      prompt: "Summarize the following abstract in two sentences:\n\n{{input}}",
      inputs: ["dataset:abstracts_v3"],
    },
    {
      id: "critique",
      role: "critique",
      model: "claude-opus-4-8",
      params: { temperature: 0.0 },
      prompt: "Rate this summary 0-10 for faithfulness to the abstract. Return JSON {score, reason}.\n\n{{draft.output}}",
      inputs: ["draft"],
    },
  ],
  runs: [
    {
      id: "run_2026_07_17a",
      startedAt: "2026-07-17T14:02:00Z",
      label: "Sonnet vs Haiku · v3",
      results: {
        draft: { output: summaryA, meta: { model: "claude-sonnet-5", latencyMs: 812, tokens: 240, status: "ok" } },
        draft_baseline: { output: summaryB, meta: { model: "claude-haiku-4-5-20251001", latencyMs: 410, tokens: 231, status: "ok" } },
        critique: {
          output: '{"score":7,"reason":"Faithful but adds a specific 31% figure not verifiable from the abstract alone."}',
          score: 7.4,
          perCase: perCase(7.4),
          meta: { model: "claude-opus-4-8", latencyMs: 990, status: "ok" },
        },
      },
    },
    {
      id: "run_2026_07_16b",
      startedAt: "2026-07-16T22:41:00Z",
      label: "baseline sweep",
      results: {
        draft: { output: summaryA2, meta: { model: "claude-sonnet-5", latencyMs: 780, tokens: 228, status: "ok" } },
        draft_baseline: { output: summaryB, meta: { model: "claude-haiku-4-5-20251001", latencyMs: 402, tokens: 219, status: "ok" } },
        critique: {
          output: '{"score":6,"reason":"Slightly generic."}',
          score: 6.1,
          perCase: perCase(6.1),
          meta: { model: "claude-opus-4-8", latencyMs: 1010, status: "ok" },
        },
      },
    },
  ],
};

export const seedBoard: Board = {
  version: 1,
  id: "board_default",
  workflowId: "wf_summarize_eval",
  activeRun: "run_2026_07_17a",
  grid: { cols: 4 },
  widgets: [
    {
      id: "w_run",
      type: "PromptRunner",
      size: "lg",
      pos: { col: 0, row: 0 },
      props: { models: ["claude-sonnet-5", "claude-haiku-4-5-20251001"], showParams: true },
      bind: { step: "draft", field: "params" },
    },
    {
      id: "w_score",
      type: "Metric",
      size: "sm",
      pos: { col: 2, row: 0 },
      props: { label: "Faithfulness", format: "float2", trend: "up-good" },
      bind: { step: "critique", field: "score" },
    },
    {
      id: "w_note",
      type: "Note",
      size: "sm",
      pos: { col: 3, row: 0 },
      props: { body: "**Hypothesis:** Sonnet stays more faithful than Haiku on dense abstracts.", tone: "hypothesis" },
    },
    {
      id: "w_compare",
      type: "Compare",
      size: "lg",
      pos: { col: 0, row: 2 },
      props: {
        mode: "side-by-side",
        highlight: "divergence",
        sources: [
          { step: "draft", field: "output" },
          { step: "draft_baseline", field: "output" },
        ],
      },
    },
    {
      id: "w_dist",
      type: "Distribution",
      size: "md",
      pos: { col: 2, row: 1 },
      props: { metric: "faithfulness", bins: 11, mark: "bar" },
      bind: { step: "critique", field: "perCase" },
    },
  ],
};
