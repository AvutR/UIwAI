---
name: edit-workflow
description: Edit the semantic layer (workflow.json) of a Bench workspace — change params, models, prompts, or the step DAG in response to a natural-language request. Use for any request about what actually RUNS. Consequential; produces reviewable patches and never rewrites run history.
---

# Editing the workflow (Layer 1 — semantics)

You change what the workflow *does*: params, models, prompts, and the structure of the step DAG. This is the consequential layer — an edit here changes results. You are held to a higher bar than `edit-board`: every change is a reviewable patch with an explicit statement of what it will affect on the next run.

## What you may change

- **Params** — temperature, max_tokens, and other tunables on a step.
- **Model** — swap a step's model, but only to one in the approved registry (`app/src/data/models.ts`).
- **Prompt** — edit a step's prompt template.
- **Structure** — add, remove, rename, or rewire steps in the DAG.

## Hard rules

- **Runs are append-only.** Never edit or delete a past run's results. Re-execution creates a *new* run. A request to "fix the last run's numbers" is impossible by design — say so.
- **Renaming a step id is a breaking change.** If you rename `generate`, you must also emit the patches that update every board binding and every downstream `{{generate.output}}` reference. Never rename without the accompanying rewrites.
- **Models come from the registry.** If the user asks for a model that isn't approved, name the closest approved one and ask before substituting.
- **You may not touch `board.json`.** Layout is `edit-board`'s job. If the user's request also implies a view change ("swap to Opus and show me the diff"), do the workflow patch here and hand the view half to `edit-board`.
- **Patches, not regeneration.** Emit the minimal typed operations. Never rewrite the whole workflow.

## Procedure

1. **Read** `workflow.json`. Identify exactly which steps the request touches.
2. **Classify the blast radius.** Is this a param tweak (cheap, isolated) or a structural edit (rewires downstream steps and bindings)? State it.
3. **Emit patches** — minimal and typed. For structural edits, include every downstream fixup in the same set so the workflow is never left in a broken intermediate state.
4. **Validate** against the schema and vocabulary gates. Confirm the DAG is still acyclic and every `{{step.field}}` reference still resolves.
5. **Propose with an impact line.** Because this changes results, the summary must say what re-running will now do differently — e.g. "Critique now uses Opus at temp 0; re-run to get new scores." The researcher accepts, then re-runs deliberately. You never trigger the run yourself.

## Worked examples

**"Make the critique deterministic."**
```json
[
  { "op": "set", "layer": "workflow", "path": "/steps/1/params/temperature", "value": 0.0 }
]
```
_Impact: Critique becomes deterministic (temp 0). Re-run to regenerate scores._

**"Add a revise step that rewrites the summary using the critique."**
```json
[
  { "op": "add", "layer": "workflow", "path": "/steps/-",
    "value": { "id": "revise", "role": "revise", "model": "claude-sonnet-5",
      "params": { "temperature": 0.5 },
      "prompt": "Rewrite the summary to address this critique.\n\nSummary: {{generate.output}}\nCritique: {{critique.output}}",
      "inputs": ["generate", "critique"] } }
]
```
_Impact: Adds a third stage (generate → critique → revise). Existing steps unchanged; re-run to produce revised outputs. (A `PipelineStep` widget for it is a board edit — routing to `edit-board`.)_

**"Rename 'generate' to 'draft'."**
```json
[
  { "op": "set", "layer": "workflow", "path": "/steps/0/id", "value": "draft" },
  { "op": "set", "layer": "workflow", "path": "/steps/1/prompt",
    "value": "Rate this summary 0-10 for faithfulness. Return JSON {score, reason}.\n\n{{draft.output}}" },
  { "op": "set", "layer": "board", "path": "/widgets/0/bind/step", "value": "draft" }
]
```
_Impact: Structural rename. Updated the critique prompt reference and the one board binding that pointed at it. (This is the one case where a workflow edit must also patch the board — because a dangling binding would break the view. Flag it explicitly.)_

**"Delete last night's bad run."**
> Runs are append-only history — I can't rewrite or delete a past run. If it's misleading, I can pin the board's `activeRun` to a good run instead (that's an `edit-board` change), or you can start a fresh run.
