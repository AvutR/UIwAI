# Design principles

These are the rules the interface — and any AI editing it — must obey. They exist so that a generated interface is indistinguishable from a hand-crafted one. Treat them as constraints, not suggestions.

---

## 1. The interface is data, not code

The screen is a pure function of two specs (`workflow.json`, `board.json`). There is no imperative UI state that lives outside those files. If you can't express a change as an edit to the spec, it isn't a legal change.

**Consequence:** every state is nameable, serializable, diffable, and shareable as a file. "Send me your board" is a real sentence.

## 2. A fixed vocabulary, composed — never invented

New capability comes from *composing* primitives, never from an AI writing a novel widget. The primitive set (`primitives.md`) is closed. If a workflow needs something the vocabulary can't express, that's a signal to design a new primitive deliberately — a human act, added to the library, reviewed once — not to let the model improvise one at runtime.

**Why:** improvised UI is where consistency, accessibility, and safety go to die. A closed vocabulary is what makes generation trustworthy.

## 3. Separation of layers is absolute

Presentation (board) may *read* semantics (workflow). It may never *write* them. A widget renders a step; it cannot alter what the step does. This is enforced by schema and by the two distinct skills — never relaxed "just this once."

## 4. Legibility over cleverness

A researcher should be able to look at any widget and know what it's showing and where the number came from. Every data-bound widget shows its **provenance** — which step, which run, which model produced this. No orphan numbers. A metric with no traceable source is a bug, not a feature.

## 5. Every change is previewable and reversible

AI edits arrive as a proposed patch with a visible before/after, not an applied fact. Human edits push onto an undo stack. There is no destructive, un-inspectable mutation of a researcher's workspace anywhere in the system.

## 6. Calm by default

This is an instrument for thinking, not a thing competing for attention. No motion that isn't communicating a state change. No color that isn't carrying meaning. The interface recedes; the work is the figure.

---

## Token system

All visual values come from tokens. Primitives never hard-code a color, space, or radius. This is what lets an AI restyle safely: it can only pick from the scale, so it can't produce an off-system result.

### Spacing — 4px base scale

| Token | px | Use |
|---|---|---|
| `space-1` | 4 | icon gaps, tight inline |
| `space-2` | 8 | intra-widget padding |
| `space-3` | 12 | control spacing |
| `space-4` | 16 | widget padding (default) |
| `space-5` | 24 | between widgets on the board |
| `space-6` | 32 | section separation |

Only these. No `13px`, no `1.25rem` one-offs.

### Widget sizing — WidgetKit model

Widgets occupy discrete grid cells. Never arbitrary pixel dimensions.

| Size | Grid (col × row) | For |
|---|---|---|
| `sm` | 1 × 1 | a single number, a toggle, a status |
| `md` | 2 × 1 | one output, a short list, a control panel |
| `lg` | 2 × 2 | a comparison, a distribution, a transcript |
| `xl` | 4 × 2 | a full pipeline view, a wide table |

Grid is 4 columns wide. Resizing = snapping between these, never free drag.

### Radius

| Token | px | Use |
|---|---|---|
| `radius-sm` | 6 | inputs, chips |
| `radius-md` | 10 | controls, inner cards |
| `radius-lg` | 16 | widget cards |

### Type scale

| Token | px / weight | Use |
|---|---|---|
| `text-mono` | 12 / 400 mono | values, code, model output |
| `text-caption` | 12 / 500 | labels, provenance |
| `text-body` | 14 / 400 | body |
| `text-title` | 15 / 600 | widget titles |
| `text-display` | 28 / 600 | the one big number in an `sm` metric |

System font stack (`-apple-system, ...`) — reinforces the WidgetKit lineage and costs zero load.

### Color — semantic, dual-theme

Named by *role*, never by hue. Every token resolves in both light and dark. A primitive asking for `--fg-muted` gets the right value in either theme automatically.

| Token | Role |
|---|---|
| `--bg-canvas` | the board background |
| `--bg-widget` | a widget card surface |
| `--bg-inset` | a well inside a widget (output, code) |
| `--fg-default` | primary text |
| `--fg-muted` | labels, secondary |
| `--fg-faint` | provenance, disabled |
| `--border` | hairlines |
| `--accent` | the single interactive/brand color |
| `--ok` / `--warn` / `--bad` | eval status semantics |

Exactly **one** accent. Status colors carry meaning and appear nowhere decorative.

---

## The rule that governs AI edits

> An AI may only produce a spec that validates against the schema and uses only the tokens and primitives defined here. It may not emit raw CSS, raw HTML, arbitrary dimensions, novel colors, or novel widget types.

Everything the AI can do is a legal move in this system. There are no illegal states it can reach. That is the entire safety model, and it is why generation here is trustworthy where free-form UI generation is not.
