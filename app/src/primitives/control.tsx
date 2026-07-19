import type { PrimProps } from "./common";
import { resolve, Provenance, inset } from "./common";
import { modelLabel } from "../data/models";

/* Control primitives configure and trigger the workflow. Even these do
   not edit workflow STRUCTURE — they set params / press run. The run
   action is wired from App via a global on the world (see onRun prop path). */

export function PromptRunner({ widget, world }: PrimProps) {
  const { stepId } = resolve(world, widget.bind);
  const p = widget.props as { models: string[]; showParams: boolean };
  const step = world.workflow.steps.find((s) => s.id === widget.bind?.step);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "var(--space-2)" }}>
      {inset(<span className="t-mono" style={{ whiteSpace: "pre-wrap", color: "var(--fg-muted)" }}>{step?.prompt ?? "—"}</span>, { flex: 1 })}
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        <select data-no-drag defaultValue={step?.model} style={selectStyle}>
          {(p.models ?? []).map((m) => <option key={m} value={m}>{modelLabel(m)}</option>)}
        </select>
        {p.showParams && step && (
          <span className="t-caption">temp {String(step.params.temperature ?? "—")}</span>
        )}
        <button data-no-drag style={runBtn} onClick={() => world.board && window.dispatchEvent(new CustomEvent("bench:run"))}>Run ▸</button>
      </div>
      <Provenance stepId={stepId} model={step?.model} />
    </div>
  );
}

export function PipelineStep({ widget, world }: PrimProps) {
  const p = widget.props as { role: string; showStatus: boolean };
  const { result, stepId, model } = resolve(world, widget.bind);
  const status = result?.meta?.status ?? "pending";
  const dot = status === "ok" ? "var(--ok)" : status === "error" ? "var(--bad)" : "var(--fg-faint)";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="t-caption">{p.role}</div>
      <div className="t-title" style={{ marginTop: 2 }}>{stepId ?? "—"}</div>
      {p.showStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: dot }} />
          <span className="t-caption">{status}{result?.meta?.latencyMs ? ` · ${result.meta.latencyMs}ms` : ""}</span>
        </div>
      )}
      <Provenance stepId={stepId} model={model} />
    </div>
  );
}

export function RunControl({ widget, world }: PrimProps) {
  const p = widget.props as { scope: string };
  const run = world.workflow.runs.find((r) => r.id === world.board.activeRun);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "var(--space-2)" }}>
      <button data-no-drag style={runBtn} onClick={() => window.dispatchEvent(new CustomEvent("bench:run"))}>Run {p.scope} ▸</button>
      <select data-no-drag defaultValue={world.board.activeRun} style={selectStyle}
        onChange={(e) => window.dispatchEvent(new CustomEvent("bench:pin-run", { detail: e.target.value }))}>
        {world.workflow.runs.map((r) => <option key={r.id} value={r.id}>{r.label ?? r.id}</option>)}
      </select>
      <span className="t-caption" style={{ marginTop: "auto" }}>pinned · {run?.label ?? run?.id}</span>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 12, padding: "4px 8px", borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-strong)", background: "var(--bg-widget)", color: "var(--fg-default)",
};
const runBtn: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--radius-sm)",
  border: "none", background: "var(--accent)", color: "#fff",
};
