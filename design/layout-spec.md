# The two-layer spec

The entire state of a Bench workspace is two JSON files. This document is the contract every editor — human or AI — writes against. If a proposed edit doesn't validate here, it is rejected before it touches the screen.

- **`workflow.json`** — Layer 1, semantics. What runs.
- **`board.json`** — Layer 2, presentation. What you see.

The board references the workflow by id. The workflow never references the board. That asymmetry is the whole safety model (`principles.md` §3).

---

## Layer 1 — `workflow.json`

A workflow is a DAG of steps plus the runs produced by executing it.

```json
{
  "version": 1,
  "id": "wf_summarize_eval",
  "title": "Summarization quality across models",
  "steps": [
    {
      "id": "generate",
      "role": "generate",
      "model": "claude-sonnet-5",
      "params": { "temperature": 0.7, "max_tokens": 1024 },
      "prompt": "Summarize the following abstract in two sentences:\n\n{{input}}",
      "inputs": ["dataset:abstracts_v3"]
    },
    {
      "id": "critique",
      "role": "critique",
      "model": "claude-opus-4-8",
      "params": { "temperature": 0.0 },
      "prompt": "Rate this summary 0-10 for faithfulness. Return JSON {score, reason}.\n\n{{generate.output}}",
      "inputs": ["generate"]
    }
  ],
  "runs": [
    {
      "id": "run_2026_07_17a",
      "startedAt": "2026-07-17T14:02:00Z",
      "results": {
        "generate": { "output": "...", "meta": { "model": "claude-sonnet-5", "latencyMs": 812, "tokens": 240, "status": "ok" } },
        "critique": { "output": "{\"score\":7,...}", "score": 7, "perCase": [ { "input": "...", "output": "...", "score": 7 } ], "meta": { "status": "ok" } }
      }
    }
  ]
}
```

**Key facts an editor must respect:**

- `steps[].id` is stable and referenced by bindings. Renaming an id is a breaking edit that must rewrite every binding that points at it (the `edit-workflow` skill handles this; the `edit-board` skill may never cause it).
- `model` must be in the approved model registry (`app/src/data/models.ts`).
- `runs` are append-only history. An edit never rewrites a past run — re-running produces a *new* run.
- `params` are the tunable surface. Structure (steps, wiring, prompts) is the semantic surface.

## Layer 2 — `board.json`

A board is a placed set of widget instances on the 4-column grid.

```json
{
  "version": 1,
  "id": "board_default",
  "workflowId": "wf_summarize_eval",
  "activeRun": "run_2026_07_17a",
  "grid": { "cols": 4 },
  "widgets": [
    {
      "id": "w1",
      "type": "PromptRunner",
      "size": "lg",
      "pos": { "col": 0, "row": 0 },
      "props": { "models": ["claude-sonnet-5", "claude-opus-4-8"], "showParams": true },
      "bind": { "step": "generate", "field": "params" }
    },
    {
      "id": "w2",
      "type": "Metric",
      "size": "sm",
      "pos": { "col": 2, "row": 0 },
      "props": { "label": "Faithfulness", "format": "float2", "trend": "up-good" },
      "bind": { "step": "critique", "field": "score" }
    },
    {
      "id": "w3",
      "type": "Compare",
      "size": "lg",
      "pos": { "col": 0, "row": 2 },
      "props": {
        "mode": "side-by-side",
        "highlight": "divergence",
        "sources": [
          { "step": "generate", "field": "output" },
          { "step": "generate_baseline", "field": "output" }
        ]
      }
    },
    {
      "id": "w4",
      "type": "Note",
      "size": "md",
      "pos": { "col": 2, "row": 1 },
      "props": { "body": "**Hypothesis:** Opus critique is stricter than Sonnet.", "tone": "hypothesis" }
    }
  ]
}
```

**Key facts an editor must respect:**

- `type` must be a registered primitive. `size` must be one that primitive declares.
- `pos` + `size` must not overflow the 4-column grid and must not overlap another widget.
- `bind.step` must resolve to a real step in the referenced workflow, or the widget renders its unbound state.
- A board edit **may not** add, remove, rename, or rewire steps, change a model, or alter params. Those are Layer 1. The schema loader rejects a board patch that carries workflow keys.

---

## Edits are patches

No editor rewrites a whole file. Every change is a patch — a small, typed, reversible operation. This is what makes AI edits previewable and human edits undoable through one mechanism.

```json
{ "op": "add",    "layer": "board", "path": "/widgets/-", "value": { /* widget */ } }
{ "op": "move",   "layer": "board", "path": "/widgets/2/pos", "value": { "col": 2, "row": 0 } }
{ "op": "resize", "layer": "board", "path": "/widgets/2/size", "value": "lg" }
{ "op": "set",    "layer": "board", "path": "/widgets/1/props/label", "value": "Faithfulness ↑" }
{ "op": "remove", "layer": "board", "path": "/widgets/3" }
{ "op": "set",    "layer": "workflow", "path": "/steps/0/params/temperature", "value": 0.2 }
```

**Validation pipeline every patch passes through before applying:**

1. **Layer guard** — a `board` patch may only touch `board.json`; a `workflow` patch only `workflow.json`. Cross-layer writes are rejected here. *(This is where "presentation can't corrupt semantics" is actually enforced.)*
2. **Schema check** — result must validate against the layer schema above.
3. **Vocabulary check** — types, sizes, tokens, models all drawn from the approved sets.
4. **Layout check** — no grid overflow, no overlap (board patches only).
5. **Binding check** — every binding resolves, or is explicitly the unbound state.

A patch that fails any gate is returned to its author (human via a UI error, AI via a rejection it can retry against) — never partially applied.

---

## Why patches, not regeneration

An AI *could* regenerate the whole `board.json` each turn. It must not. Patches give three things regeneration can't:

- **Reviewable diffs** — you approve "add a Distribution and move the table down," not an opaque new file.
- **Reversibility** — one patch, one undo entry.
- **Stability** — widgets you didn't mention keep their exact position and identity. The model can't "helpfully" reflow your whole board because you asked for one metric.

The two editing skills (`skills/edit-board`, `skills/edit-workflow`) are the operational instructions an AI follows to produce valid patches against this contract.
