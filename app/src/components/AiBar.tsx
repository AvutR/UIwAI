import { useState } from "react";
import type { EditProposal } from "../types";
import type { Store } from "../lib/store";
import { interpret } from "../ai/interpret";

/* The natural-language edit path. A request becomes a PROPOSAL — never an
   applied fact. You see the summary, the impact (for workflow edits), and
   the raw patches, then accept or reject. This is principles §5 made UI. */

const SUGGESTIONS = [
  "show me where it's failing, up top",
  "add a score distribution",
  "make the comparison bigger",
  "this is too busy",
  "make the critique deterministic",
];

export function AiBar({ store }: { store: Store }) {
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<EditProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(q: string) {
    setError(null);
    setProposal(null);
    const res = interpret(q, store.world);
    if ("error" in res) { setError(res.error); return; }
    setProposal(res);
  }

  function accept() {
    if (!proposal) return;
    const res = store.apply(proposal.patches, proposal.consequential, proposal.summary);
    if (!res.ok) { setError(`Rejected by validator: ${res.error}`); return; }
    setProposal(null);
    setText("");
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-widget)", padding: "var(--space-3) var(--space-4)" }}>
      {proposal && (
        <div style={{ marginBottom: "var(--space-3)", border: `1px solid ${proposal.consequential ? "var(--warn)" : "var(--accent)"}`, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <div style={{ padding: "var(--space-3)", background: proposal.consequential ? "color-mix(in srgb, var(--warn) 10%, transparent)" : "var(--accent-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span className="t-caption" style={{ fontWeight: 600, color: proposal.consequential ? "var(--warn)" : "var(--accent)" }}>
                {proposal.consequential ? "WORKFLOW EDIT" : "BOARD EDIT"}
              </span>
              <span className="t-body" style={{ flex: 1 }}>{proposal.summary}</span>
            </div>
            {proposal.impact && <div className="t-caption" style={{ marginTop: 4, color: "var(--warn)" }}>⚠ {proposal.impact}</div>}
          </div>
          <details style={{ padding: "var(--space-2) var(--space-3)", borderTop: "1px solid var(--border)" }}>
            <summary className="t-caption" style={{ cursor: "pointer" }}>{proposal.patches.length} patch{proposal.patches.length > 1 ? "es" : ""} — inspect</summary>
            <pre className="t-mono" style={{ margin: "var(--space-2) 0 0", whiteSpace: "pre-wrap", color: "var(--fg-muted)", maxHeight: 160, overflow: "auto" }}>{JSON.stringify(proposal.patches, null, 2)}</pre>
          </details>
          <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderTop: "1px solid var(--border)" }}>
            <button style={primaryBtn} onClick={accept}>Accept</button>
            <button style={ghostBtn} onClick={() => setProposal(null)}>Reject</button>
          </div>
        </div>
      )}

      {error && <div className="t-caption" style={{ color: "var(--bad)", marginBottom: "var(--space-2)" }}>{error}</div>}

      {!proposal && (
        <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} style={suggestChip} onClick={() => { setText(s); submit(s); }}>{s}</button>
          ))}
        </div>
      )}

      <form style={{ display: "flex", gap: "var(--space-2)" }} onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe a change — e.g. “add a comparison and put failures on top”"
          style={{ flex: 1, fontFamily: "inherit", fontSize: 14, padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)", background: "var(--bg-canvas)", color: "var(--fg-default)" }} />
        <button type="submit" style={primaryBtn}>Propose ▸</button>
      </form>
    </div>
  );
}

const primaryBtn: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "none", background: "var(--accent)", color: "#fff" };
const ghostBtn: React.CSSProperties = { fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--fg-muted)" };
const suggestChip: React.CSSProperties = { fontSize: 12, padding: "5px 10px", borderRadius: "99px", border: "1px solid var(--border)", background: "var(--bg-canvas)", color: "var(--fg-muted)" };
