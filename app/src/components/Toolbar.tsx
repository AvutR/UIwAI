import { useState } from "react";
import type { PrimitiveType } from "../types";
import type { Store } from "../lib/store";
import { ALL_PRIMITIVES, PRIMITIVE_META, makeWidget } from "../primitives/meta";
import { firstFreeSlot } from "../lib/grid";

export function Toolbar({ store, theme, onToggleTheme, onSelect }: {
  store: Store; theme: string; onToggleTheme: () => void; onSelect: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  function add(type: PrimitiveType) {
    const size = PRIMITIVE_META[type].defaultSize;
    const slot = firstFreeSlot(store.world.board.widgets, size);
    const id = `w_${type}_${Date.now().toString(36).slice(-4)}`;
    const widget = makeWidget(type, id, slot);
    const res = store.apply([{ op: "add", layer: "board", path: "/widgets/-", value: widget }], false, `add ${type}`);
    setAddOpen(false);
    if (res.ok) onSelect(id);
  }

  const kinds: Record<string, PrimitiveType[]> = { data: [], control: [], framing: [] };
  for (const p of ALL_PRIMITIVES) kinds[PRIMITIVE_META[p].kind].push(p);

  return (
    <header style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border)", background: "var(--bg-widget)", position: "relative", zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span className="t-title" style={{ fontWeight: 700 }}>Bench</span>
        <span className="t-caption">{store.world.workflow.title}</span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ position: "relative" }}>
        <button style={btn} onClick={() => setAddOpen((o) => !o)}>+ Add widget</button>
        {addOpen && (
          <div style={menu}>
            {(["data", "control", "framing"] as const).map((k) => (
              <div key={k}>
                <div className="t-caption" style={{ textTransform: "uppercase", letterSpacing: ".04em", padding: "var(--space-2) var(--space-2) 2px", color: "var(--fg-faint)" }}>{k}</div>
                {kinds[k].map((p) => (
                  <button key={p} style={menuItem} onClick={() => add(p)}>
                    <span className="t-body">{PRIMITIVE_META[p].label}</span>
                    <span className="t-caption" style={{ color: "var(--fg-faint)" }}>{PRIMITIVE_META[p].blurb}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <button style={{ ...btn, opacity: store.canUndo ? 1 : 0.4 }} disabled={!store.canUndo} onClick={store.undo} title={store.lastLabel ?? ""}>↶ Undo</button>
      <button style={btn} onClick={onToggleTheme}>{theme === "dark" ? "☀" : "☾"}</button>
      <button style={{ ...btn, background: "var(--accent)", color: "#fff", border: "none" }} onClick={store.run}>Run ▸</button>
    </header>
  );
}

const btn: React.CSSProperties = { fontSize: 13, fontWeight: 500, padding: "7px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)", background: "var(--bg-canvas)", color: "var(--fg-default)" };
const menu: React.CSSProperties = { position: "absolute", top: "calc(100% + 6px)", right: 0, width: 260, background: "var(--bg-widget)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lift)", padding: "var(--space-2)", maxHeight: 420, overflow: "auto" };
const menuItem: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", textAlign: "left", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "none", background: "transparent", color: "var(--fg-default)" };
