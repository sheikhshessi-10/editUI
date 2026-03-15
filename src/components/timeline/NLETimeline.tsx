import {
  useRef,
  useState,
  useCallback,
  type PointerEvent as RPointerEvent,
  type MouseEvent as RMouseEvent,
} from "react";
import { useDroppable } from "@dnd-kit/core";
import { useShallow } from "zustand/react/shallow";
import {
  X, ZoomIn, ZoomOut, Sparkles, Zap, ChevronDown,
  Play, Pause, SkipBack, Plus,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { useAudioStore } from "../../store/useAudioStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { EXTRA_VFX_OPTIONS } from "../../data/transitionRegistry";
import { MoldSwapPicker } from "../shared/MoldSwapPicker";
import type { Segment, Transition, ExtraVFX, WhisperWord } from "../../data/types";
import type { AudioClip, AudioTrack } from "../../data/audioTypes";

// ── Layout constants ────────────────────────────────────────────────
const RULER_H       = 26;
const V_TRACK_H     = 56;
const T_TRACK_H     = 32;
const AUDIO_TRACK_H = 44;  // height per audio track row
const ADD_TRACK_H   = 24;  // height of the "+ Add Track" row
const FX_TRACK_H    = 32;
const LABEL_W       = 96;  // slightly wider to fit M/S buttons
const MIN_PPS       = 30;
const MAX_PPS       = 300;

// Per-track clip colours (cycles if more than 6 tracks)
const CLIP_COLORS = [
  "#74B9FF", "#00CEC9", "#FDCB6E",
  "#E17055", "#A29BFE", "#FD79A8",
] as const;

// ── Helpers ─────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
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

// ── Audio clip drag/resize state ────────────────────────────────────
type AudioOp =
  | { kind: "resize"; clipId: string; origDuration: number; startX: number }
  | { kind: "move";   clipId: string; trackId: string; origStart: number; startX: number };

// ── Main component ──────────────────────────────────────────────────
export function NLETimeline() {
  // Video/segment store
  const {
    segments, transitions, extraVfx, whisperWords, selectedId,
    select, removeSegment, resizeSegmentEnd, swapSegmentMold, addExtraVFX, removeExtraVFX,
  } = useStore(useShallow((s) => ({
    segments:         s.segments,
    transitions:      s.transitions,
    extraVfx:         s.extraVfx,
    whisperWords:     s.whisperWords,
    selectedId:       s.selectedId,
    select:           s.select,
    removeSegment:    s.removeSegment,
    resizeSegmentEnd: s.resizeSegmentEnd,
    swapSegmentMold:  s.swapSegmentMold,
    addExtraVFX:      s.addExtraVFX,
    removeExtraVFX:   s.removeExtraVFX,
  })));

  // Audio store
  const {
    tracks, importedAudios, playheadTime, isPlaying, selectedClipId,
    updateTrack, addTrack, removeTrack,
    addClipToTrack, removeClip, moveClip, updateClip, selectClip,
    play, pause, stop, setPlayheadTime,
  } = useAudioStore();

  // ── Local state ────────────────────────────────────────────────────
  const [pps, setPps] = useState(80);

  // Video segment resize
  const [resize, setResize] = useState<{ segId: string; origEnd: number; startX: number } | null>(null);
  const [previewEnd, setPreviewEnd] = useState<number | null>(null);

  // Mold swap picker
  const [swapPicker, setSwapPicker] = useState<{ segId: string; moldId: string; x: number; y: number } | null>(null);

  // Audio clip drag/resize
  const [audioOp, setAudioOp]           = useState<AudioOp | null>(null);
  const [audioOpPreview, setAudioOpPreview] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: "timeline-drop" });

  // ── Derived ────────────────────────────────────────────────────────
  const lastEnd      = segments.length > 0 ? segments[segments.length - 1].endTimeS : 0;
  const totalDuration = Math.max(lastEnd + 5, 30);
  const totalWidth    = totalDuration * pps;
  const playheadX     = playheadTime * pps;

  const audioSectionH = tracks.length * AUDIO_TRACK_H + ADD_TRACK_H;
  const playheadH     = RULER_H + V_TRACK_H + T_TRACK_H + audioSectionH + FX_TRACK_H;

  // ── Pointer handlers (global on the root div) ───────────────────────
  const onPointerMoveGlobal = useCallback((e: RPointerEvent) => {
    if (resize) {
      const dx = e.clientX - resize.startX;
      setPreviewEnd(Math.max(0.1, resize.origEnd + dx / pps));
    } else if (audioOp?.kind === "resize") {
      const dx = e.clientX - audioOp.startX;
      setAudioOpPreview(Math.max(0.1, audioOp.origDuration + dx / pps));
    } else if (audioOp?.kind === "move") {
      const dx = e.clientX - audioOp.startX;
      setAudioOpPreview(Math.max(0, audioOp.origStart + dx / pps));
    }
  }, [resize, audioOp, pps]);

  const onPointerUpGlobal = useCallback(() => {
    if (resize && previewEnd !== null) {
      resizeSegmentEnd(resize.segId, previewEnd);
    } else if (audioOp && audioOpPreview !== null) {
      if (audioOp.kind === "resize") {
        updateClip(audioOp.clipId, { durationS: audioOpPreview });
      } else {
        moveClip(audioOp.clipId, audioOp.trackId, audioOpPreview);
      }
    }
    setResize(null);
    setPreviewEnd(null);
    setAudioOp(null);
    setAudioOpPreview(null);
  }, [resize, previewEnd, resizeSegmentEnd, audioOp, audioOpPreview, updateClip, moveClip]);

  // Segment resize start
  const onPointerDownResize = useCallback((e: RPointerEvent, segId: string, origEnd: number) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setResize({ segId, origEnd, startX: e.clientX });
  }, []);

  // ── Ruler seek ─────────────────────────────────────────────────────
  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0);
    setPlayheadTime(Math.max(0, x / pps));
  }, [pps, setPlayheadTime]);

  // ── Audio drag-from-library drop onto a track ───────────────────────
  const handleTrackDrop = useCallback((e: React.DragEvent<HTMLDivElement>, trackId: string) => {
    e.preventDefault();
    const audioId = e.dataTransfer.getData("application/x-audio-id");
    if (!audioId) return;
    const audio = importedAudios.find((a) => a.id === audioId);
    if (!audio) return;
    const scrollEl = scrollRef.current;
    const rect = scrollEl?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0) + (scrollEl?.scrollLeft ?? 0);
    addClipToTrack(trackId, {
      audioId,
      startTimeS: Math.max(0, x / pps),
      durationS:  audio.durationS,
      srcOffsetS: 0,
      volume:     1,
    });
  }, [importedAudios, pps, addClipToTrack]);

  const handleTrackDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("application/x-audio-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  return (
    <div
      className="flex h-full flex-col select-none"
      onPointerMove={onPointerMoveGlobal}
      onPointerUp={onPointerUpGlobal}
    >
      {/* ── Toolbar: zoom + transport ──────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2 py-1">
        {/* Zoom */}
        <button
          onClick={() => setPps((p) => Math.max(MIN_PPS, p - 10))}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] text-zinc-500 tabular-nums">{pps}px/s</span>
        <button
          onClick={() => setPps((p) => Math.min(MAX_PPS, p + 10))}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ZoomIn size={14} />
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        {/* Stop / skip to start */}
        <button
          onClick={stop}
          title="Stop & return to start"
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <SkipBack size={14} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? pause : () => play()}
          title={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center rounded bg-emerald-600 p-1 text-white hover:bg-emerald-500"
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>

        {/* Timecode */}
        <span className="tabular-nums text-[11px] text-zinc-300">{fmtTime(playheadTime)}</span>

        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600">{fmtTime(lastEnd)} total</span>
      </div>

      {/* ── Track area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Fixed label column */}
        <div
          className="shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900"
          style={{ width: LABEL_W }}
        >
          {/* Ruler spacer */}
          <div style={{ height: RULER_H }} className="border-b border-zinc-800" />
          {/* V1 */}
          <TrackLabel h={V_TRACK_H} icon="V1" color="#4ECDC4">Video</TrackLabel>
          {/* T1 */}
          <TrackLabel h={T_TRACK_H} icon="T1" color="#FDCB6E">Trans</TrackLabel>

          {/* Audio track labels — one per track */}
          {tracks.map((track, i) => (
            <AudioTrackLabel
              key={track.id}
              track={track}
              index={i}
              onMute={() => updateTrack(track.id, { muted: !track.muted })}
              onSolo={() => updateTrack(track.id, { solo: !track.solo })}
              onRemove={tracks.length > 1 ? () => removeTrack(track.id) : undefined}
            />
          ))}

          {/* Add Track */}
          <div
            style={{ height: ADD_TRACK_H }}
            className="flex items-center border-b border-zinc-800/60 px-2"
          >
            <button
              onClick={addTrack}
              className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-zinc-400"
            >
              <Plus size={10} />
              Add Track
            </button>
          </div>

          {/* FX */}
          <TrackLabel h={FX_TRACK_H} icon="FX" color="#A29BFE">Effects</TrackLabel>
        </div>

        {/* Scrollable content */}
        <div
          ref={(el) => { scrollRef.current = el; dropRef(el); }}
          className="flex-1 overflow-x-auto overflow-y-auto"
          style={{ background: isOver ? "rgba(16,185,129,0.03)" : undefined }}
        >
          <div style={{ width: totalWidth, minWidth: "100%", position: "relative" }}>

            {/* Ruler — click to seek */}
            <div onClick={handleRulerClick} className="cursor-pointer">
              <Ruler totalWidth={totalWidth} pps={pps} height={RULER_H} />
            </div>

            {/* V1 — Video */}
            <div
              className="relative border-b border-zinc-800/60"
              style={{ height: V_TRACK_H, background: "rgba(9,9,11,0.6)" }}
            >
              <GridLines totalWidth={totalWidth} pps={pps} height={V_TRACK_H} />
              {segments.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-zinc-700">
                  Drag molds here to build your timeline
                </div>
              )}
              {segments.map((seg, i) => {
                const effEnd = (resize?.segId === seg.id && previewEnd !== null)
                  ? previewEnd : seg.endTimeS;
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
                    onSwapClick={(e) =>
                      setSwapPicker({ segId: seg.id, moldId: seg.moldId, x: e.clientX, y: e.clientY })
                    }
                  />
                );
              })}
            </div>

            {/* T1 — Transitions */}
            <div
              className="relative border-b border-zinc-800/60"
              style={{ height: T_TRACK_H, background: "rgba(9,9,11,0.4)" }}
            >
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

            {/* Audio tracks — one row per track */}
            {tracks.map((track, trackIndex) => {
              const color = CLIP_COLORS[trackIndex % CLIP_COLORS.length];
              return (
                <div
                  key={track.id}
                  className="relative border-b border-zinc-800/60"
                  style={{ height: AUDIO_TRACK_H, background: "rgba(9,9,11,0.3)" }}
                  onDragOver={handleTrackDragOver}
                  onDrop={(e) => handleTrackDrop(e, track.id)}
                >
                  <GridLines totalWidth={totalWidth} pps={pps} height={AUDIO_TRACK_H} />

                  {/* Empty-track hint */}
                  {track.clips.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-zinc-800">
                      Drop audio here
                    </div>
                  )}

                  {track.clips.map((clip) => {
                    const effStartS =
                      audioOp?.kind === "move" && audioOp.clipId === clip.id && audioOpPreview !== null
                        ? audioOpPreview
                        : clip.startTimeS;
                    const effDurS =
                      audioOp?.kind === "resize" && audioOp.clipId === clip.id && audioOpPreview !== null
                        ? audioOpPreview
                        : clip.durationS;
                    const audioName =
                      importedAudios.find((a) => a.id === clip.audioId)?.name ?? "—";

                    return (
                      <AudioClipBlock
                        key={clip.id}
                        clip={clip}
                        audioName={audioName}
                        color={color}
                        pps={pps}
                        selected={selectedClipId === clip.id}
                        effStartS={effStartS}
                        effDurS={effDurS}
                        onSelect={() => selectClip(clip.id)}
                        onRemove={() => removeClip(clip.id)}
                        onMoveStart={(e) => {
                          (e.target as HTMLElement).setPointerCapture(e.pointerId);
                          setAudioOp({
                            kind: "move",
                            clipId: clip.id,
                            trackId: track.id,
                            origStart: clip.startTimeS,
                            startX: e.clientX,
                          });
                          e.stopPropagation();
                        }}
                        onResizeStart={(e) => {
                          (e.target as HTMLElement).setPointerCapture(e.pointerId);
                          setAudioOp({
                            kind: "resize",
                            clipId: clip.id,
                            origDuration: clip.durationS,
                            startX: e.clientX,
                          });
                          e.stopPropagation();
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Add Track spacer row */}
            <div
              className="relative border-b border-zinc-800/20"
              style={{ height: ADD_TRACK_H, background: "rgba(9,9,11,0.15)" }}
            />

            {/* FX — Effects */}
            <div
              className="relative"
              style={{ height: FX_TRACK_H, background: "rgba(9,9,11,0.2)" }}
            >
              <GridLines totalWidth={totalWidth} pps={pps} height={FX_TRACK_H} />
              {extraVfx.map((vfx) => (
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
                {EXTRA_VFX_OPTIONS.map((opt) => (
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

            {/* Playhead */}
            {playheadTime > 0 && (
              <div
                className="pointer-events-none absolute top-0 z-30 w-px"
                style={{ left: playheadX, height: playheadH, background: "rgb(16 185 129)" }}
              >
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
          onPick={(newMoldId) => { swapSegmentMold(swapPicker.segId, newMoldId); setSwapPicker(null); }}
          onClose={() => setSwapPicker(null)}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function TrackLabel({
  h, icon, color, children,
}: {
  h: number; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 border-b border-zinc-800/60 px-2" style={{ height: h }}>
      <span
        className="rounded px-1 py-0.5 text-[9px] font-bold"
        style={{ background: `${color}25`, color }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-medium text-zinc-400">{children}</span>
    </div>
  );
}

function AudioTrackLabel({
  track, index, onMute, onSolo, onRemove,
}: {
  track: AudioTrack;
  index: number;
  onMute: () => void;
  onSolo: () => void;
  onRemove?: () => void;
}) {
  const color = CLIP_COLORS[index % CLIP_COLORS.length];
  return (
    <div
      className="flex items-center gap-1 border-b border-zinc-800/60 px-1.5"
      style={{ height: AUDIO_TRACK_H }}
    >
      <span
        className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold"
        style={{ background: `${color}25`, color }}
      >
        A{index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-[9px] text-zinc-400">{track.name}</span>
      <button
        onClick={onMute}
        title="Mute"
        className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold transition ${
          track.muted
            ? "bg-amber-500/80 text-amber-100"
            : "text-zinc-600 hover:bg-zinc-700 hover:text-zinc-300"
        }`}
      >
        M
      </button>
      <button
        onClick={onSolo}
        title="Solo"
        className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold transition ${
          track.solo
            ? "bg-blue-500/80 text-blue-100"
            : "text-zinc-600 hover:bg-zinc-700 hover:text-zinc-300"
        }`}
      >
        S
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove track"
          className="shrink-0 text-zinc-700 hover:text-red-400"
        >
          <X size={8} />
        </button>
      )}
    </div>
  );
}

function AudioClipBlock({
  clip: _clip, audioName, color, pps, selected, effStartS, effDurS,
  onSelect, onRemove, onMoveStart, onResizeStart,
}: {
  clip: AudioClip;
  audioName: string;
  color: string;
  pps: number;
  selected: boolean;
  effStartS: number;
  effDurS: number;
  onSelect: () => void;
  onRemove: () => void;
  onMoveStart: (e: RPointerEvent<HTMLDivElement>) => void;
  onResizeStart: (e: RPointerEvent<HTMLDivElement>) => void;
}) {
  const left  = effStartS * pps;
  const width = Math.max(16, effDurS * pps);

  return (
    <div
      className={`group absolute top-[3px] flex cursor-grab items-center overflow-hidden rounded border-l-2 ${
        selected ? "ring-1 ring-white/40" : ""
      }`}
      style={{
        left,
        width,
        height: AUDIO_TRACK_H - 6,
        borderLeftColor: color,
        background: `${color}22`,
      }}
      onClick={onSelect}
      onPointerDown={onMoveStart}
    >
      <span
        className="pointer-events-none flex-1 truncate px-1.5 text-[9px] font-medium"
        style={{ color }}
      >
        {audioName}
      </span>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-5 top-0.5 hidden shrink-0 rounded text-zinc-500 hover:text-red-400 group-hover:block"
      >
        <X size={8} />
      </button>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-[6px] cursor-col-resize"
        style={{ background: `linear-gradient(to right, transparent, ${color}55)` }}
        onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
        onClick={(e) => e.stopPropagation()}
      />
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
        <div
          className="absolute bottom-0 w-px bg-zinc-700"
          style={{ height: s % 5 === 0 ? 10 : 6 }}
        />
        <span className="absolute bottom-[10px] -translate-x-1/2 text-[9px] tabular-nums text-zinc-500">
          {fmtTime(s)}
        </span>
      </div>
    );
  }
  return (
    <div
      className="relative border-b border-zinc-700 bg-zinc-900"
      style={{ height, width: totalWidth }}
    >
      {marks}
    </div>
  );
}

function GridLines({ totalWidth, pps, height }: { totalWidth: number; pps: number; height: number }) {
  const lines: React.ReactNode[] = [];
  const totalSec = totalWidth / pps;
  const step = pps >= 60 ? 1 : pps >= 30 ? 2 : 5;
  for (let s = 0; s <= totalSec; s += step) {
    lines.push(
      <div
        key={s}
        className="absolute top-0 w-px"
        style={{
          left: s * pps,
          height,
          background: s % 5 === 0 ? "rgba(63,63,70,0.5)" : "rgba(63,63,70,0.2)",
        }}
      />
    );
  }
  return <>{lines}</>;
}

interface SegClipProps {
  seg: Segment; index: number; pps: number; effectiveEnd: number; selected: boolean;
  words: WhisperWord[]; isResizing: boolean | undefined;
  onSelect: () => void; onRemove: () => void;
  onResizeStart: (e: RPointerEvent<HTMLDivElement>) => void;
  onSwapClick: (e: RMouseEvent<HTMLButtonElement>) => void;
}

function SegmentClip({
  seg, index, pps, effectiveEnd, selected, words, isResizing,
  onSelect, onRemove, onResizeStart, onSwapClick,
}: SegClipProps) {
  const mold      = MOLD_REGISTRY[seg.moldId];
  const left      = seg.startTimeS * pps;
  const width     = Math.max(20, (effectiveEnd - seg.startTimeS) * pps);
  const dur       = effectiveEnd - seg.startTimeS;
  const endWord   = wordAtTime(words, effectiveEnd, "end");
  const moldColor = mold?.color ?? "#666";

  return (
    <div
      className={`group absolute top-[3px] flex cursor-pointer items-stretch rounded-[4px] border-l-[3px] transition-shadow ${
        selected ? "ring-1 ring-white/40" : ""
      } ${isResizing ? "z-20" : ""}`}
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
            <span className="truncate text-[10px] font-bold text-zinc-200">
              {mold?.label ?? seg.moldId}
            </span>
            <ChevronDown size={9} className="shrink-0 text-zinc-500" />
          </button>
          <span className="shrink-0 text-[9px] text-zinc-500">S{index + 1}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] tabular-nums text-zinc-500">
            {dur > 0 ? `${dur.toFixed(1)}s` : "—"}
          </span>
          {seg.startWord && (
            <span className="text-[8px] text-zinc-600">"{seg.startWord.word}"</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center border-l border-zinc-700/40 px-1">
        {endWord && (
          <span
            className="max-w-[60px] truncate text-[8px] font-medium"
            style={{ color: moldColor }}
          >
            "{endWord.word}"
          </span>
        )}
        <span className="text-[8px] tabular-nums text-zinc-600">{effectiveEnd.toFixed(2)}s</span>
      </div>
      <div
        className="absolute right-0 top-0 h-full w-[7px] cursor-col-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-60"
        style={{ background: `linear-gradient(to right, transparent, ${moldColor}80)` }}
        onPointerDown={onResizeStart}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -right-1 -top-1 hidden rounded-full bg-zinc-800 p-0.5 text-zinc-500 hover:text-red-400 group-hover:block"
      >
        <X size={9} />
      </button>
    </div>
  );
}

function TransMarker({
  transition, index, cutTime, pps, selected, onSelect,
}: {
  transition: Transition; index: number; cutTime: number;
  pps: number; selected: boolean; onSelect: () => void;
}) {
  const left  = cutTime * pps - 14;
  const parts: string[] = [];
  if (transition.morph) parts.push("M");
  if (transition.lightLeak !== "none") parts.push(transition.lightLeak[0].toUpperCase());
  if (transition.redEnergy) parts.push("R");
  if (transition.woosh) parts.push("W");
  return (
    <div
      className={`absolute top-[4px] flex cursor-pointer items-center gap-0.5 rounded border px-1.5 py-0.5 transition ${
        selected
          ? "border-amber-500 bg-amber-500/25"
          : "border-zinc-700 bg-zinc-800/70 hover:border-zinc-500"
      }`}
      style={{ left: Math.max(0, left), height: T_TRACK_H - 8 }}
      onClick={onSelect}
    >
      <Zap size={10} className="shrink-0 text-amber-400" />
      <span className="text-[8px] text-zinc-400">{parts.join("+") || `C${index + 1}`}</span>
    </div>
  );
}

function VFXMarker({
  vfx, pps, selected, onSelect, onRemove,
}: {
  vfx: ExtraVFX; pps: number; selected: boolean;
  onSelect: () => void; onRemove: () => void;
}) {
  const opt    = EXTRA_VFX_OPTIONS.find((o) => o.id === vfx.type);
  const durSec = (opt?.defaultDurationFrames ?? 15) / 30;
  const left   = vfx.timeS * pps;
  const width  = Math.max(30, durSec * pps);
  return (
    <div
      className={`absolute top-[3px] flex cursor-pointer items-center gap-1 rounded-[3px] border px-1.5 transition ${
        selected
          ? "border-purple-500 bg-purple-500/25"
          : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-500"
      }`}
      style={{ left, width, height: FX_TRACK_H - 6 }}
      onClick={onSelect}
    >
      <Sparkles size={9} className="shrink-0 text-purple-400" />
      <span className="truncate text-[8px] text-zinc-400">{vfx.type}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-auto shrink-0 text-zinc-600 hover:text-red-400"
      >
        <X size={8} />
      </button>
    </div>
  );
}
