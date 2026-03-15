import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { SegmentBlock } from "./SegmentBlock";
import { TransitionChip } from "./TransitionChip";
import { AudioTrackRow } from "./AudioTrackRow";
import { ExtraVFXRow } from "./ExtraVFXRow";

export function TimelineEditor() {
  const { segments, transitions } = useStore(useShallow(s => ({
    segments: s.segments,
    transitions: s.transitions,
  })));

  const { setNodeRef, isOver } = useDroppable({ id: "timeline-drop" });

  const segmentIds = segments.map(s => s.id);

  return (
    <div className="flex flex-col gap-3">
      <AudioTrackRow />

      {/* Segment track */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] items-stretch gap-1 rounded-lg border-2 border-dashed p-2 transition ${
          isOver ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/30"
        }`}
      >
        {segments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-zinc-600">
            Drag molds from the library to build your timeline
          </div>
        ) : (
          <SortableContext items={segmentIds} strategy={horizontalListSortingStrategy}>
            {segments.map((seg, i) => (
              <div key={seg.id} className="flex items-stretch">
                <SegmentBlock segment={seg} index={i} />
                {i < segments.length - 1 && transitions[i] && (
                  <TransitionChip transition={transitions[i]} index={i} />
                )}
              </div>
            ))}
          </SortableContext>
        )}
      </div>

      <ExtraVFXRow />
    </div>
  );
}
