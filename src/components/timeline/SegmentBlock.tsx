import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { Segment } from "../../data/types";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { useStore } from "../../store/useStore";
import { validateSegment } from "../../utils/assetValidator";
import { ValidationBadge } from "../shared/ValidationBadge";

interface Props {
  segment: Segment;
  index: number;
}

export function SegmentBlock({ segment }: Props) {
  const { select, removeSegment, selectedId } = useStore(useShallow(s => ({
    select: s.select,
    removeSegment: s.removeSegment,
    selectedId: s.selectedId,
  })));

  const mold = MOLD_REGISTRY[segment.moldId];
  const selected = selectedId === segment.id;
  const duration = segment.endTimeS - segment.startTimeS;
  const validation = mold ? validateSegment(segment, mold) : null;
  const issueCount = validation ? validation.missingAssets.length + (validation.hasHookConflict ? 1 : 0) + (validation.hasHookMissing ? 1 : 0) : 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    minWidth: 120,
    width: Math.max(120, duration * 60),
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onClick={() => select("segment", segment.id)}
      className={`group relative flex cursor-pointer flex-col rounded-lg border-l-4 p-2 transition ${isDragging ? "z-50 opacity-60" : ""} ${selected ? "ring-2 ring-zinc-400 ring-offset-1 ring-offset-zinc-950" : ""}`}
      style={{
        ...style,
        borderLeftColor: mold?.color ?? "#666",
        backgroundColor: `${mold?.color ?? "#666"}20`,
      }}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        className="absolute left-0 top-0 flex h-full w-3 cursor-grab items-center justify-center rounded-l opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
      >
        <div className="h-4 w-0.5 rounded bg-zinc-500" />
      </div>

      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); removeSegment(segment.id); }}
        className="absolute right-1 top-1 hidden rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 group-hover:block"
      >
        <X size={12} />
      </button>

      {/* Top row */}
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-bold text-zinc-200">
          {mold?.label ?? segment.moldId}
        </span>
        <ValidationBadge issueCount={issueCount} />
      </div>

      {/* Duration */}
      <span className="mt-1 text-[10px] text-zinc-400">
        {duration > 0 ? `${duration.toFixed(1)}s` : "—"}
      </span>

      {/* Bottom info */}
      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
        {mold?.hasCaptions && (
          <span className="truncate text-[9px] italic text-zinc-500">{segment.captionStyle || "—"}</span>
        )}
        <span className="shrink-0 text-[9px] text-zinc-600">
          {segment.startWord ? `"${segment.startWord.word}"` : "?"} →{" "}
          {segment.endWord ? `"${segment.endWord.word}"` : "?"}
        </span>
      </div>
    </div>
  );
}
