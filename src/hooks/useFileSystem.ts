import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { parseWhisperJSON } from "../utils/whisperParser";

interface FSFileEntry { kind: "file"; getFile(): Promise<File> }
interface FSDirectoryHandle {
  name: string;
  entries(): AsyncIterable<[string, FSFileEntry | { kind: string }]>;
}
type WindowWithFSA = Window & { showDirectoryPicker(): Promise<FSDirectoryHandle> };

export function useFileSystem() {
  const loadProject = useStore(s => s.loadProject);

  const openProjectFolder = useCallback(async () => {
    if (!("showDirectoryPicker" in window)) {
      alert("Your browser does not support the File System Access API. Use Chrome or Edge.");
      return;
    }

    try {
      const dirHandle = await (window as WindowWithFSA).showDirectoryPicker();
      const files: string[] = [];
      let whisperJSON: Record<string, unknown> | null = null;

      for await (const [name, entry] of dirHandle.entries()) {
        if (entry.kind === "file") {
          files.push(name);
          if (name === "whisper.json") {
            const file = await (entry as FSFileEntry).getFile();
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
