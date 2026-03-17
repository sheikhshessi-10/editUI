import { supabase, ensureAuth } from "./supabase";
import type { ImportedAudio, AudioTrack } from "../data/audioTypes";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectMeta {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  segment_count: number;
  audio_count: number;
}

export interface AudioFileRecord {
  audio_id: string;
  name: string;
  duration_s: number;
  storage_path: string;
}

export interface LoadedAudioFile {
  audioId: string;
  name: string;
  durationS: number;
  file: File;
}

export interface LoadedProject {
  stateJson: string | null;
  audioState: { importedAudios: ImportedAudio[]; tracks: AudioTrack[] } | null;
  audioFiles: LoadedAudioFile[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function storagePath(userId: string, projectId: string, audioId: string) {
  return `${userId}/${projectId}/${audioId}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureAuth();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, updated_at, segment_count, audio_count")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectMeta[];
}

export async function createProject(name = "Untitled Project"): Promise<ProjectMeta> {
  const userId = await ensureAuth();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, user_id: userId })
    .select("id, name, created_at, updated_at, segment_count, audio_count")
    .single();
  if (error) throw error;
  return data as ProjectMeta;
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw error;
}

export async function deleteProject(projectId: string): Promise<void> {
  await ensureAuth();
  // Delete storage objects for this project
  const { data: files } = await supabase
    .from("project_audio_files")
    .select("storage_path")
    .eq("project_id", projectId);
  if (files && files.length > 0) {
    const paths = files.map((f: { storage_path: string }) => f.storage_path);
    await supabase.storage.from("audio-files").remove(paths);
  }
  // Delete project row (cascades to audio_files rows)
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw error;
}

export async function saveProject(
  projectId: string,
  stateJson: string,
  audioState: { importedAudios: ImportedAudio[]; tracks: AudioTrack[] },
  pendingFiles: Map<string, File>   // audioId → File, only NEW files not yet uploaded
): Promise<void> {
  const userId = await ensureAuth();
  const parsed       = (() => { try { return JSON.parse(stateJson); } catch { return {}; } })();
  const segmentCount = (parsed.segments ?? []).length;
  const audioCount   = audioState.importedAudios.length;
  // Use the video ID as the project display name (fallback to "Untitled Project")
  const projectName  = (parsed.videoId as string | undefined)?.trim() || "Untitled Project";

  // Upload any pending audio files
  for (const [audioId, file] of pendingFiles.entries()) {
    const path = storagePath(userId, projectId, audioId);
    const { error: uploadErr } = await supabase.storage
      .from("audio-files")
      .upload(path, file, { upsert: true });
    if (uploadErr) { console.error("Audio upload failed:", uploadErr); continue; }

    const { error: rowErr } = await supabase
      .from("project_audio_files")
      .upsert({
        audio_id: audioId,
        project_id: projectId,
        user_id: userId,
        name: file.name,
        duration_s: audioState.importedAudios.find(a => a.id === audioId)?.durationS ?? 0,
        storage_path: path,
      }, { onConflict: "audio_id,project_id" });
    if (rowErr) console.error("Audio row insert failed:", rowErr);
  }

  // Upsert project state (also keep the display name in sync with the video ID)
  const { error } = await supabase
    .from("projects")
    .update({
      name:          projectName,
      state_json:    parsed,
      audio_state:   audioState,
      segment_count: segmentCount,
      audio_count:   audioCount,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) throw error;
}

export async function loadProject(projectId: string): Promise<LoadedProject> {
  await ensureAuth();

  // Fetch project row
  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select("state_json, audio_state")
    .eq("id", projectId)
    .single();
  if (projErr) throw projErr;

  // Only treat as valid if it has _version (our format marker).
  // A brand-new project has state_json = {} (the DB default) — treat that as null.
  const raw = proj.state_json as Record<string, unknown> | null;
  const stateJson = (raw && "_version" in raw) ? JSON.stringify(raw) : null;

  // Same check for audio_state — new projects have audio_state = {}
  const rawAudio = proj.audio_state as Record<string, unknown> | null;
  const audioState = (rawAudio && "importedAudios" in rawAudio)
    ? (rawAudio as LoadedProject["audioState"])
    : null;

  // Fetch audio file records
  const { data: audioRows, error: audioErr } = await supabase
    .from("project_audio_files")
    .select("audio_id, name, duration_s, storage_path")
    .eq("project_id", projectId);
  if (audioErr) throw audioErr;

  // Download each audio file blob
  const audioFiles: LoadedAudioFile[] = [];
  for (const row of (audioRows ?? []) as AudioFileRecord[]) {
    const { data: blob, error: dlErr } = await supabase.storage
      .from("audio-files")
      .download(row.storage_path);
    if (dlErr || !blob) { console.error("Failed to download audio:", dlErr); continue; }
    const file = new File([blob], row.name, { type: blob.type || "audio/mpeg" });
    audioFiles.push({ audioId: row.audio_id, name: row.name, durationS: row.duration_s, file });
  }

  return { stateJson, audioState, audioFiles };
}

// ── Frame thumbnails ──────────────────────────────────────────────────────────

export async function uploadFrameThumbnail(
  projectId: string,
  segId: string,
  file: File,
): Promise<string> {
  const userId = await ensureAuth();
  const path = `${userId}/${projectId}/thumbs/${segId}`;
  const { error } = await supabase.storage
    .from("audio-files")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function getFrameThumbnailUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("audio-files")
    .createSignedUrl(path, 3600); // 1-hour signed URL
  if (error) throw error;
  return data.signedUrl;
}
