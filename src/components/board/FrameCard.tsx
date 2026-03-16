import type { Segment, WhisperWord } from "../../data/types";
import { MOLD_REGISTRY } from "../../data/moldRegistry";

// ── Layout constants (shared with BoardView) ─────────────────────────────────
export const CARD_W = 220;
export const CARD_H = 260;
export const TRANS_W = 84;
export const TRANS_H = 160;
export const GAP = 20;
export const STEP = CARD_W + GAP + TRANS_W + GAP; // 344
export const CARD_TOP = 100; // vertical offset — leaves room for whisper text above

interface FrameCardProps {
  segment: Segment;
  index: number;
  thumbnailUrl?: string;
  whisperWords: WhisperWord[];
  onClick: (segId: string) => void;
}

export function FrameCard({ segment, index, thumbnailUrl, whisperWords, onClick }: FrameCardProps) {
  const mold = MOLD_REGISTRY[segment.moldId];
  const color = mold?.color ?? "#52525b";
  const label = mold?.label ?? segment.moldId;

  const x = index * STEP;
  const y = CARD_TOP;

  // Words in this frame's time range
  const words = whisperWords
    .filter(w => w.start >= segment.startTimeS && w.start < segment.endTimeS)
    .map(w => w.word)
    .join(" ");

  const durationS = (segment.endTimeS - segment.startTimeS).toFixed(1);

  return (
    <>
      {/* Whisper text box — sits above the card */}
      <div
        style={{ position: "absolute", left: x, top: y - 95, width: CARD_W, height: 90 }}
        className="flex items-end pb-1 px-1 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[10px] leading-snug text-zinc-500 line-clamp-4">
          {words || <span className="italic text-zinc-700">no transcript</span>}
        </p>
      </div>

      {/* Frame card */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: CARD_W,
          height: CARD_H,
          borderLeftColor: color,
          borderLeftWidth: 4,
        }}
        className="rounded-xl border border-zinc-700 bg-zinc-900 cursor-pointer overflow-hidden
                   transition hover:border-zinc-500 hover:shadow-lg hover:shadow-black/40
                   flex flex-col"
        onClick={() => onClick(segment.id)}
      >
        {/* Thumbnail / color fill area */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{ background: thumbnailUrl ? undefined : `${color}18` }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="text-xs font-bold opacity-30 text-center px-3 leading-snug"
              style={{ color }}
            >
              {label}
            </span>
          )}
        </div>

        {/* Info footer */}
        <div className="px-3 py-2.5 bg-zinc-900/80 border-t border-zinc-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${color}30`, color }}
            >
              SEG {index + 1}
            </span>
            <span className="text-[10px] font-semibold text-zinc-300 truncate">{label}</span>
          </div>
          <span className="text-[9px] text-zinc-600">
            {segment.startTimeS.toFixed(1)}s → {segment.endTimeS.toFixed(1)}s · {durationS}s
          </span>
        </div>
      </div>
    </>
  );
}
