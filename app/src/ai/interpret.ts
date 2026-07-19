import type { EditProposal, Patch, PrimitiveType, Widget } from "../types";
import type { World } from "../lib/patch";
import { firstFreeSlot } from "../lib/grid";
import { makeWidget, PRIMITIVE_META } from "../primitives/meta";

/* ============================================================
   The AI edit seam.

   In production this function is a MODEL CALL: the request, the current
   world, design/principles.md, design/primitives.md, and the relevant
   editing skill (skills/edit-board or skills/edit-workflow) go in; a
   validated EditProposal (patches + summary, using ONLY the vocabulary)
   comes out, and runs through the same five gates in lib/patch.ts.

   What's below is a DETERMINISTIC stand-in for that call so the prototype
   runs offline with no API key. It recognises a curated set of intents
   and emits real patches. The contract — request -> EditProposal — is
   identical to the model version, so swapping it in is a one-function change.
   ============================================================ */

let counter = 0;
const uid = (t: string) => `w_${t}_${(++counter).toString(36)}${Date.now().toString(36).slice(-3)}`;

function has(s: string, ...words: string[]) {
  return words.some((w) => s.includes(w));
}

function widgetsOfType(world: World, t: PrimitiveType): Widget[] {
  return world.board.widgets.filter((w) => w.type === t);
}

function proposeAdd(world: World, type: PrimitiveType, patch: Partial<Widget>, summary: string, top = false): EditProposal {
  const size = patch.size ?? PRIMITIVE_META[type].defaultSize;
  const slot = top ? { col: 0, row: 0 } : firstFreeSlot(world.board.widgets, size);
  const widget: Widget = { ...makeWidget(type, uid(type), slot), size, ...patch, pos: slot };
  const patches: Patch[] = [{ op: "add", layer: "board", path: "/widgets/-", value: widget }];
  // if placing at top, nudge everything currently in row 0-1 down by 2 rows
  if (top) {
    for (const w of world.board.widgets) {
      patches.push({ op: "move", layer: "board", path: `/widgets/#${w.id}/pos`, value: { col: w.pos.col, row: w.pos.row + 2 } });
    }
  }
  return { patches, summary, consequential: false };
}

export function interpret(request: string, world: World): EditProposal | { error: string } {
  const s = request.toLowerCase().trim();
  if (!s) return { error: "Say what you'd like to change." };

  /* ---------- Layer 1 (workflow — consequential) ---------- */

  // "make the critique deterministic" / "set temperature to 0.2"
  const tempMatch = s.match(/temp(?:erature)?\s*(?:to|=|of)?\s*(\d?\.?\d+)/);
  if (has(s, "deterministic") || tempMatch) {
    const target = has(s, "critique") ? "critique" : has(s, "draft", "generate") ? "draft" : "critique";
    const idx = world.workflow.steps.findIndex((st) => st.id === target);
    if (idx < 0) return { error: `No step called "${target}".` };
    const value = has(s, "deterministic") ? 0 : Number(tempMatch![1]);
    return {
      patches: [{ op: "set", layer: "workflow", path: `/steps/${idx}/params/temperature`, value }],
      summary: `Set ${target} temperature to ${value}`,
      impact: `${target} will produce ${value === 0 ? "deterministic" : "different"} output — re-run to regenerate results.`,
      consequential: true,
    };
  }

  // "use opus for the critique"
  const modelWord = s.match(/\b(opus|sonnet|haiku|fable)\b/);
  if (has(s, "use", "switch", "swap") && modelWord) {
    const map: Record<string, string> = {
      opus: "claude-opus-4-8", sonnet: "claude-sonnet-5",
      haiku: "claude-haiku-4-5-20251001", fable: "claude-fable-5",
    };
    const target = has(s, "critique") ? "critique" : has(s, "baseline") ? "draft_baseline" : "draft";
    const idx = world.workflow.steps.findIndex((st) => st.id === target);
    if (idx < 0) return { error: `No step called "${target}".` };
    return {
      patches: [{ op: "set", layer: "workflow", path: `/steps/${idx}/model`, value: map[modelWord[1]] }],
      summary: `Switch ${target} to ${modelWord[1]}`,
      impact: `${target} now runs on ${modelWord[1]} — re-run to see new output.`,
      consequential: true,
    };
  }

  /* ---------- Layer 2 (board — presentation) ---------- */

  // remove / declutter
  if (has(s, "too busy", "declutter", "simplify", "clean")) {
    const removable = world.board.widgets.filter((w) => PRIMITIVE_META[w.type].kind === "framing");
    if (!removable.length) return { error: "Nothing obviously removable — tell me which widgets to drop." };
    return {
      patches: removable.map((w) => ({ op: "remove", layer: "board", path: `/widgets/#${w.id}` })),
      summary: `Remove ${removable.length} framing widget${removable.length > 1 ? "s" : ""} (notes/groups) to declutter`,
      consequential: false,
    };
  }
  if (has(s, "remove", "delete", "drop", "hide")) {
    const type = matchType(s);
    const victim = type ? widgetsOfType(world, type)[0] : world.board.widgets[world.board.widgets.length - 1];
    if (!victim) return { error: "Couldn't find that widget to remove." };
    return {
      patches: [{ op: "remove", layer: "board", path: `/widgets/#${victim.id}` }],
      summary: `Remove the ${PRIMITIVE_META[victim.type].label.toLowerCase()}`,
      consequential: false,
    };
  }

  // resize
  if (has(s, "bigger", "larger", "smaller")) {
    const type = matchType(s) ?? "Metric";
    const w = widgetsOfType(world, type)[0];
    if (!w) return { error: `No ${type} on the board to resize.` };
    const sizes = PRIMITIVE_META[w.type].sizes;
    const cur = sizes.indexOf(w.size);
    const next = has(s, "smaller") ? sizes[Math.max(0, cur - 1)] : sizes[Math.min(sizes.length - 1, cur + 1)];
    if (next === w.size) return { error: `The ${type} is already as ${has(s, "smaller") ? "small" : "large"} as it goes.` };
    return {
      patches: [{ op: "resize", layer: "board", path: `/widgets/#${w.id}/size`, value: next }],
      summary: `Resize the ${PRIMITIVE_META[w.type].label.toLowerCase()} to ${next}`,
      consequential: false,
    };
  }

  // "show failures" / "where is it failing"
  if (has(s, "fail", "wrong", "worst", "bad case")) {
    const top = has(s, "top", "first", "up");
    return proposeAdd(
      world, "CaseTable",
      { size: "lg", props: { columns: ["input", "output", "score"], sortBy: "score", filter: "failures" }, bind: { step: "critique", field: "perCase" } },
      `Add a failures-only case table${top ? " at the top" : ""}`,
      top
    );
  }

  // add a comparison
  if (has(s, "compare", "comparison", "side by side", "diff")) {
    return proposeAdd(
      world, "Compare",
      { size: "lg", props: { mode: has(s, "diff") ? "diff" : "side-by-side", highlight: "divergence", sources: [{ step: "draft", field: "output" }, { step: "draft_baseline", field: "output" }] } },
      "Add a side-by-side comparison of the two drafts"
    );
  }

  // add distribution
  if (has(s, "distribution", "histogram", "spread", "scores across")) {
    return proposeAdd(
      world, "Distribution",
      { size: "md", props: { metric: "faithfulness", bins: 11, mark: "bar" }, bind: { step: "critique", field: "perCase" } },
      "Add a score distribution across cases"
    );
  }

  // add metric
  if (has(s, "metric", "score", "number")) {
    return proposeAdd(
      world, "Metric",
      { size: "sm", props: { label: "Faithfulness", format: "float2", trend: "up-good" }, bind: { step: "critique", field: "score" } },
      "Add the faithfulness score metric"
    );
  }

  // add note
  const noteMatch = request.match(/note[:\s]+["“]?([^"”]+)["”]?$/i);
  if (has(s, "note", "hypothesis", "caption") || noteMatch) {
    const body = noteMatch ? noteMatch[1] : "New note";
    return proposeAdd(
      world, "Note",
      { size: "sm", props: { body, tone: has(s, "hypothesis") ? "hypothesis" : has(s, "warn") ? "warning" : "plain" } },
      `Add a note`
    );
  }

  // add output
  if (has(s, "output", "response", "transcript")) {
    return proposeAdd(
      world, "OutputCard",
      { size: "md", props: { wrap: "pretty", showTokens: false }, bind: { step: "draft", field: "output" } },
      "Add an output card for the draft"
    );
  }

  return {
    error:
      "I can add a comparison, metric, distribution, case table, output, or note; resize or remove widgets; " +
      "surface failures; or (workflow) change temperature / model. Try: “show me where it's failing, up top”.",
  };
}

function matchType(s: string): PrimitiveType | null {
  if (has(s, "compar")) return "Compare";
  if (has(s, "distribution", "histogram")) return "Distribution";
  if (has(s, "case", "table", "fail")) return "CaseTable";
  if (has(s, "metric", "number", "score")) return "Metric";
  if (has(s, "note")) return "Note";
  if (has(s, "output", "response")) return "OutputCard";
  if (has(s, "runner", "prompt")) return "PromptRunner";
  return null;
}
