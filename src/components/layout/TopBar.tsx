import { useRef } from "react";
import { Download, FolderOpen, Save, Upload, FilePlus2, Wand2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useValidation } from "../../hooks/useValidation";

export function TopBar() {
  const {
    videoId, setVideoId, projectFolderName,
    getAssemblyJSON, exportProjectJSON, importProjectJSON, clearProject, autoAssignAssets,
    segmentCount,
  } = useStore(useShallow(s => ({
    videoId: s.videoId,
    setVideoId: s.setVideoId,
    projectFolderName: s.projectFolderName,
    getAssemblyJSON: s.getAssemblyJSON,
    exportProjectJSON: s.exportProjectJSON,
    importProjectJSON: s.importProjectJSON,
    clearProject: s.clearProject,
    autoAssignAssets: s.autoAssignAssets,
    segmentCount: s.segments.length,
  })));
  const { openProjectFolder } = useFileSystem();
  const issues = useValidation();
  const loadInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    if (issues.length > 0) return;
    const json = getAssemblyJSON();
    const text = JSON.stringify(json, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoId || "assembly"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSaveProject() {
    const json = exportProjectJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoId || "project"}.vae.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLoadProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importProjectJSON(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleNewProject() {
    if (!confirm("Start a new project? Unsaved changes will be lost.")) return;
    clearProject();
  }

  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
      <span className="text-sm font-bold tracking-wide text-zinc-100">
        Video Assembly Editor
      </span>

      <div className="h-4 w-px bg-zinc-700" />

      {/* Project actions */}
      <button
        onClick={handleNewProject}
        className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
        title="New Project"
      >
        <FilePlus2 size={13} />
        New
      </button>

      <button
        onClick={openProjectFolder}
        className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
        title="Open asset folder with whisper.json"
      >
        <FolderOpen size={14} />
        {projectFolderName || "Open Folder"}
      </button>

      <div className="h-4 w-px bg-zinc-700" />

      {/* Save / Load */}
      <button
        onClick={handleSaveProject}
        className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
        title="Save project to .json file"
      >
        <Save size={13} />
        Save
      </button>

      <button
        onClick={() => loadInputRef.current?.click()}
        className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
        title="Load project from .json file"
      >
        <Upload size={13} />
        Load
      </button>
      <input
        ref={loadInputRef}
        type="file"
        accept=".json"
        onChange={handleLoadProject}
        className="hidden"
      />

      {segmentCount > 0 && (
        <button
          onClick={autoAssignAssets}
          className="flex items-center gap-1 rounded-md bg-purple-600/20 px-2 py-1.5 text-[10px] font-medium text-purple-300 transition hover:bg-purple-600/30 hover:text-purple-200"
          title="Auto-fill matching assets across all segments"
        >
          <Wand2 size={13} />
          Auto-Assign Assets
        </button>
      )}

      <div className="h-4 w-px bg-zinc-700" />

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-zinc-500">Video ID:</label>
        <input
          value={videoId}
          onChange={e => setVideoId(e.target.value)}
          placeholder="e.g. 003-valverde"
          className="w-44 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex-1" />

      {/* Auto-save indicator */}
      <span className="text-[9px] text-zinc-600" title="State auto-saves to browser storage on every change">
        auto-saved
      </span>

      <button
        onClick={handleExport}
        disabled={issues.length > 0}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        title={issues.length > 0 ? `${issues.length} issue(s) — fix before export` : "Download assembly.json"}
      >
        <Download size={14} />
        Export assembly.json
      </button>
    </div>
  );
}
