import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { useStore } from "./store/useStore";
import { MOLD_REGISTRY } from "./data/moldRegistry";
import { AppLayout } from "./components/layout/AppLayout";
import { TopBar } from "./components/layout/TopBar";
import { StatusBar } from "./components/layout/StatusBar";
import { MediaLibraryPanel } from "./components/layout/MediaLibraryPanel";
import { NLETimeline } from "./components/timeline/NLETimeline";
import { ScriptBreakdown } from "./components/script/ScriptBreakdown";
import { InspectorPanel } from "./components/inspector/InspectorPanel";

export default function App() {
  const addSegment = useStore(s => s.addSegment);

  const [activeDragMold, setActiveDragMold] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "mold") {
      setActiveDragMold(data.moldId);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragMold(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    if (activeData?.type === "mold" && over.id === "timeline-drop") {
      addSegment(activeData.moldId);
    }
  }

  const dragMold = activeDragMold ? MOLD_REGISTRY[activeDragMold] : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <AppLayout
        topBar={<TopBar />}
        moldLibrary={<MediaLibraryPanel />}
        nleTimeline={<NLETimeline />}
        scriptBreakdown={<ScriptBreakdown />}
        inspector={<InspectorPanel />}
        statusBar={<StatusBar />}
      />
      <DragOverlay>
        {dragMold && (
          <div
            className="flex items-center gap-2 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 shadow-2xl"
            style={{ borderLeftColor: dragMold.color, borderLeftWidth: 4 }}
          >
            <span className="text-xs font-bold text-zinc-200">{dragMold.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
