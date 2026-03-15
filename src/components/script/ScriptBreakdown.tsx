import { useState } from "react";
import { ChevronRight, ChevronLeft, ChevronsRight, Plus, ChevronDown } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY, MOLD_GROUPS } from "../../data/moldRegistry";
import { MoldSwapPicker } from "../shared/MoldSwapPicker";
import type { Segment, WhisperWord } from "../../data/types";

function getWordsInRange(words: WhisperWord[], startS: number, endS: number): WhisperWord[] {
  return words.filter(w => w.start >= startS - 0.01 && w.end <= endS + 0.01);
}

function findOwnerSegment(segments: Segment[], word: WhisperWord): string | null {
  for (const seg of segments) {
    if (word.start >= seg.startTimeS - 0.01 && word.end <= seg.endTimeS + 0.01) return seg.id;
  }
  return null;
}

export function ScriptBreakdown() {
  const {
    segments, whisperWords, selectedId, selectedType,
    select, setSegmentBoundary, addSegment, swapSegmentMold,
  } = useStore(useShallow(s => ({
    segments: s.segments,
    whisperWords: s.whisperWords,
    selectedId: s.selectedId,
    selectedType: s.selectedType,
    select: s.select,
    setSegmentBoundary: s.setSegmentBoundary,
    addSegment: s.addSegment,
    swapSegmentMold: s.swapSegmentMold,
  })));

  const [insertMenuAt, setInsertMenuAt] = useState<number | null>(null);
  const [swapPicker, setSwapPicker] = useState<{ segId: string; moldId: string; x: number; y: number } | null>(null);

  if (whisperWords.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
        Open a project folder with whisper.json to see the script
      </div>
    );
  }

  const activeSegId = selectedType === "segment" ? selectedId : null;

  function handleWordClick(word: WhisperWord, _wordIndex: number) {
    if (!activeSegId) return;
    const seg = segments.find(s => s.id === activeSegId);
    if (!seg) return;

    if (word.end > seg.startTimeS) {
      setSegmentBoundary(activeSegId, "end", word);
    }
  }

  function extendByWords(segId: string, count: number) {
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;
    const segWords = getWordsInRange(whisperWords, seg.startTimeS, seg.endTimeS);

    if (count > 0) {
      const lastWordEnd = seg.endTimeS;
      const wordsAfter = whisperWords.filter(w => w.start >= lastWordEnd - 0.01 && !segWords.some(sw => sw.start === w.start));
      const target = wordsAfter[count - 1];
      if (target) setSegmentBoundary(segId, "end", target);
    } else {
      if (segWords.length <= 1) return;
      const targetIdx = Math.max(0, segWords.length + count - 1);
      const target = segWords[targetIdx];
      if (target) setSegmentBoundary(segId, "end", target);
    }
  }

  function grabAllRemaining(segId: string) {
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;
    const segIdx = segments.indexOf(seg);
    const nextSeg = segments[segIdx + 1];
    const boundary = nextSeg ? nextSeg.startTimeS : Infinity;
    const wordsAvailable = whisperWords.filter(w => w.start >= seg.startTimeS - 0.01 && w.start < boundary);
    const lastWord = wordsAvailable[wordsAvailable.length - 1];
    if (lastWord) setSegmentBoundary(segId, "end", lastWord);
  }

  const segmentTexts = segments.map(seg => {
    const words = getWordsInRange(whisperWords, seg.startTimeS, seg.endTimeS);
    return { seg, words, mold: MOLD_REGISTRY[seg.moldId] };
  });

  const assignedEnd = segments.length > 0 ? segments[segments.length - 1].endTimeS : 0;
  const unassigned = whisperWords.filter(w => w.start >= assignedEnd - 0.01);

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left: Interactive word map */}
      <div className="flex w-1/2 flex-col border-r border-zinc-800">
        <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Script</span>
          <span className="ml-2 text-[10px] text-zinc-600">{whisperWords.length} words</span>
          {activeSegId && (
            <span className="ml-2 text-[10px] text-emerald-500">Click a word to set segment end</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-wrap gap-[3px]">
            {whisperWords.map((w, i) => {
              const ownerSegId = findOwnerSegment(segments, w);
              const ownerSeg = ownerSegId ? segments.find(s => s.id === ownerSegId) : null;
              const mold = ownerSeg ? MOLD_REGISTRY[ownerSeg.moldId] : null;
              const isActive = ownerSegId === activeSegId;
              const isClickable = !!activeSegId;

              const bgColor = mold ? `${mold.color}30` : "transparent";
              const textColor = mold ? mold.color : "#71717a";
              const borderColor = isActive ? mold?.color ?? "#fff" : "transparent";

              return (
                <span
                  key={i}
                  onClick={() => handleWordClick(w, i)}
                  className={`inline-block rounded-[3px] px-[4px] py-[1px] text-[10px] leading-snug transition-all ${
                    isClickable ? "cursor-pointer hover:brightness-150 hover:ring-1 hover:ring-white/30" : ""
                  }`}
                  style={{
                    background: bgColor,
                    color: textColor,
                    borderBottom: `2px solid ${borderColor}`,
                  }}
                  title={`${w.word} (${w.start.toFixed(2)}s → ${w.end.toFixed(2)}s)${ownerSeg ? ` — ${mold?.label}` : " — unassigned"}`}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Editable frame breakdown */}
      <div className="flex w-1/2 flex-col">
        <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Frame Breakdown</span>
          <span className="ml-2 text-[10px] text-zinc-600">{segments.length} segments</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {segments.length === 0 ? (
            <p className="p-2 text-[11px] italic text-zinc-600">Add segments to see the script breakdown</p>
          ) : (
            <div className="flex flex-col gap-0">
              {segmentTexts.map(({ seg, words, mold }, i) => {
                const isSelected = activeSegId === seg.id;
                const moldColor = mold?.color ?? "#666";
                const hasNextWords = (() => {
                  const nextSeg = segments[i + 1];
                  const boundary = nextSeg ? nextSeg.startTimeS : Infinity;
                  return whisperWords.some(w => w.start >= seg.endTimeS - 0.01 && w.start < boundary && !words.some(sw => sw.start === w.start));
                })();

                return (
                  <div key={seg.id}>
                    {/* Segment block */}
                    <div
                      onClick={() => select("segment", seg.id)}
                      className={`cursor-pointer rounded-md border-l-[3px] p-2 transition ${
                        isSelected ? "ring-1 ring-white/30" : "hover:brightness-110"
                      }`}
                      style={{ borderLeftColor: moldColor, background: `${moldColor}${isSelected ? "20" : "10"}` }}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ background: `${moldColor}30`, color: moldColor }}>
                          SEG {i + 1}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSwapPicker({ segId: seg.id, moldId: seg.moldId, x: e.clientX, y: e.clientY }); }}
                          className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium transition hover:bg-white/10"
                          style={{ color: moldColor }}
                          title="Click to change frame"
                        >
                          {mold?.label ?? seg.moldId}
                          <ChevronDown size={9} className="text-zinc-500" />
                        </button>
                        <span className="text-[9px] tabular-nums text-zinc-600">
                          {seg.startTimeS.toFixed(1)}s → {seg.endTimeS.toFixed(1)}s
                        </span>
                        <span className="text-[9px] text-zinc-600">({words.length} words)</span>
                      </div>

                      {words.length > 0 ? (
                        <p className="text-[10px] leading-relaxed text-zinc-400">
                          {words.map((w, wi) => (
                            <span key={wi}>{w.word}{wi < words.length - 1 ? " " : ""}</span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-[10px] italic text-zinc-600">
                          {seg.endTimeS <= seg.startTimeS ? "Click + to grab words" : "No words in this range"}
                        </p>
                      )}

                      {isSelected && (
                        <div className="mt-1.5 flex items-center gap-1 border-t border-zinc-800/50 pt-1.5">
                          <button
                            onClick={e => { e.stopPropagation(); extendByWords(seg.id, -1); }}
                            disabled={words.length <= 0}
                            className="flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
                          >
                            <ChevronLeft size={10} /> word
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); extendByWords(seg.id, 1); }}
                            disabled={!hasNextWords}
                            className="flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
                          >
                            word <ChevronRight size={10} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); extendByWords(seg.id, 5); }}
                            disabled={!hasNextWords}
                            className="flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
                          >
                            +5 <ChevronRight size={10} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); grabAllRemaining(seg.id); }}
                            disabled={!hasNextWords}
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] transition hover:text-zinc-200 disabled:opacity-30"
                            style={{ background: `${moldColor}25`, color: moldColor }}
                          >
                            All <ChevronsRight size={10} />
                          </button>
                          <div className="flex-1" />
                          {seg.endWord && (
                            <span className="text-[8px] tabular-nums text-zinc-600">
                              ends: "{seg.endWord.word}" @ {seg.endTimeS.toFixed(2)}s
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Insert + button between this segment and the next */}
                    <InsertButton
                      insertIndex={i + 1}
                      isOpen={insertMenuAt === i + 1}
                      onToggle={() => setInsertMenuAt(insertMenuAt === i + 1 ? null : i + 1)}
                      onPickMold={(moldId) => { addSegment(moldId, i + 1); setInsertMenuAt(null); }}
                    />
                  </div>
                );
              })}

              {/* Insert + at the very end if no segments yet */}
              {segments.length === 0 && (
                <InsertButton
                  insertIndex={0}
                  isOpen={insertMenuAt === 0}
                  onToggle={() => setInsertMenuAt(insertMenuAt === 0 ? null : 0)}
                  onPickMold={(moldId) => { addSegment(moldId, 0); setInsertMenuAt(null); }}
                />
              )}

              {/* Unassigned words */}
              {unassigned.length > 0 && (
                <div className="rounded-md border-l-[3px] border-zinc-600 bg-zinc-900/50 p-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-zinc-700 px-1 py-0.5 text-[9px] font-bold text-zinc-400">UNASSIGNED</span>
                    <span className="text-[9px] tabular-nums text-zinc-600">{assignedEnd.toFixed(1)}s → end</span>
                    <span className="text-[9px] text-zinc-600">({unassigned.length} words)</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    {unassigned.map(w => w.word).join(" ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {swapPicker && (
        <MoldSwapPicker
          currentMoldId={swapPicker.moldId}
          position={{ x: swapPicker.x, y: swapPicker.y }}
          onPick={(newMoldId) => {
            swapSegmentMold(swapPicker.segId, newMoldId);
            setSwapPicker(null);
          }}
          onClose={() => setSwapPicker(null)}
        />
      )}
    </div>
  );
}

/* ─── Insert Button + Mold Picker ───────────────────────────────── */

function InsertButton({ isOpen, onToggle, onPickMold }: {
  insertIndex?: number;
  isOpen: boolean;
  onToggle: () => void;
  onPickMold: (moldId: string) => void;
}) {
  const allMolds = Object.values(MOLD_REGISTRY);

  return (
    <div className="relative my-[2px] flex flex-col items-center">
      {/* The + line */}
      <button
        onClick={onToggle}
        className={`group flex w-full items-center gap-0 transition ${isOpen ? "" : "opacity-0 hover:opacity-100"}`}
      >
        <div className="h-px flex-1 bg-zinc-700 transition group-hover:bg-emerald-500/60" />
        <div className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition ${
          isOpen
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
            : "border-zinc-700 bg-zinc-800 text-zinc-500 group-hover:border-emerald-500 group-hover:text-emerald-400"
        }`}>
          <Plus size={11} />
        </div>
        <div className="h-px flex-1 bg-zinc-700 transition group-hover:bg-emerald-500/60" />
      </button>

      {/* Mold picker dropdown */}
      {isOpen && (
        <div className="z-30 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1">Pick a frame</div>
          {MOLD_GROUPS.map(group => {
            const molds = allMolds.filter(m => m.group === group.key);
            if (molds.length === 0) return null;
            return (
              <div key={group.key} className="mb-1">
                <div className="px-1 text-[8px] uppercase tracking-wider text-zinc-600">{group.label}</div>
                <div className="flex flex-wrap gap-[3px] mt-0.5">
                  {molds.map(m => (
                    <button
                      key={m.id}
                      onClick={() => onPickMold(m.id)}
                      className="flex items-center gap-1 rounded border px-1.5 py-[3px] text-[9px] font-medium transition hover:brightness-125"
                      style={{
                        borderColor: `${m.color}50`,
                        background: `${m.color}15`,
                        color: m.color,
                      }}
                    >
                      <div className="h-[6px] w-[6px] rounded-sm" style={{ background: m.color }} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
