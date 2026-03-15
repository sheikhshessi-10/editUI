import { useState, useMemo } from "react";
import type { WhisperWord } from "../../data/types";
import { useStore } from "../../store/useStore";

interface Props {
  currentWord: WhisperWord | null;
  onPick: (word: WhisperWord) => void;
  onClose: () => void;
}

export function WordPicker({ currentWord, onPick, onClose }: Props) {
  const whisperWords = useStore(s => s.whisperWords);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return whisperWords;
    const low = filter.toLowerCase();
    return whisperWords.filter(w => w.word.toLowerCase().includes(low));
  }, [whisperWords, filter]);

  const currentIdx = currentWord
    ? whisperWords.findIndex(w => w.start === currentWord.start && w.word === currentWord.word)
    : -1;
  const contextStart = Math.max(0, currentIdx - 5);
  const contextEnd = Math.min(whisperWords.length, currentIdx + 6);
  const contextWords = currentIdx >= 0 ? whisperWords.slice(contextStart, contextEnd) : [];

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pick Word</span>
        <button onClick={onClose} className="text-[10px] text-zinc-500 hover:text-zinc-300">close</button>
      </div>

      {contextWords.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1 rounded border border-zinc-800 bg-zinc-950 p-1">
          {contextWords.map((w, i) => (
            <button
              key={`ctx-${i}`}
              onClick={() => { onPick(w); onClose(); }}
              className={`rounded px-1.5 py-0.5 text-[10px] transition ${
                w === currentWord
                  ? "bg-amber-500/30 text-amber-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {w.word}
            </button>
          ))}
        </div>
      )}

      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter words..."
        className="mb-2 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 outline-none"
        autoFocus
      />

      <div className="max-h-48 overflow-y-auto">
        {filtered.map((w, i) => (
          <button
            key={i}
            onClick={() => { onPick(w); onClose(); }}
            className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[10px] transition hover:bg-zinc-800"
          >
            <span className="font-medium text-zinc-200">{w.word}</span>
            <span className="text-zinc-600">
              {w.start.toFixed(2)}s → {w.end.toFixed(2)}s
              {w.probability != null && <span className="ml-1">{(w.probability * 100).toFixed(0)}%</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
