import { useRef } from 'react';
import { Music, Upload, Trash2, Headphones, GripVertical, Clock } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';

function fmtDur(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AudioLibraryPanel() {
  const { importedAudios, importAudio, removeImportedAudio } = useAudioStore();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (/\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)) {
        await importAudio(file);
      }
    }
  }

  function handleDragStart(e: React.DragEvent, audioId: string) {
    e.dataTransfer.setData('application/audio-id', audioId);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Headphones size={12} className="text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Audio Library
            </span>
            {importedAudios.length > 0 && (
              <span className="rounded bg-zinc-800 px-1 text-[8px] text-zinc-500">
                {importedAudios.length}
              </span>
            )}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 rounded bg-blue-600/20 px-2 py-0.5 text-[9px] font-medium text-blue-400 transition hover:bg-blue-600/40 hover:text-blue-300"
          >
            <Upload size={9} />
            Import
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.aac,.m4a,.flac"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Hint */}
      {importedAudios.length > 0 && (
        <div className="border-b border-zinc-800/60 bg-zinc-950/40 px-3 py-1">
          <p className="text-[8px] text-zinc-600">Drag clips onto the timeline audio tracks</p>
        </div>
      )}

      {/* File list */}
      <div
        className="flex-1 overflow-y-auto p-1.5"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {importedAudios.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2.5 px-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
              <Music size={20} className="text-zinc-700" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500">No audio imported</p>
              <p className="mt-0.5 text-[9px] text-zinc-700">MP3 · WAV · OGG · AAC · M4A</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[9px] font-medium text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
            >
              Browse files…
            </button>
            <p className="text-[8px] text-zinc-700">or drop files here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {importedAudios.map(audio => (
              <div
                key={audio.id}
                draggable
                onDragStart={e => handleDragStart(e, audio.id)}
                className="group flex cursor-grab items-center gap-1.5 rounded-[4px] border border-transparent bg-zinc-900/60 px-1.5 py-1.5 transition hover:border-zinc-700 hover:bg-zinc-800/80 active:cursor-grabbing"
              >
                {/* Drag handle */}
                <GripVertical size={10} className="shrink-0 text-zinc-700 group-hover:text-zinc-500" />

                {/* Icon */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-500/15 ring-1 ring-blue-500/20">
                  <Music size={10} className="text-blue-400" />
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className="truncate text-[9px] font-medium text-zinc-300"
                    title={audio.name}
                  >
                    {audio.name.replace(/\.[^.]+$/, '')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock size={7} className="text-zinc-600" />
                    <span className="text-[8px] tabular-nums text-zinc-600">{fmtDur(audio.duration)}</span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeImportedAudio(audio.id)}
                  className="shrink-0 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  title="Remove from library"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import more */}
      {importedAudios.length > 0 && (
        <div
          className="border-t border-zinc-800 p-2"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-zinc-800 py-1.5 text-[9px] text-zinc-600 transition hover:border-zinc-700 hover:text-zinc-500"
          >
            <Upload size={9} />
            Import more files…
          </button>
        </div>
      )}
    </div>
  );
}
