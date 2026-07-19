import type { PrimProps } from "./common";
import { resolve, Provenance, Unbound, fmt, inset } from "./common";
import type { Binding } from "../types";
import { modelLabel } from "../data/models";

/* Data-bound primitives. Each shows provenance; each renders an explicit
   unbound state rather than crashing on a missing binding. */

export function Metric({ widget, world }: PrimProps) {
  const { result, stepId, model } = resolve(world, widget.bind);
  const p = widget.props as { label: string; format: string; trend: string };
  const field = widget.bind?.field;
  const raw = field === "score" ? result?.score : field === "meta" ? result?.meta?.latencyMs : result?.score;
  const trendColor = p.trend === "up-good" ? "var(--ok)" : p.trend === "up-bad" ? "var(--bad)" : "var(--fg-faint)";
  if (!result) return <Unbound what="a number" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="t-caption">{p.label}</div>
      <div className="t-display" style={{ marginTop: "auto" }}>{fmt(raw, p.format)}</div>
      {p.trend !== "none" && <div className="t-caption" style={{ color: trendColor }}>▲ higher is {p.trend === "up-good" ? "better" : "worse"}</div>}
      <Provenance stepId={stepId} model={model} />
    </div>
  );
}

export function OutputCard({ widget, world }: PrimProps) {
  const { result, stepId, model } = resolve(world, widget.bind);
  const p = widget.props as { wrap: string; showTokens: boolean };
  if (!result?.output) return <Unbound what="an output" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "var(--space-2)" }}>
      {inset(
        <span className={p.wrap === "raw" ? "t-mono" : "t-body"} style={{ whiteSpace: "pre-wrap" }}>{result.output}</span>,
        { flex: 1 }
      )}
      <Provenance stepId={stepId} model={model} extra={p.showTokens && result.meta?.tokens ? `${result.meta.tokens} tok` : undefined} />
    </div>
  );
}

export function Compare({ widget, world }: PrimProps) {
  const p = widget.props as { mode: string; highlight: string; sources: Binding[] };
  const cols = (p.sources ?? []).map((b) => ({ b, ...resolve(world, b) }));
  if (!cols.length) return <Unbound what="outputs to compare" />;
  const diverge = p.highlight === "divergence";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "var(--space-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: "var(--space-2)", flex: 1, minHeight: 0 }}>
        {cols.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", minHeight: 0 }}>
            <div className="t-caption" style={{ color: "var(--accent)" }}>{c.b.step} · {modelLabel(c.model ?? "")}</div>
            {inset(
              <span className="t-body" style={{ whiteSpace: "pre-wrap" }}>{c.result?.output ?? "—"}</span>,
              { flex: 1, borderLeft: diverge && i === cols.length - 1 ? "2px solid var(--warn)" : undefined }
            )}
          </div>
        ))}
      </div>
      {diverge && <div className="t-caption" style={{ color: "var(--warn)" }}>divergence highlighted</div>}
    </div>
  );
}

export function Distribution({ widget, world }: PrimProps) {
  const { result, stepId } = resolve(world, widget.bind);
  const p = widget.props as { metric: string; bins: number; mark: string };
  const cases = result?.perCase ?? [];
  if (!cases.length) return <Unbound what="per-case scores" />;
  const bins = Math.max(5, Math.min(20, p.bins || 11));
  const counts = new Array(bins).fill(0);
  for (const c of cases) counts[Math.min(bins - 1, Math.max(0, Math.round((c.score / 10) * (bins - 1))))]++;
  const max = Math.max(...counts, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="t-caption">{p.metric} · {cases.length} cases</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, flex: 1, marginTop: "var(--space-2)" }}>
        {counts.map((n, i) => (
          <div key={i} title={`score ${((i / (bins - 1)) * 10).toFixed(0)}: ${n}`}
            style={{ flex: 1, height: `${(n / max) * 100}%`, minHeight: 2, borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
              background: i / (bins - 1) < 0.4 ? "var(--bad)" : i / (bins - 1) < 0.7 ? "var(--warn)" : "var(--accent)" }} />
        ))}
      </div>
      <Provenance stepId={stepId} extra={`${cases.length} cases`} />
    </div>
  );
}

export function CaseTable({ widget, world }: PrimProps) {
  const { result, stepId } = resolve(world, widget.bind);
  const p = widget.props as { columns: string[]; sortBy: string; filter: string };
  let cases = [...(result?.perCase ?? [])];
  if (!cases.length) return <Unbound what="per-case rows" />;
  if (p.filter === "failures") cases = cases.filter((c) => c.score < 5);
  cases.sort((a, b) => (p.sortBy === "score" ? a.score - b.score : 0));
  const cols = p.columns ?? ["input", "output", "score"];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {p.filter === "failures" && <div className="t-caption" style={{ color: "var(--bad)", marginBottom: "var(--space-1)" }}>failures only · {cases.length} of {result?.perCase?.length}</div>}
      <div style={{ overflow: "auto", flex: 1, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{cols.map((c) => <th key={c} style={{ textAlign: "left", padding: "6px 8px", position: "sticky", top: 0, background: "var(--bg-inset)", color: "var(--fg-muted)", fontWeight: 500 }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {cases.slice(0, 40).map((c, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                {cols.map((col) => (
                  <td key={col} style={{ padding: "6px 8px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: col === "score" ? (c.score < 5 ? "var(--bad)" : "var(--fg-default)") : "var(--fg-default)", fontVariantNumeric: "tabular-nums" }}>
                    {col === "score" ? c.score.toFixed(0) : col === "model" ? modelLabel(c.model ?? "") : (c as any)[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Provenance stepId={stepId} extra={`${cases.length} rows`} />
    </div>
  );
}
