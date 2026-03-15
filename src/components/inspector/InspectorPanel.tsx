import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { SegmentInspector } from "./SegmentInspector";
import { TransitionInspector } from "./TransitionInspector";
import { ExtraVFXInspector } from "./ExtraVFXInspector";

export function InspectorPanel() {
  const { selectedType, selectedId, segments, transitions, extraVfx } = useStore(useShallow(s => ({
    selectedType: s.selectedType,
    selectedId: s.selectedId,
    segments: s.segments,
    transitions: s.transitions,
    extraVfx: s.extraVfx,
  })));

  if (!selectedType || !selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-zinc-600">
        Select a segment, transition, or VFX to inspect
      </div>
    );
  }

  if (selectedType === "segment") {
    const idx = segments.findIndex(s => s.id === selectedId);
    if (idx === -1) return null;
    return <SegmentInspector segment={segments[idx]} index={idx} />;
  }

  if (selectedType === "transition") {
    const idx = transitions.findIndex(t => t.id === selectedId);
    if (idx === -1) return null;
    return <TransitionInspector transition={transitions[idx]} index={idx} />;
  }

  if (selectedType === "extravfx") {
    const vfx = extraVfx.find(v => v.id === selectedId);
    if (!vfx) return null;
    return <ExtraVFXInspector vfx={vfx} />;
  }

  return null;
}
