import { useRef } from "react";
import { Upload, Music2, X, GripVertical } from "lucide-react";
import { useAudioStore } from "../../store/useAudioStore";

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

export function AudioLibraryPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importedAudios, importAudio, removeImportedAudio, addClipToTrack, tracks } =
    useAudioStore();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      void importAudio(file);
    }
  };

  /** Click on an audio item → add to the first track at time 0 */
  const handleClickAdd = (audioId: string) => {
    const firstTrack = tracks[0];
    if (!firstTrack) return;
    const audio = importedAudios.find((a) => a.id === audioId);
    if (!audio) return;
    addClipToTrack(firstTrack.id, {
      audioId,
      startTimeS: 0,
      durationS: audio.durationS,
      srcOffsetS: 0,
      volume: 1,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Import button */}
      <div className="border-b border-zinc-800 p-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-zinc-800 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600"
        >
          <Upload size={12} />
          Import Audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Audio file list */}
      <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
        {importedAudios.length === 0 && (
          <p className="mt-6 text-center text-[10px] leading-relaxed text-zinc-600">
            No audio imported yet.
            <br />
            Click <span className="text-zinc-500">Import Audio</span> or
            <br />
            drop files in the zone below.
          </p>
        )}

        {importedAudios.map((audio) => (
          <div
            key={audio.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-audio-id", audio.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="group flex cursor-grab items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 hover:border-zinc-600 active:cursor-grabbing"
          >
            <GripVertical size={10} className="shrink-0 text-zinc-600" />
            <Music2 size={10} className="shrink-0 text-blue-400" />

            {/* Name + duration — click to add to timeline */}
            <button
              className="flex min-w-0 flex-1 flex-col items-start text-left"
              title="Click to add to Voiceover track"
              onClick={() => handleClickAdd(audio.id)}
            >
              <span className="w-full truncate text-[10px] font-medium text-zinc-300">
                {audio.name}
              </span>
              <span className="text-[9px] text-zinc-600">{fmtDur(audio.durationS)}</span>
            </button>

            {/* Remove */}
            <button
              onClick={(e) => { e.stopPropagation(); removeImportedAudio(audio.id); }}
              className="hidden shrink-0 text-zinc-600 hover:text-red-400 group-hover:block"
              title="Remove from library"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Drop zone at the bottom */}
      <div
        className="shrink-0 border-t border-zinc-800 p-2"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <p className="text-center text-[9px] text-zinc-700">Drop audio files here to import</p>
      </div>
    </div>
  );
}
