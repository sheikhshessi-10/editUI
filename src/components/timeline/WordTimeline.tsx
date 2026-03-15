import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";

export function WordTimeline() {
  const { whisperWords, segments } = useStore(useShallow(s => ({
    whisperWords: s.whisperWords,
    segments: s.segments,
  })));

  if (whisperWords.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
        Open a project folder with whisper.json to see the word timeline
      </div>
    );
  }

  const totalDuration = whisperWords[whisperWords.length - 1]?.end ?? 30;
  const pxPerSec = 60;
  const totalWidth = totalDuration * pxPerSec;

  function getSegmentColor(timeS: number): string | null {
    for (const seg of segments) {
      if (timeS >= seg.startTimeS && timeS <= seg.endTimeS) {
        return MOLD_REGISTRY[seg.moldId]?.color ?? null;
      }
    }
    return null;
  }

  return (
    <div className="relative h-full overflow-x-auto overflow-y-hidden" style={{ width: "100%" }}>
      <div className="relative flex h-full items-center gap-px px-2" style={{ width: totalWidth, minWidth: "100%" }}>
        {whisperWords.map((w, i) => {
          const left = w.start * pxPerSec;
          const segColor = getSegmentColor(w.start);
          return (
            <div
              key={i}
              className="absolute flex items-center rounded-sm px-1 py-0.5 text-[9px] transition hover:brightness-125"
              style={{
                left,
                backgroundColor: segColor ? `${segColor}30` : "#27272a",
                color: segColor ? "#e4e4e7" : "#71717a",
                whiteSpace: "nowrap",
              }}
              title={`${w.word} (${w.start.toFixed(2)}s → ${w.end.toFixed(2)}s)`}
            >
              {w.word}
            </div>
          );
        })}
      </div>
    </div>
  );
}
