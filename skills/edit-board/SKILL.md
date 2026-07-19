---
name: edit-board
description: Edit the presentation layer (board.json) of a Bench workspace in response to a natural-language request — add, move, resize, restyle, or remove widgets. Use for any request about what the researcher SEES or how it's arranged. Never touches what runs.
---

# Editing the board (Layer 2 — presentation)

You turn a researcher's plain-language request about their view into a set of validated patches against `board.json`. You operate on presentation only. You cannot — and must never attempt to — change models, params, prompts, or workflow structure. Those requests belong to `edit-workflow`; hand them off rather than reaching across the boundary.

## What you may change

- **Add** a widget (from the primitive library only).
- **Move / resize** widgets on the 4-column grid.
- **Restyle** via props and tokens (labels, tone, mode, format, columns…).
- **Remove** a widget.
- **Rebind** a widget to a *different existing step* (reading only).

## What you may never do

- Add, remove, rename, or rewire a workflow step.
- Change a `model`, `prompt`, or `params` value.
- Emit raw CSS/HTML, arbitrary pixel sizes, hex colors, or a widget `type` not in the registry.
- Rewrite the whole file. You emit patches (`add`/`move`/`resize`/`set`/`remove`), never a regenerated board.

If a request needs any of the above, say so plainly and route it to `edit-workflow`. Do not silently do a partial version.

## Procedure

1. **Read** the current `board.json` and the referenced `workflow.json` (read-only, to know which steps and fields exist).
2. **Interpret** the request into concrete intent. Resolve vague language against the design principles: "cleaner" → fewer widgets / grouping; "see failures first" → a `CaseTable` with `filter: "failures"` placed top-left; "compare them" → a `Compare` bound to the relevant step outputs.
3. **Choose primitives** that already express the intent by composition. Never invent one. If nothing fits, say what primitive would be needed and stop.
4. **Emit patches** — the minimal set. Widgets the user didn't mention keep their exact `id`, `pos`, and `size`. Do not reflow the board to be "tidy" unless asked.
5. **Self-validate** against the five gates in `layout-spec.md` (layer / schema / vocabulary / layout / binding) *before* proposing. If a patch would overflow the grid, produce the `move`s that make room as part of the same set.
6. **Propose, don't apply.** Return the patch set with a one-line human summary ("Add a failures table top-left, shift the comparison down one row"). The researcher accepts or rejects.

## Placement heuristics

- Reading order is top-left → down. Put what the request emphasizes first there.
- Keep a `Compare` and its supporting `Distribution`/`CaseTable` vertically adjacent — they're read together.
- Prefer resizing an existing widget over adding a duplicate.
- Respect `Group` regions: a widget dropped "into Baseline" gets a `pos` inside that group's span.

## Worked examples

**"Show me where the summaries are failing, up top."**
```json
[
  { "op": "add", "layer": "board", "path": "/widgets/-",
    "value": { "id": "w_fail", "type": "CaseTable", "size": "lg", "pos": { "col": 0, "row": 0 },
      "props": { "columns": ["input","output","score"], "sortBy": "score", "filter": "failures" },
      "bind": { "step": "critique", "field": "perCase" } } },
  { "op": "move", "layer": "board", "path": "/widgets/0/pos", "value": { "col": 0, "row": 2 } }
]
```
_Summary: Add a failures-only case table at the top; push the prompt runner down._

**"This is too busy — just the score and the comparison."**
```json
[
  { "op": "remove", "layer": "board", "path": "/widgets/3" },
  { "op": "remove", "layer": "board", "path": "/widgets/4" }
]
```
_Summary: Remove the note and distribution, leaving the metric and comparison._

**"Make the faithfulness number bigger and label it clearly."**
```json
[
  { "op": "resize", "layer": "board", "path": "/widgets/1/size", "value": "md" },
  { "op": "set", "layer": "board", "path": "/widgets/1/props/label", "value": "Faithfulness (0–10)" }
]
```

**"Bump the temperature to 0.2."**
> Out of scope for the board. This changes what runs. Routing to `edit-workflow`.
