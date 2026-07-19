import type { PrimProps } from "./common";
import { MiniMarkdown } from "./common";

/* Framing primitives bind to nothing. Pure presentation — they help a
   researcher narrate and structure a board. */

export function Note({ widget }: PrimProps) {
  const p = widget.props as { body: string; tone: string };
  const tone = {
    plain: { bg: "var(--bg-inset)", bar: "var(--border-strong)" },
    hypothesis: { bg: "var(--accent-soft)", bar: "var(--accent)" },
    warning: { bg: "color-mix(in srgb, var(--warn) 12%, transparent)", bar: "var(--warn)" },
  }[p.tone] ?? { bg: "var(--bg-inset)", bar: "var(--border-strong)" };
  return (
    <div style={{ height: "100%", background: tone.bg, borderRadius: "var(--radius-md)", borderLeft: `3px solid ${tone.bar}`, padding: "var(--space-3)", overflow: "auto" }}>
      {p.tone !== "plain" && <div className="t-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{p.tone}</div>}
      <div className="t-body"><MiniMarkdown text={p.body} /></div>
    </div>
  );
}

export function Group({ widget }: PrimProps) {
  const p = widget.props as { title: string; collapsed: boolean };
  return (
    <div style={{ height: "100%", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", display: "flex", flexDirection: "column" }}>
      <div className="t-title">{p.title}</div>
      <div className="t-caption" style={{ marginTop: "auto" }}>{p.collapsed ? "collapsed" : "region"} · drop widgets here</div>
    </div>
  );
}
