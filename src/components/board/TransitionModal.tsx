import { useEffect } from "react";
import { X, Zap } from "lucide-react";
import { useStore } from "../../store/useStore";
import { TransitionInspector } from "../inspector/TransitionInspector";

interface TransitionModalProps {
  transitionId: string | null;
  onClose: () => void;
}

export function TransitionModal({ transitionId, onClose }: TransitionModalProps) {
  const select      = useStore(s => s.select);
  const transitions = useStore(s => s.transitions);

  useEffect(() => {
    if (transitionId) {
      select("transition", transitionId);
    }
    return () => {
      if (transitionId) select(null, null);
    };
  }, [transitionId, select]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!transitionId) return null;

  const transition = transitions.find(t => t.id === transitionId);
  if (!transition) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-[360px] max-h-[85vh] flex flex-col bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
          <Zap size={13} className="text-yellow-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-200 flex-1">
            CUT {transition.cutIndex + 1}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TransitionInspector transition={transition} index={transition.cutIndex} />
        </div>
      </div>
    </div>
  );
}
