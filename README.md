# Bench

*An AI-native research interface where the interface itself is malleable.*

> **Name is a placeholder.** Rename freely — it appears only in docs and the app title.

---

## The problem

Researchers running model workflows live in two bad options.

**Notebooks** are infinitely flexible and structurally illegible. Every run is a snowflake. The pipeline exists only in the author's head and in cell execution order. Nothing is comparable, and nothing survives contact with a second person.

**Dashboards and eval platforms** are legible and rigid. Someone decided months ago which five charts you get. The moment your question is slightly different from the one the tool was designed for, you're back in a notebook.

The gap is a tool that is *both* structured and reshapeable — where changing your view is as cheap as a sentence, but the structure never rots.

## The thesis

**Make the interface a spec, not code — then let both humans and AI edit that spec, constrained by a fixed vocabulary of primitives.**

Three claims follow from this, and the whole prototype exists to demonstrate them:

**1. A fixed vocabulary beats infinite freedom.**
Letting an AI write arbitrary UI code produces drift, inconsistency, and breakage — a different-looking table every time you ask. Give it a small, approved set of primitives and composition rules, and every generated interface is consistent *by construction*. The design system stops being a style guide and becomes a type system.

**2. Semantics and presentation must be separate layers.**
This is the load-bearing idea. See below.

**3. Every AI edit is a reviewable, reversible diff.**
Because the interface is data, an AI edit is a patch — previewable before it applies, revertable after. No silent mutation of a researcher's workspace.

## The load-bearing idea: two layers

Most workflow tools make the canvas *be* the graph. Nodes and edges, where visual arrangement and execution semantics are the same object. That conflation is why those tools are terrifying to reorganize — moving a box might mean something.

Bench splits it:

| | **Layer 1 — Workflow** | **Layer 2 — Board** |
|---|---|---|
| **Describes** | What runs | What you see |
| **Contains** | Steps, models, params, wiring | Widgets, positions, sizes, bindings |
| **File** | `workflow.json` | `board.json` |
| **Editing it** | Changes results | Changes nothing but your view |
| **Cost of a mistake** | Re-run | Ctrl-Z |

The board *binds into* the workflow — a widget points at a step and renders it — but the arrow only goes one way. A board cannot mutate a workflow. This is enforced at the schema level, not by convention.

**Why this matters:** it makes a whole class of AI request safe by construction. "Reorganize this so I can see the failures first" is a Layer 2 edit. It is *structurally incapable* of changing what your experiment computed. You never have to read the diff wondering whether the AI touched your temperature setting — it couldn't have.

That's a governance property delivered by architecture rather than by policy, review, or trust.

## Three ways to edit, one source of truth

Every edit path writes the same specs. None is privileged.

- **Language** — "add a score distribution next to the comparison" → an AI proposes a patch → you accept or reject.
- **Drag-and-drop** — move and resize widgets on the grid, Apple WidgetKit-style.
- **Inspector** — fine-tune the selected widget's bindings and params by hand.

The consequence worth stating out loud: because they share one representation, **the AI can't do anything you can't do by hand, and you can't do anything the AI can't read.** No black box, no capability gap in either direction.

## What's here

```
design/
  principles.md    Design principles + the token system
  primitives.md    The fixed primitive library — the vocabulary AI composes from
  layout-spec.md   The two-layer schema (workflow.json + board.json)
skills/
  edit-board/      Skill: how an AI edits Layer 2 (presentation)
  edit-workflow/   Skill: how an AI edits Layer 1 (semantics)
app/               The prototype (Vite + React + TS) — pending Node install
```

Read `design/layout-spec.md` first if you want the architecture. Read `design/principles.md` first if you want the philosophy.

## Status

Design layer complete. Application pending a local Node install.
