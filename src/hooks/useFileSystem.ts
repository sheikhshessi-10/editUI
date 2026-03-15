import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { parseWhisperJSON } from "../utils/whisperParser";

// Module-level handle — survives component re-renders, lost on page reload.
// This lets any hook/component resolve filenames → actual File objects.
let _projectDirHandle: FileSystemDirectoryHandle | null = null;

export async function getProjectFile(filename: string): Promise<File | null> {
  if (!_projectDirHandle) return null;
  try {
    const fh = await (_projectDirHandle as any).getFileHandle(filename);
    return await fh.getFile();
  } catch {
    return null;
  }
}

export function useFileSystem() {
  const loadProject = useStore(s => s.loadProject);

  const openProjectFolder = useCallback(async () => {
    if (!("showDirectoryPicker" in window)) {
      alert("Your browser does not support the File System Access API. Use Chrome or Edge.");
      return;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      _projectDirHandle = dirHandle;
      const files: string[] = [];
      let whisperJSON: Record<string, unknown> | null = null;

      for await (const [name, entry] of (dirHandle as any).entries()) {
        if (entry.kind === "file") {
          files.push(name);
          if (name === "whisper.json") {
            const file = await entry.getFile();
            whisperJSON = JSON.parse(await file.text());
          }
        }
      }

      const whisperWords = whisperJSON ? parseWhisperJSON(whisperJSON) : [];
      loadProject(dirHandle.name, files.sort(), whisperWords);

      if (!whisperJSON) {
        alert("No whisper.json found in folder — word timeline will be empty.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Failed to open folder:", e);
      }
    }
  }, [loadProject]);

  return { openProjectFolder };
}
