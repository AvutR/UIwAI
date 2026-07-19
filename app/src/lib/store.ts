import { useCallback, useState } from "react";
import type { Patch, Run } from "../types";
import { applyProposal, type World } from "./patch";

interface Snapshot { world: World; label: string }

export interface Store {
  world: World;
  apply: (patches: Patch[], allowWorkflow: boolean, label: string) => { ok: boolean; error?: string };
  undo: () => void;
  canUndo: boolean;
  lastLabel: string | null;
  setActiveRun: (runId: string) => void;
  run: () => void;
}

export function useWorld(initial: World): Store {
  const [world, setWorld] = useState<World>(initial);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const apply = useCallback<Store["apply"]>((patches, allowWorkflow, label) => {
    const res = applyProposal(world, patches, allowWorkflow);
    if (!res.ok) return { ok: false, error: res.error };
    setHistory((h) => [...h, { world, label }]);
    setWorld(res.world);
    return { ok: true };
  }, [world]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setWorld(prev.world);
      return h.slice(0, -1);
    });
  }, []);

  const setActiveRun = useCallback((runId: string) => {
    setWorld((w) => ({ ...w, board: { ...w.board, activeRun: runId } }));
  }, []);

  // Mock execution: append a new run derived from the latest, with jittered
  // scores and a refreshed draft. In production this calls the model pipeline.
  const run = useCallback(() => {
    setWorld((w) => {
      const base = w.workflow.runs[0];
      const jitter = () => Math.max(0, Math.min(10, (base.results.critique?.score ?? 7) + (Math.random() * 2 - 1)));
      const newRun: Run = {
        id: `run_${Date.now().toString(36)}`,
        startedAt: new Date().toISOString(),
        label: `fresh run · ${new Date().toLocaleTimeString()}`,
        results: structuredClone(base.results),
      };
      const score = jitter();
      if (newRun.results.critique) {
        newRun.results.critique.score = score;
        newRun.results.critique.perCase = newRun.results.critique.perCase?.map((c) => ({
          ...c, score: Math.max(0, Math.min(10, Math.round(c.score + (Math.random() * 2 - 1)))),
        }));
      }
      return {
        workflow: { ...w.workflow, runs: [newRun, ...w.workflow.runs] },
        board: { ...w.board, activeRun: newRun.id },
      };
    });
  }, []);

  return {
    world, apply, undo,
    canUndo: history.length > 0,
    lastLabel: history.length ? history[history.length - 1].label : null,
    setActiveRun, run,
  };
}
