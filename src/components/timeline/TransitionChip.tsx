import { Zap } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { Transition } from "../../data/types";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";

interface Props {
  transition: Transition;
  index: number;
}

export function TransitionChip({ transition, index }: Props) {
  const { select, selectedId, segments } = useStore(useShallow(s => ({
    select: s.select,
    selectedId: s.selectedId,
    segments: s.segments,
  })));

  const selected = selectedId === transition.id;
  const destMold = segments[index + 1] ? MOLD_REGISTRY[segments[index + 1].moldId] : null;
  const hasInternalAudioWarning = destMold?.hasInternalAudio && transition.woosh;

  const parts: string[] = [];
  if (transition.morph && transition.morphFunction) parts.push("morph");
  if (transition.lightLeak !== "none") parts.push(transition.lightLeak);
  if (transition.redEnergy) parts.push("red");
  if (transition.woosh) parts.push("woosh");

  return (
    <div
      onClick={() => select("transition", transition.id)}
      className={`flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border px-2 py-1 transition ${
        selected
          ? "border-amber-500 bg-amber-500/20"
          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
      }`}
      style={{ minWidth: 40 }}
    >
      <Zap size={12} className={hasInternalAudioWarning ? "text-amber-400" : "text-zinc-500"} />
      {parts.length > 0 && (
        <span className="mt-0.5 max-w-[60px] truncate text-center text-[8px] text-zinc-500">
          {parts.join("+")}
        </span>
      )}
    </div>
  );
}
