import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { BoardView } from "../components/board/BoardView";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../store/useStore";
import { useAudioStore, getPendingFiles, markUploaded } from "../store/useAudioStore";
import { audioEngine } from "../components/audio/AudioEngine";
import { MOLD_REGISTRY } from "../data/moldRegistry";
import { AppLayout } from "../components/layout/AppLayout";
import { TopBar } from "../components/layout/TopBar";
import { StatusBar } from "../components/layout/StatusBar";
import { MediaLibraryPanel } from "../components/layout/MediaLibraryPanel";
import { NLETimeline } from "../components/timeline/NLETimeline";
import { ScriptBreakdown } from "../components/script/ScriptBreakdown";
import { InspectorPanel } from "../components/inspector/InspectorPanel";
import { ensureAuth } from "../lib/supabase";
import { loadProject, saveProject } from "../lib/projectService";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 2000;

export function EditorPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loadingState, setLoadingState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [viewMode, setViewMode] = useState<"timeline" | "board">("timeline");

  // ── Zustand actions (stable references — no shallow needed) ──────────────
  const importProjectJSON = useStore((s) => s.importProjectJSON);
  const clearProject      = useStore((s) => s.clearProject);
  const exportProjectJSON = useStore((s) => s.exportProjectJSON);
  const addSegment        = useStore((s) => s.addSegment);

  const loadAudioState  = useAudioStore((s) => s.loadAudioState);
  const resetAudioState = useAudioStore((s) => s.resetAudioState);

  // ── DnD ──────────────────────────────────────────────────────────────────
  const [activeDragMold, setActiveDragMold] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Load project on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) { navigate("/"); return; }

    let alive = true;
    async function load() {
      try {
        await ensureAuth();
        clearProject();
        resetAudioState();

        const { stateJson, audioState, audioFiles } = await loadProject(projectId!);

        if (!alive) return;

        if (stateJson) importProjectJSON(stateJson);

        // Restore audio files into engine with their original IDs
        for (const af of audioFiles) {
          await audioEngine.importFile(af.file, af.audioId);
          markUploaded(af.audioId); // already in Supabase — don't re-upload
        }

        if (audioState) loadAudioState(audioState);

        if (alive) setLoadingState("ready");
      } catch (e: any) {
        if (alive) {
          setLoadError(e.message ?? "Failed to load project");
          setLoadingState("error");
        }
      }
    }

    load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Auto-save ────────────────────────────────────────────────────────────

  // useShallow prevents new object/array references from triggering re-renders
  // when the actual data hasn't changed — fixes the infinite loop.
  const storeState = useStore(
    useShallow((s) => ({
      projectFolderName: s.projectFolderName,
      videoId:           s.videoId,
      whisperWords:      s.whisperWords,
      availableFiles:    s.availableFiles,
      segments:          s.segments,
      transitions:       s.transitions,
      extraVfx:          s.extraVfx,
      audio:             s.audio,
    }))
  );

  const audioImportedAudios = useAudioStore(useShallow((s) => s.importedAudios));
  const audioTracks         = useAudioStore(useShallow((s) => s.tracks));

  // Keep latest values in refs so triggerSave doesn't need them as dependencies
  const exportProjectJSONRef = useRef(exportProjectJSON);
  exportProjectJSONRef.current = exportProjectJSON;

  const audioStateRef = useRef({ importedAudios: audioImportedAudios, tracks: audioTracks });
  audioStateRef.current = { importedAudios: audioImportedAudios, tracks: audioTracks };

  const loadingStateRef = useRef(loadingState);
  loadingStateRef.current = loadingState;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef  = useRef(false);

  // triggerSave only depends on projectId — all other values read via refs
  const triggerSave = useCallback(() => {
    if (!projectId || loadingStateRef.current !== "ready") return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus("saving");

      try {
        const stateJson       = exportProjectJSONRef.current();
        const currentAudioState = audioStateRef.current;
        const pendingFiles    = getPendingFiles();

        await saveProject(projectId, stateJson, currentAudioState, pendingFiles);

        for (const audioId of pendingFiles.keys()) {
          markUploaded(audioId);
        }

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
      } catch (e: any) {
        console.error("Auto-save failed:", e);
        setSaveStatus("error");
      } finally {
        isSavingRef.current = false;
      }
    }, AUTOSAVE_DELAY_MS);
  }, [projectId]); // ← stable: only re-creates when projectId changes

  // Watch state changes → trigger debounced save
  useEffect(() => {
    triggerSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [storeState, audioImportedAudios, audioTracks, triggerSave]);

  // ── Drag and drop ────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "mold") setActiveDragMold(data.moldId);
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

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 gap-3 text-zinc-500">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading project…</span>
      </div>
    );
  }

  if (loadingState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 gap-4">
        <p className="text-sm text-red-400">{loadError ?? "Failed to load project"}</p>
        <button
          onClick={() => navigate("/")}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
        >
          ← Back to projects
        </button>
      </div>
    );
  }

  // ── Board view ───────────────────────────────────────────────────────────
  if (viewMode === "board") {
    return (
      <div className="flex flex-col h-screen bg-zinc-950">
        <TopBar
          projectId={projectId}
          saveStatus={saveStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <BoardView projectId={projectId!} />
      </div>
    );
  }

  // ── Timeline view (default) ───────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <AppLayout
        topBar={
          <TopBar
            projectId={projectId}
            saveStatus={saveStatus}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        }
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
