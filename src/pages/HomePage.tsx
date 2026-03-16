import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Film, Loader2 } from "lucide-react";
import { ensureAuth } from "../lib/supabase";
import {
  listProjects,
  createProject,
  deleteProject,
  renameProject,
  type ProjectMeta,
} from "../lib/projectService";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        await ensureAuth();
        const list = await listProjects();
        if (alive) setProjects(list);
      } catch (e: any) {
        if (alive) setError(e.message ?? "Failed to load projects");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingId) {
      setTimeout(() => renameInputRef.current?.select(), 30);
    }
  }, [editingId]);

  async function handleNew() {
    setCreating(true);
    try {
      const proj = await createProject("Untitled Project");
      navigate(`/project/${proj.id}`);
    } catch (e: any) {
      setError(e.message ?? "Failed to create project");
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, proj: ProjectMeta) {
    e.stopPropagation();
    if (!confirm(`Delete "${proj.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(proj.id);
      setProjects((prev) => prev.filter((p) => p.id !== proj.id));
    } catch (e: any) {
      setError(e.message ?? "Failed to delete project");
    }
  }

  function startRename(e: React.MouseEvent, proj: ProjectMeta) {
    e.stopPropagation();
    setEditingId(proj.id);
    setEditingName(proj.name);
  }

  async function commitRename(proj: ProjectMeta) {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== proj.name) {
      try {
        await renameProject(proj.id, trimmed);
        setProjects((prev) =>
          prev.map((p) => (p.id === proj.id ? { ...p, name: trimmed } : p))
        );
      } catch (e: any) {
        setError(e.message ?? "Failed to rename project");
      }
    }
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Film size={18} className="text-emerald-400" />
          <span className="text-sm font-bold tracking-wide text-zinc-100">
            Video Assembly Editor
          </span>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          New Project
        </button>
      </header>

      {/* Body */}
      <main className="px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-400 underline text-xs"
            >
              dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading projects…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Film size={40} className="text-zinc-700" />
            <p className="text-sm text-zinc-500">No projects yet.</p>
            <button
              onClick={handleNew}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-60"
            >
              <Plus size={14} />
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {projects.map((proj) => (
              <ProjectCard
                key={proj.id}
                proj={proj}
                isEditing={editingId === proj.id}
                editingName={editingName}
                renameInputRef={editingId === proj.id ? renameInputRef : null}
                onEditNameChange={setEditingName}
                onClick={() => navigate(`/project/${proj.id}`)}
                onDoubleClickName={(e) => startRename(e, proj)}
                onRenameKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(proj);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onRenameBlur={() => commitRename(proj)}
                onDelete={(e) => handleDelete(e, proj)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

interface CardProps {
  proj: ProjectMeta;
  isEditing: boolean;
  editingName: string;
  renameInputRef: React.RefObject<HTMLInputElement> | null;
  onEditNameChange: (v: string) => void;
  onClick: () => void;
  onDoubleClickName: (e: React.MouseEvent) => void;
  onRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRenameBlur: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ProjectCard({
  proj,
  isEditing,
  editingName,
  renameInputRef,
  onEditNameChange,
  onClick,
  onDoubleClickName,
  onRenameKeyDown,
  onRenameBlur,
  onDelete,
}: CardProps) {
  return (
    <div
      onClick={isEditing ? undefined : onClick}
      className="group relative flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 cursor-pointer transition hover:border-zinc-600 hover:bg-zinc-800/80"
    >
      {/* Thumbnail placeholder */}
      <div className="flex h-20 items-center justify-center rounded-lg bg-zinc-800 group-hover:bg-zinc-700/60 transition">
        <Film size={24} className="text-zinc-600" />
      </div>

      {/* Name */}
      {isEditing ? (
        <input
          ref={renameInputRef}
          value={editingName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={onRenameKeyDown}
          onBlur={onRenameBlur}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-100 outline-none focus:border-emerald-500"
          maxLength={80}
        />
      ) : (
        <p
          onDoubleClick={onDoubleClickName}
          className="truncate text-xs font-medium text-zinc-200 leading-snug"
          title={`${proj.name} — double-click to rename`}
        >
          {proj.name}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span>{proj.segment_count} seg{proj.segment_count !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{proj.audio_count} ♪</span>
        <span>·</span>
        <span>{timeAgo(proj.updated_at)}</span>
      </div>

      {/* Delete button — appears on hover */}
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 hidden rounded-md p-1 text-zinc-600 transition hover:bg-zinc-700 hover:text-red-400 group-hover:flex"
        title="Delete project"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
