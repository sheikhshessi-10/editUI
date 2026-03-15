import { useDraggable } from "@dnd-kit/core";
import type { MoldDef } from "../../data/moldRegistry";
import { useStore } from "../../store/useStore";

interface Props {
  mold: MoldDef;
}

export function MoldCard({ mold }: Props) {
  const addSegment = useStore(s => s.addSegment);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `mold-drag-${mold.id}`,
    data: { type: "mold", moldId: mold.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => addSegment(mold.id)}
      className={`flex cursor-pointer gap-2 rounded-md border border-zinc-700/50 bg-zinc-800/60 p-2 transition hover:border-zinc-600 hover:bg-zinc-800 ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: mold.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-zinc-200">{mold.label}</span>
          {mold.hasInternalAudio && (
            <span className="shrink-0 rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-400">
              AUDIO
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] leading-tight text-zinc-500">{mold.description}</p>
        <div className="mt-1 flex gap-1">
          <span className="rounded bg-zinc-700/50 px-1 py-px text-[9px] text-zinc-400">
            {mold.assets.length} asset{mold.assets.length !== 1 ? "s" : ""}
          </span>
          {mold.durationType === "fixed5" && (
            <span className="rounded bg-blue-500/20 px-1 py-px text-[9px] text-blue-400">5s fixed</span>
          )}
          {mold.hasCaptions && (
            <span className="rounded bg-purple-500/20 px-1 py-px text-[9px] text-purple-400">captions</span>
          )}
        </div>
      </div>
    </div>
  );
}
