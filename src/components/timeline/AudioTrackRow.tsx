import { Music, Volume2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";

export function AudioTrackRow() {
  const { audio, setAudio, availableFiles } = useStore(useShallow(s => ({
    audio: s.audio,
    setAudio: s.setAudio,
    availableFiles: s.availableFiles,
  })));

  const audioFiles = availableFiles.filter(f =>
    f.endsWith(".mp3") || f.endsWith(".wav") || f.endsWith(".ogg")
  );

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        <Music size={12} /> Audio
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 text-[10px] text-zinc-500">Voiceover</span>
        <select
          value={audio.voiceoverFile ?? ""}
          onChange={e => setAudio({ voiceoverFile: e.target.value || null })}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
        >
          <option value="">— select file —</option>
          {audioFiles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Volume2 size={10} className="text-zinc-500" />
          <span className="text-[10px] text-zinc-500">BG Music:</span>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={audio.bgMusicVolume}
            onChange={e => setAudio({ bgMusicVolume: parseFloat(e.target.value) || 0 })}
            className="w-14 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-300 outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-500">Woosh:</span>
          <input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={audio.wooshVolume}
            onChange={e => setAudio({ wooshVolume: parseFloat(e.target.value) || 0 })}
            className="w-14 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-300 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
