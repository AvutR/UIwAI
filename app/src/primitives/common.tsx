import type { Binding, StepResult, Widget } from "../types";
import type { World } from "../lib/patch";
import { modelLabel } from "../data/models";

export interface PrimProps {
  widget: Widget;
  world: World;
}

/** Resolve a binding against the board's active run. Read-only, always. */
export function resolve(world: World, bind?: Binding): { result?: StepResult; stepId?: string; model?: string } {
  if (!bind) return {};
  const step = world.workflow.steps.find((s) => s.id === bind.step);
  const run = world.workflow.runs.find((r) => r.id === world.board.activeRun);
  const result = run?.results[bind.step];
  return { result, stepId: step?.id, model: result?.meta?.model ?? step?.model };
}

/** Provenance footer — mandatory on data-bound primitives (principles §4). */
export function Provenance({ stepId, model, extra }: { stepId?: string; model?: string; extra?: string }) {
  return (
    <div style={{ marginTop: "auto", paddingTop: "var(--space-2)", display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
      <span className="t-caption" style={{ color: "var(--fg-faint)" }}>
        {stepId ? <>step <b style={{ color: "var(--fg-muted)" }}>{stepId}</b></> : "unbound"}
        {model && <> · {modelLabel(model)}</>}
        {extra && <> · {extra}</>}
      </span>
    </div>
  );
}

/** The explicit unbound state — never a crash, never a silent blank. */
export function Unbound({ what = "data" }: { what?: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--fg-faint)", textAlign: "center", gap: "var(--space-1)" }}>
      <div style={{ fontSize: 18, opacity: 0.5 }}>◍</div>
      <div className="t-caption">Unbound — connect a step to show {what}</div>
    </div>
  );
}

export function fmt(v: number | undefined, format: string): string {
  if (v == null) return "—";
  switch (format) {
    case "int": return String(Math.round(v));
    case "pct": return `${(v * 100).toFixed(0)}%`;
    case "ms": return `${Math.round(v)}ms`;
    default: return v.toFixed(2);
  }
}

/** Minimal markdown: **bold**, `code`, and line breaks. Enough for notes. */
export function MiniMarkdown({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`(.+?)`/g, '<code style="font-family:var(--font-mono);font-size:12px;background:var(--bg-inset);padding:1px 4px;border-radius:4px">$1</code>')
    .replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function inset(children: React.ReactNode, extra: React.CSSProperties = {}) {
  return (
    <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", overflow: "auto", ...extra }}>
      {children}
    </div>
  );
}
