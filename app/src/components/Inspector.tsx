import type { Store } from "../lib/store";
import { PRIMITIVE_META } from "../primitives/meta";
import { findWidget } from "../lib/patch";

/* The third edit path: fine-tune the selected widget by hand. Writes the
   exact same patches the drag and the AI do. */

export function Inspector({ store, selected, onSelect }: { store: Store; selected: string | null; onSelect: (id: string | null) => void }) {
  const widget = selected ? findWidget(store.world.board, selected) : undefined;
  if (!widget) {
    return (
      <aside style={panel}>
        <div className="t-title">Inspector</div>
        <div className="t-caption" style={{ marginTop: "var(--space-2)" }}>Select a widget to fine-tune it — size, props, and which step it reads.</div>
      </aside>
    );
  }
  const meta = PRIMITIVE_META[widget.type];
  const set = (key: string, value: unknown) =>
    store.apply([{ op: "set", layer: "board", path: `/widgets/#${widget.id}/props/${key}`, value }], false, `edit ${key}`);

  return (
    <aside style={panel}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <div className="t-title" style={{ flex: 1 }}>{meta.label}</div>
        <button style={ghostBtn} onClick={() => {
          store.apply([{ op: "remove", layer: "board", path: `/widgets/#${widget.id}` }], false, `remove ${widget.type}`);
          onSelect(null);
        }}>Remove</button>
      </div>
      <div className="t-caption" style={{ color: "var(--fg-faint)" }}>{widget.id}</div>

      <Section title="Size">
        <div style={{ display: "flex", gap: 6 }}>
          {meta.sizes.map((sz) => (
            <button key={sz} onClick={() => store.apply([{ op: "resize", layer: "board", path: `/widgets/#${widget.id}/size`, value: sz }], false, "resize")}
              style={{ ...chip, ...(widget.size === sz ? chipActive : {}) }}>{sz}</button>
          ))}
        </div>
      </Section>

      {meta.dataBound && (
        <Section title="Reads from step">
          <select value={widget.bind?.step ?? ""} style={select}
            onChange={(e) => store.apply([{ op: "set", layer: "board", path: `/widgets/#${widget.id}/bind`, value: { step: e.target.value, field: widget.bind?.field ?? "output" } }], false, "rebind")}>
            <option value="">— unbound —</option>
            {store.world.workflow.steps.map((s) => <option key={s.id} value={s.id}>{s.id} ({s.role})</option>)}
          </select>
        </Section>
      )}

      <Section title="Props">
        {Object.entries(widget.props).map(([k, v]) => (
          <Field key={k} name={k} value={v} onChange={(val) => set(k, val)} />
        ))}
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <div className="t-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "var(--space-2)" }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ name, value, onChange }: { name: string; value: unknown; onChange: (v: unknown) => void }) {
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1.4fr", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" };
  if (typeof value === "boolean")
    return <label style={row}><span className="t-caption">{name}</span><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /></label>;
  if (typeof value === "number")
    return <label style={row}><span className="t-caption">{name}</span><input type="number" step="0.1" value={value} style={input} onChange={(e) => onChange(Number(e.target.value))} /></label>;
  if (typeof value === "string")
    return <label style={row}><span className="t-caption">{name}</span><input value={value} style={input} onChange={(e) => onChange(e.target.value)} /></label>;
  // arrays/objects (e.g. Compare.sources) — read-only summary; edited via drag/AI
  return <div style={row}><span className="t-caption">{name}</span><span className="t-caption" style={{ color: "var(--fg-faint)" }}>{Array.isArray(value) ? `${value.length} item(s)` : "object"}</span></div>;
}

const panel: React.CSSProperties = {
  width: 260, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--bg-widget)",
  padding: "var(--space-4)", overflow: "auto",
};
const input: React.CSSProperties = { fontFamily: "inherit", fontSize: 12, padding: "4px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-canvas)", color: "var(--fg-default)", width: "100%" };
const select: React.CSSProperties = { ...input };
const chip: React.CSSProperties = { fontSize: 12, padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--bg-canvas)", color: "var(--fg-muted)" };
const chipActive: React.CSSProperties = { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" };
const ghostBtn: React.CSSProperties = { fontSize: 12, padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--bad)" };
