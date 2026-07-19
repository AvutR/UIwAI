# The primitive library

This is the closed vocabulary. Every interface Bench can render — by hand or by AI — is a composition of these and nothing else. Adding a primitive is a deliberate, human, reviewed act. Runtime invention is forbidden (see `principles.md` §2).

Each primitive below specifies: what it's for, the sizes it supports, the props it takes, and what it binds to. Props are the *only* surface an AI or the inspector may tune. Bindings are how a widget reaches into Layer 1 (workflow) to read — never write — data.

A binding is always a read: `{ step: "<id>", field: "output" | "score" | "params" | "meta" }`. A widget with an invalid binding renders an explicit "unbound" state, never a crash and never a silent blank.

---

## Data-bound primitives

These render results from the workflow. They must show provenance.

### `Metric`
A single number with a label. The `sm` hero primitive.
- **Sizes:** `sm`, `md`
- **Props:** `label: string`, `format: "int" | "float2" | "pct" | "ms"`, `trend?: "up-good" | "up-bad" | "none"`
- **Binds:** one scalar field (e.g. a step's `score`, a latency in `meta`)
- **Provenance:** footer shows `step · model · run`

### `OutputCard`
Renders one model output — text, with markdown and code awareness.
- **Sizes:** `md`, `lg`
- **Props:** `wrap: "pretty" | "raw"`, `showTokens: boolean`
- **Binds:** a step's `output`
- **Provenance:** header shows `step · model`

### `Compare`
Two or more outputs side by side, with agreement/divergence signaling. The workhorse for "which model/prompt/config is better."
- **Sizes:** `lg`, `xl`
- **Props:** `mode: "side-by-side" | "diff"`, `sources: binding[]` (2–4), `highlight: "divergence" | "none"`
- **Binds:** 2–4 step `output` fields
- **Provenance:** each column labeled with its `step · model · params-hash`

### `Distribution`
A small histogram / strip plot of a metric across a run's cases. Answers "where does this fail," not just "what's the average."
- **Sizes:** `md`, `lg`
- **Props:** `metric: string`, `bins: number (5–20)`, `mark: "bar" | "strip"`
- **Binds:** a step's per-case `score` array
- **Provenance:** footer shows `step · n cases`

### `CaseTable`
A scrollable table of per-case rows (input, output, score), sortable and filterable. Where you land after a `Distribution` tells you something's wrong.
- **Sizes:** `lg`, `xl`
- **Props:** `columns: ("input"|"output"|"score"|"model"|"latency")[]`, `sortBy: string`, `filter?: "failures" | "all"`
- **Binds:** a step's per-case results
- **Provenance:** per-row `model` column available

---

## Control primitives

These *configure and trigger* the workflow. They are the only primitives that cause Layer 1 to run — and even they don't edit its structure; they set params and press go.

### `PromptRunner`
An editable prompt + model picker + run button. The entry point of most workflows.
- **Sizes:** `md`, `lg`
- **Props:** `models: string[]` (from the approved model registry), `showParams: boolean`
- **Binds:** a step's `params` (read to display current values; run action writes a new *run*, not a new structure)

### `PipelineStep`
A single node in a multi-step chain (e.g. generate → critique → revise), showing its role, model, and status. Chain several to see a workflow's shape.
- **Sizes:** `sm`, `md`
- **Props:** `role: string`, `showStatus: boolean`
- **Binds:** one step's `meta` (status, model, timing)

### `RunControl`
Run / re-run / cancel for the whole board's bound workflow, with a run selector to pin the board to a historical run.
- **Sizes:** `sm`, `md`
- **Props:** `scope: "board" | "step"`
- **Binds:** the active run pointer

---

## Framing primitives

Pure presentation. Bind to nothing. Structure a board for a human reader.

### `Note`
A markdown sticky — hypothesis, caption, TODO. How a researcher narrates their own board.
- **Sizes:** `sm`, `md`, `lg`
- **Props:** `body: markdown`, `tone: "plain" | "hypothesis" | "warning"`

### `Group`
A titled region that visually clusters widgets ("Baseline", "Candidate", "Failures").
- **Sizes:** `md`, `lg`, `xl`
- **Props:** `title: string`, `collapsed: boolean`

---

## Composition rules

Enforced by the schema and by both editing skills:

1. **Every data-bound widget must resolve its binding** to a real step, or render the explicit unbound state.
2. **Size must be one the primitive declares.** A `Metric` cannot be `xl`.
3. **`Compare.sources` holds 2–4 bindings.** Not 1, not 7.
4. **Control primitives are the only ones that can trigger a run.** Framing and data-bound primitives are inert.
5. **No primitive may exceed the 4-column grid width.** `xl` (4 wide) is the ceiling.
6. **Provenance is non-optional** on data-bound primitives — it cannot be turned off by a prop.

---

## How to add a primitive (the deliberate act)

When a real workflow can't be expressed by composition, add one — don't improvise:

1. Name it and write its spec block here (sizes, props, binds, provenance).
2. Confirm it can't be built by composing existing primitives.
3. Implement it in `app/src/primitives/` against the token system only.
4. Register it in the registry so the editing skills can see it.

Steps 1–2 are the important ones. Most "we need a new primitive" turns out to be "we need to compose two we already have."
