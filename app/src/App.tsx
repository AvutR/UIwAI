import { useEffect, useState } from "react";
import { useWorld } from "./lib/store";
import { seedBoard, seedWorkflow } from "./data/seed";
import { Toolbar } from "./components/Toolbar";
import { Canvas } from "./components/Canvas";
import { Inspector } from "./components/Inspector";
import { AiBar } from "./components/AiBar";

export default function App() {
  const store = useWorld({ board: seedBoard, workflow: seedWorkflow });
  const [selected, setSelected] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  // Control primitives dispatch these events; App owns the actual effects.
  useEffect(() => {
    const onRun = () => store.run();
    const onPin = (e: Event) => store.setActiveRun((e as CustomEvent<string>).detail);
    window.addEventListener("bench:run", onRun);
    window.addEventListener("bench:pin-run", onPin as EventListener);
    return () => {
      window.removeEventListener("bench:run", onRun);
      window.removeEventListener("bench:pin-run", onPin as EventListener);
    };
  }, [store]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar store={store} theme={theme} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} onSelect={setSelected} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Canvas store={store} selected={selected} onSelect={setSelected} />
        <Inspector store={store} selected={selected} onSelect={setSelected} />
      </div>
      <AiBar store={store} />
    </div>
  );
}
