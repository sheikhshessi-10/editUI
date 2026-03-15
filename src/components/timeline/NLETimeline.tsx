import { useRef, useState, useCallback, useId, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useShallow } from "zustand/react/shallow";
import { X, ZoomIn, ZoomOut, Sparkles, Volume2, Music, Zap, ChevronDown, Play, Pause, SkipBack } from "lucide-react";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { EXTRA_VFX_OPTIONS } from "../../data/transitionRegistry";
import { MoldSwapPicker } from "../shared/MoldSwapPicker";
import { useVoiceoverPlayer } from "../../hooks/useVoiceoverPlayer";
import type { Segment, Transition, ExtraVFX, WhisperWord } from "../../data/types";

const RULER_H = 26;
const V_TRACK_H = 56;
const T_TRACK_H = 32;
const A_TRACK_H = 36;
const FX_TRACK_H = 32;
const LABEL_W = 84;
const MIN_PPS = 30;
const MAX_PPS = 300;

/** Total height of all scrollable track rows — used for the playhead line height. */
const TRACKS_H = RULER_H + V_TRACK_H + T_TRACK_H + A_TRACK_H + FX_TRACK_H;

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

function wordAtTime(words: WhisperWord[], t: number, edge: "start" | "end"): WhisperWord | null {
  if (!words.length) return null;
  let best = words[0];
  let bestD = Math.abs((edge === "start" ? best.start : best.end) - t);
  for (const w of words) {
    const d = Math.abs((edge === "start" ? w.start : w.end) - t);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

export function NLETimeline() {
  const {
    segments, transitions, extraVfx, audio, whisperWords, selectedId,
    select, removeSegment, resizeSegmentEnd, swapSegmentMold, addExtraVFX, removeExtraVFX,
    setAudio, availableFiles,
  } = useStore(useShallow(s => ({
    segments: s.segments,
    transitions: s.transitions,
    extraVfx: s.extraVfx,
    audio: s.audio,
    whisperWords: s.whisperWords,
    selectedId: s.selectedId,
    select: s.select,
    removeSegment: s.removeSegment,
    resizeSegmentEnd: s.resizeSegmentEnd,
    swapSegmentMold: s.swapSegmentMold,
    addExtraVFX: s.addExtraVFX,
    removeExtraVFX: s.removeExtraVFX,
    setAudio: s.setAudio,
    availableFiles: s.availableFiles,
  })));

  const [pps, setPps] = useState(80);
  const [resize, setResize] = useState<{ segId: string; origEnd: number; startX: number } | null>(null);
  const [previewEnd, setPreviewEnd] = useState<number | null>(null);
  const [swapPicker, setSwapPicker] = useState<{ segId: string; moldId: string; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: "timeline-drop" });

  // ── Voiceover playback ──────────────────────────────────────────
  const { isPlaying, currentTimeS, durationS, isReady, play, pause, seek, skipToStart, loadFromFile } = useVoiceoverPlayer();
  const fileInputId = useId();
  const playheadX = currentTimeS * pps;

  // Click on ruler to seek
  const handleRulerSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isReady) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
    seek(Math.max(0, x / pps));
  }, [isReady, pps, seek]);

  // ── Timeline ─────────────────────────────────────────────────────
  const lastEnd = segments.length > 0 ? segments[segments.length - 1].endTimeS : 0;
  const totalDuration = Math.max(lastEnd + 5, 30);
  const totalWidth = totalDuration * pps;

  const onPointerDownResize = useCallback((e: RPointerEvent, segId: string, origEnd: number) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setResize({ segId, origEnd, startX: e.clientX });
  }, []);

  const onPointerMoveGlobal = useCallback((e: RPointerEvent) => {
    if (!resize) return;
    const dx = e.clientX - resize.startX;
    const newEnd = Math.max(0.1, resize.origEnd + dx / pps);
    setPreviewEnd(newEnd);
  }, [resize, pps]);

  const onPointerUpGlobal = useCallback(() => {
    if (resize && previewEnd !== null) {
      resizeSegmentEnd(resize.segId, previewEnd);
    }
    setResize(null);
    setPreviewEnd(null);
  }, [resize, previewEnd, resizeSegmentEnd]);

  const audioFiles = availableFiles.filter(f => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f));

  return (
    <div
      className="flex h-full flex-col select-none"
      onPointerMove={onPointerMoveGlobal}
      onPointerUp={onPointerUpGlobal}
    >
      {/* ── Top toolbar: zoom + transport ───────────────────────── */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2 py-1">
        {/* Zoom */}
        <button
          onClick={() => setPps(p => Math.max(MIN_PPS, p - 10))}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] text-zinc-500 tabular-nums">{pps}px/s</span>
        <button
          onClick={() => setPps(p => Math.min(MAX_PPS, p + 10))}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ZoomIn size={14} />
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-700" />

        {/* Transport controls — only shown when a voiceover file is selected */}
        {audio.voiceoverFile ? (
          <>
            {/* Skip to start */}
            <button
              onClick={skipToStart}
              title="Skip to start"
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!isReady}
            >
              <SkipBack size={14} />
            </button>

            {/* Play / Pause */}
            <button
              onClick={isPlaying ? pause : play}
              title={isPlaying ? "Pause" : "Play voiceover"}
              className="flex items-center justify-center rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!isReady}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>

            {/* Timecode */}
            <span className="tabular-nums text-[11px] text-zinc-300">
              {fmtTime(currentTimeS)}
            </span>
            <span className="text-[11px] text-zinc-600">/</span>
            <span className="tabular-nums text-[11px] text-zinc-500">
              {durationS != null ? fmtTime(durationS) : "--:--.-"}
            </span>

            {/* When folder handle is unavailable, let user pick the file directly */}
            {!isReady && (
              <>
                <input
                  id={fileInputId}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) loadFromFile(file);
                    // Reset so same file can be picked again if needed
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor={fileInputId}
                  className="cursor-pointer rounded border border-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  title="Pick the voiceover audio file to enable playback"
                >
                  Pick file…
                </label>
              </>
            )}
          </>
        ) : (
          <span className="text-[10px] text-zinc-700 italic">No voiceover selected</span>
        )}

        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600">{fmtTime(lastEnd)} total</span>
      </div>

      {/* ── Track area ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track labels (fixed left column) */}
        <div className="shrink-0 border-r border-zinc-800 bg-zinc-900" style={{ width: LABEL_W }}>
          <div style={{ height: RULER_H }} className="border-b border-zinc-800" />
          <TrackLabel h={V_TRACK_H} icon="V1" color="#4ECDC4">Video</TrackLabel>
          <TrackLabel h={T_TRACK_H} icon="T1" color="#FDCB6E">Transitions</TrackLabel>
          <TrackLabel h={A_TRACK_H} icon="A1" color="#74B9FF">Audio</TrackLabel>
          <TrackLabel h={FX_TRACK_H} icon="FX" color="#A29BFE">Effects</TrackLabel>
        </div>

        {/* Scrollable track content */}
        <div
          ref={(el) => { scrollRef.current = el; dropRef(el); }}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ background: isOver ? "rgba(16,185,129,0.03)" : undefined }}
        >
          <div style={{ width: totalWidth, minWidth: "100%", position: "relative" }}>

            {/* Ruler — click anywhere to seek */}
            <div
              onClick={handleRulerSeek}
              className={isReady ? "cursor-pointer" : "cursor-default"}
              title={isReady ? "Click to seek" : undefined}
            >
              <Ruler totalWidth={totalWidth} pps={pps} height={RULER_H} />
            </div>

            {/* V1 — Video track */}
            <div className="relative border-b border-zinc-800/60" style={{ height: V_TRACK_H, background: "rgba(9,9,11,0.6)" }}>
              <GridLines totalWidth={totalWidth} pps={pps} height={V_TRACK_H} />
              {segments.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-700 pointer-events-none">
                  Drag molds here to build your timeline
                </div>
              )}
              {segments.map((seg, i) => {
                const effEnd = (resize?.segId === seg.id && previewEnd !== null) ? previewEnd : seg.endTimeS;
                return (
                  <SegmentClip
                    key={seg.id}
                    seg={seg}
                    index={i}
                    pps={pps}
                    effectiveEnd={effEnd}
                    selected={selectedId === seg.id}
                    words={whisperWords}
                    isResizing={resize?.segId === seg.id}
                    onSelect={() => select("segment", seg.id)}
                    onRemove={() => removeSegment(seg.id)}
                    onResizeStart={(e) => onPointerDownResize(e, seg.id, seg.endTimeS)}
                    onSwapClick={(e) => setSwapPicker({ segId: seg.id, moldId: seg.moldId, x: e.clientX, y: e.clientY })}
                  />
                );
              })}
            </div>

            {/* T1 — Transitions track */}
            <div className="relative border-b border-zinc-800/60" style={{ height: T_TRACK_H, background: "rgba(9,9,11,0.4)" }}>
              <GridLines totalWidth={totalWidth} pps={pps} height={T_TRACK_H} />
              {transitions.map((t, i) => {
                const cutTime = segments[i + 1]?.startTimeS ?? 0;
                return (
                  <TransMarker
                    key={t.id}
                    transition={t}
                    index={i}
                    cutTime={cutTime}
                    pps={pps}
                    selected={selectedId === t.id}
                    onSelect={() => select("transition", t.id)}
                  />
                );
              })}
            </div>

            {/* A1 — Audio track */}
            <div className="relative border-b border-zinc-800/60" style={{ height: A_TRACK_H, background: "rgba(9,9,11,0.3)" }}>
              <GridLines totalWidth={totalWidth} pps={pps} height={A_TRACK_H} />
              <AudioBar
                audio={audio}
                setAudio={setAudio}
                audioFiles={audioFiles}
                pps={pps}
                totalDuration={lastEnd}
              />
            </div>

            {/* FX — Effects track */}
            <div className="relative" style={{ height: FX_TRACK_H, background: "rgba(9,9,11,0.2)" }}>
              <GridLines totalWidth={totalWidth} pps={pps} height={FX_TRACK_H} />
              {extraVfx.map(vfx => (
                <VFXMarker
                  key={vfx.id}
                  vfx={vfx}
                  pps={pps}
                  selected={selectedId === vfx.id}
                  onSelect={() => select("extravfx", vfx.id)}
                  onRemove={() => removeExtraVFX(vfx.id)}
                />
              ))}
              <div className="absolute right-2 top-1 flex gap-1">
                {EXTRA_VFX_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => addExtraVFX(opt.id)}
                    className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[8px] text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  >
                    +{opt.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Playhead ──────────────────────────────────────── */}
            {(isReady || currentTimeS > 0) && (
              <div
                className="pointer-events-none absolute top-0 z-30 w-px"
                style={{
                  left: playheadX,
                  height: TRACKS_H,
                  background: "rgb(16 185 129)",
                }}
              >
                {/* Triangle caret at the top */}
                <div className="absolute -left-[5px] top-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-emerald-500" />
              </div>
            )}

          </div>
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

/* ─── Sub-components ────────────────────────────────────────────── */

function TrackLabel({ h, icon, color, children }: { h: number; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-zinc-800/60 px-2" style={{ height: h }}>
      <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ background: `${color}25`, color }}>{icon}</span>
      <span className="text-[10px] font-medium text-zinc-400">{children}</span>
    </div>
  );
}

function Ruler({ totalWidth, pps, height }: { totalWidth: number; pps: number; height: number }) {
  const marks: React.ReactNode[] = [];
  const totalSec = totalWidth / pps;
  const step = pps >= 60 ? 1 : pps >= 30 ? 2 : 5;
  for (let s = 0; s <= totalSec; s += step) {
    const x = s * pps;
    marks.push(
      <div key={s} className="absolute top-0" style={{ left: x, height: "100%" }}>
        <div className="absolute bottom-0 w-px bg-zinc-700" style={{ height: s % 5 === 0 ? 10 : 6 }} />
        <span className="absolute bottom-[10px] -translate-x-1/2 text-[9px] tabular-nums text-zinc-500">{fmtTime(s)}</span>
      </div>
    );
  }
  return <div className="relative border-b border-zinc-700 bg-zinc-900" style={{ height, width: totalWidth }}>{marks}</div>;
}

function GridLines({ totalWidth, pps, height }: { totalWidth: number; pps: number; height: number }) {
  const lines: React.ReactNode[] = [];
  const totalSec = totalWidth / pps;
  const step = pps >= 60 ? 1 : pps >= 30 ? 2 : 5;
  for (let s = 0; s <= totalSec; s += step) {
    lines.push(
      <div key={s} className="absolute top-0 w-px" style={{
        left: s * pps, height,
        background: s % 5 === 0 ? "rgba(63,63,70,0.5)" : "rgba(63,63,70,0.2)"
      }} />
    );
  }
  return <>{lines}</>;
}

interface SegClipProps {
  seg: Segment;
  index: number;
  pps: number;
  effectiveEnd: number;
  selected: boolean;
  words: WhisperWord[];
  isResizing: boolean | undefined;
  onSelect: () => void;
  onRemove: () => void;
  onResizeStart: (e: RPointerEvent<HTMLDivElement>) => void;
  onSwapClick: (e: RMouseEvent<HTMLButtonElement>) => void;
}

function SegmentClip({ seg, index, pps, effectiveEnd, selected, words, isResizing, onSelect, onRemove, onResizeStart, onSwapClick }: SegClipProps) {
  const mold = MOLD_REGISTRY[seg.moldId];
  const left = seg.startTimeS * pps;
  const width = Math.max(20, (effectiveEnd - seg.startTimeS) * pps);
  const dur = effectiveEnd - seg.startTimeS;
  const endWord = wordAtTime(words, effectiveEnd, "end");
  const moldColor = mold?.color ?? "#666";

  return (
    <div
      className={`group absolute top-[3px] flex cursor-pointer items-stretch rounded-[4px] border-l-[3px] transition-shadow ${selected ? "ring-1 ring-white/40" : ""} ${isResizing ? "z-20" : ""}`}
      style={{ left, width, height: V_TRACK_H - 6, borderLeftColor: moldColor, background: `${moldColor}22` }}
      onClick={onSelect}
    >
      <div className="flex flex-1 flex-col justify-between overflow-hidden px-1.5 py-1">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onSwapClick(e); }}
            className="flex items-center gap-0.5 truncate rounded px-0.5 transition hover:bg-white/10"
            title="Click to change frame"
          >
            <span className="truncate text-[10px] font-bold text-zinc-200">{mold?.label ?? seg.moldId}</span>
            <ChevronDown size={9} className="shrink-0 text-zinc-500" />
          </button>
          <span className="shrink-0 text-[9px] text-zinc-500">S{index + 1}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] tabular-nums text-zinc-500">{dur > 0 ? `${dur.toFixed(1)}s` : "—"}</span>
          {seg.startWord && <span className="text-[8px] text-zinc-600">"{seg.startWord.word}"</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center border-l border-zinc-700/40 px-1">
        {endWord && <span className="max-w-[60px] truncate text-[8px] font-medium" style={{ color: moldColor }}>"{endWord.word}"</span>}
        <span className="text-[8px] tabular-nums text-zinc-600">{effectiveEnd.toFixed(2)}s</span>
      </div>
      <div
        className="absolute right-0 top-0 h-full w-[7px] cursor-col-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-60"
        style={{ background: `linear-gradient(to right, transparent, ${moldColor}80)` }}
        onPointerDown={onResizeStart}
      />
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="absolute -right-1 -top-1 hidden rounded-full bg-zinc-800 p-0.5 text-zinc-500 hover:text-red-400 group-hover:block"
      >
        <X size={9} />
      </button>
    </div>
  );
}

function TransMarker({ transition, index, cutTime, pps, selected, onSelect }: {
  transition: Transition; index: number; cutTime: number; pps: number; selected: boolean; onSelect: () => void;
}) {
  const left = cutTime * pps - 14;
  const parts: string[] = [];
  if (transition.morph) parts.push("M");
  if (transition.lightLeak !== "none") parts.push(transition.lightLeak[0].toUpperCase());
  if (transition.redEnergy) parts.push("R");
  if (transition.woosh) parts.push("W");

  return (
    <div
      className={`absolute top-[4px] flex cursor-pointer items-center gap-0.5 rounded border px-1.5 py-0.5 transition ${
        selected ? "border-amber-500 bg-amber-500/25" : "border-zinc-700 bg-zinc-800/70 hover:border-zinc-500"
      }`}
      style={{ left: Math.max(0, left), height: T_TRACK_H - 8 }}
      onClick={onSelect}
    >
      <Zap size={10} className="shrink-0 text-amber-400" />
      <span className="text-[8px] text-zinc-400">{parts.join("+") || `C${index + 1}`}</span>
    </div>
  );
}

function AudioBar({ audio, setAudio, audioFiles, pps, totalDuration }: {
  audio: { voiceoverFile: string | null; bgMusicVolume: number; wooshVolume: number };
  setAudio: (p: Partial<typeof audio>) => void;
  audioFiles: string[];
  pps: number;
  totalDuration: number;
}) {
  const barWidth = Math.max(100, totalDuration * pps);
  return (
    <>
      <div
        className="absolute top-[3px] flex items-center gap-1.5 rounded-[3px] border border-blue-500/20 bg-blue-500/10 px-2"
        style={{ left: 0, width: barWidth, height: A_TRACK_H - 6 }}
      >
        <Music size={10} className="shrink-0 text-blue-400" />
        <span className="text-[9px] text-blue-300">BG Music</span>
        <div className="flex items-center gap-1">
          <Volume2 size={8} className="text-blue-400" />
          <input
            type="range" min={0} max={1} step={0.01} value={audio.bgMusicVolume}
            onChange={e => setAudio({ bgMusicVolume: parseFloat(e.target.value) })}
            className="h-1 w-12 cursor-pointer accent-blue-500"
          />
          <span className="text-[8px] tabular-nums text-blue-400">{audio.bgMusicVolume.toFixed(2)}</span>
        </div>
        <div className="mx-1 h-3 w-px bg-blue-500/20" />
        <span className="text-[8px] text-zinc-500">Woosh:</span>
        <input
          type="range" min={0} max={1} step={0.01} value={audio.wooshVolume}
          onChange={e => setAudio({ wooshVolume: parseFloat(e.target.value) })}
          className="h-1 w-10 cursor-pointer accent-amber-500"
        />
        <span className="text-[8px] tabular-nums text-amber-400">{audio.wooshVolume.toFixed(2)}</span>
        <div className="mx-1 h-3 w-px bg-blue-500/20" />
        {/* Voiceover file selector */}
        <select
          value={audio.voiceoverFile ?? ""}
          onChange={e => setAudio({ voiceoverFile: e.target.value || null })}
          className="rounded border-none bg-transparent px-1 text-[8px] text-blue-300 outline-none"
        >
          <option value="">No voiceover</option>
          {audioFiles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
    </>
  );
}

function VFXMarker({ vfx, pps, selected, onSelect, onRemove }: {
  vfx: ExtraVFX; pps: number; selected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const opt = EXTRA_VFX_OPTIONS.find(o => o.id === vfx.type);
  const durSec = (opt?.defaultDurationFrames ?? 15) / 30;
  const left = vfx.timeS * pps;
  const width = Math.max(30, durSec * pps);

  return (
    <div
      className={`absolute top-[3px] flex cursor-pointer items-center gap-1 rounded-[3px] border px-1.5 transition ${
        selected ? "border-purple-500 bg-purple-500/25" : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-500"
      }`}
      style={{ left, width, height: FX_TRACK_H - 6 }}
      onClick={onSelect}
    >
      <Sparkles size={9} className="shrink-0 text-purple-400" />
      <span className="truncate text-[8px] text-zinc-400">{vfx.type}</span>
      <button onClick={e => { e.stopPropagation(); onRemove(); }} className="ml-auto shrink-0 text-zinc-600 hover:text-red-400">
        <X size={8} />
      </button>
    </div>
  );
}
