import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Segment } from "../../data/types";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { CAPTION_STYLES } from "../../data/captionRegistry";
import { useStore } from "../../store/useStore";
import { AssetSlot } from "./AssetSlot";
import { WordPicker } from "./WordPicker";
import { EmphasisWordInput } from "./EmphasisWordInput";

interface Props {
  segment: Segment;
  index: number;
}

export function SegmentInspector({ segment, index }: Props) {
  const {
    setSegmentBoundary,
    setSegmentCaptionStyle,
    setSegmentEmphasisWords,
    setSegmentTypography,
    setSegmentShowBoxLabels,
  } = useStore(useShallow(s => ({
    setSegmentBoundary: s.setSegmentBoundary,
    setSegmentCaptionStyle: s.setSegmentCaptionStyle,
    setSegmentEmphasisWords: s.setSegmentEmphasisWords,
    setSegmentTypography: s.setSegmentTypography,
    setSegmentShowBoxLabels: s.setSegmentShowBoxLabels,
  })));

  const mold = MOLD_REGISTRY[segment.moldId];
  const [pickingBoundary, setPickingBoundary] = useState<"start" | "end" | null>(null);
  const isFirst = index === 0;
  const isFixed5 = mold?.durationType === "fixed5";
  const duration = segment.endTimeS - segment.startTimeS;

  if (!mold) return <div className="p-4 text-xs text-zinc-500">Unknown mold</div>;

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: mold.color }} />
          <span className="text-sm font-bold text-zinc-200">{mold.label}</span>
          <span className="text-[10px] text-zinc-500">SEG {index + 1}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">
          Duration: {duration > 0 ? `${duration.toFixed(2)}s` : "—"}
          {isFixed5 && " (fixed 5s)"}
        </div>
      </div>

      {/* Boundaries */}
      <Section title="BOUNDARIES">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">Start word:</span>
            <button
              onClick={() => setPickingBoundary("start")}
              className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
            >
              {segment.startWord ? `"${segment.startWord.word}" (${segment.startTimeS.toFixed(2)}s)` : isFirst ? "0.00s (first)" : "Set..."}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">End word:</span>
            <button
              onClick={() => setPickingBoundary("end")}
              className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700"
            >
              {segment.endWord ? `"${segment.endWord.word}" (${segment.endTimeS.toFixed(2)}s)` : "Set..."}
            </button>
          </div>
        </div>
        {pickingBoundary && (
          <div className="mt-2">
            <WordPicker
              currentWord={pickingBoundary === "start" ? segment.startWord : segment.endWord}
              onPick={word => {
                setSegmentBoundary(segment.id, pickingBoundary, word);
              }}
              onClose={() => setPickingBoundary(null)}
            />
          </div>
        )}
      </Section>

      {/* Assets */}
      <Section title="ASSETS">
        <div className="flex flex-col gap-1.5">
          {mold.assets.map(spec => (
            <AssetSlot
              key={spec.key}
              spec={spec}
              assignedFile={segment.assets[spec.key] ?? null}
              segmentId={segment.id}
              timing={segment.assetTiming[spec.key]}
            />
          ))}
        </div>
      </Section>

      {/* Captions */}
      {mold.hasCaptions && (
        <Section title="CAPTIONS">
          <div className="flex flex-col gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] text-zinc-500">Style</label>
              <select
                value={segment.captionStyle}
                onChange={e => setSegmentCaptionStyle(segment.id, e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
              >
                {CAPTION_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-zinc-500">Emphasis Words</label>
              <EmphasisWordInput
                words={segment.emphasisWords}
                onChange={words => setSegmentEmphasisWords(segment.id, words)}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Typography */}
      {mold.hasTypography && (
        <Section title="STARTING FRAME TEXT">
          <div className="flex flex-col gap-1.5">
            <div>
              <label className="mb-0.5 block text-[10px] text-zinc-500">LINE1</label>
              <input
                value={segment.line1Text ?? ""}
                onChange={e => setSegmentTypography(segment.id, e.target.value, segment.line2Text ?? "")}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200 outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-zinc-500">LINE2</label>
              <input
                value={segment.line2Text ?? ""}
                onChange={e => setSegmentTypography(segment.id, segment.line1Text ?? "", e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-200 outline-none"
              />
            </div>
          </div>
        </Section>
      )}

      {/* ThreeBoxesFrame options */}
      {segment.moldId === "ThreeBoxesFrame" && (
        <Section title="OPTIONS">
          <label className="flex items-center gap-2 text-[10px] text-zinc-300">
            <input
              type="checkbox"
              checked={segment.showBoxLabels ?? false}
              onChange={e => setSegmentShowBoxLabels(segment.id, e.target.checked)}
              className="rounded"
            />
            Show Box Labels (MESSI? RONALDO? NEYMAR?)
          </label>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 border-b border-zinc-800 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
        {title}
      </div>
      {children}
    </div>
  );
}
