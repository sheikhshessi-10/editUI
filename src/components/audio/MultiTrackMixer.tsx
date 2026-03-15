import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Play, Pause, Square, SkipBack, Plus,
  Mic2, Music2, Zap, Trash2,
} from 'lucide-react';
import { useAudioStore, TRACK_COLORS } from '../../store/useAudioStore';
import { audioEngine } from './AudioEngine';
import type { AudioTrackData, AudioClip } from '../../data/audioTypes';

export const TRANSPORT_H = 34;
export const AUDIO_TRACK_H = 52;

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}:${sec.toFixed(2).padStart(5, '0')}`;
  return sec.toFixed(2).padStart(5, '0');
}

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  voiceover: Mic2,
  music: Music2,
  sfx: Zap,
};

/* ─────────────────────────────────────────────────────────
   LEFT COLUMN LABELS  (fixed, not scrollable)
───────────────────────────────────────────────────────── */

export function MultiTrackMixerLabels({ labelW }: { labelW: number }) {
  const { tracks, playheadTime, isPlaying, addTrack, removeTrack, updateTrack, play, pause, stop, setPlayheadTime } =
    useAudioStore();

  return (
    <div style={{ width: labelW }}>
      {/* Transport row */}
      <div
        className="flex flex-col items-center justify-center gap-1 border-b border-zinc-700/60 bg-zinc-900 px-1"
        style={{ height: TRANSPORT_H }}
      >
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { stop(); setPlayheadTime(0); }}
            className="rounded p-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            title="Stop & reset"
          >
            <SkipBack size={11} />
          </button>
          <button
            onClick={() => { stop(); }}
            className="rounded p-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
            title="Stop"
          >
            <Square size={11} />
          </button>
          <button
            onClick={() => isPlaying ? pause() : play()}
            className={`flex items-center justify-center rounded p-1 transition ${
              isPlaying
                ? 'bg-blue-600/80 text-white hover:bg-blue-500'
                : 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={11} /> : <Play size={11} />}
          </button>
        </div>
        <div className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-emerald-400">
          {fmtTime(playheadTime)}
        </div>
      </div>

      {/* Per-track label rows */}
      {tracks.map(track => (
        <AudioTrackLabel
          key={track.id}
          track={track}
          labelW={labelW}
          onUpdate={(patch) => updateTrack(track.id, patch)}
          onRemove={() => removeTrack(track.id)}
        />
      ))}

      {/* Add track row */}
      <div
        className="flex items-center justify-center gap-1 border-b border-zinc-800/40 bg-zinc-950 px-1"
        style={{ height: 26 }}
      >
        {(['voiceover', 'music', 'sfx'] as const).map(type => (
          <button
            key={type}
            onClick={() => addTrack(type)}
            title={`Add ${type} track`}
            className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[7px] font-bold uppercase transition hover:bg-zinc-800"
            style={{ color: TRACK_COLORS[type] }}
          >
            <Plus size={8} />
            {type === 'voiceover' ? 'VO' : type === 'music' ? 'MUS' : 'SFX'}
          </button>
        ))}
      </div>
    </div>
  );
}

function AudioTrackLabel({
  track, labelW, onUpdate, onRemove,
}: {
  track: AudioTrackData;
  labelW: number;
  onUpdate: (p: Partial<Omit<AudioTrackData, 'clips'>>) => void;
  onRemove: () => void;
}) {
  const color = TRACK_COLORS[track.type] ?? '#74B9FF';
  const Icon = ICONS[track.type] ?? Music2;

  return (
    <div
      className="group flex flex-col justify-between border-b border-zinc-800/60 bg-zinc-900 px-1.5 py-1"
      style={{ height: AUDIO_TRACK_H, width: labelW }}
    >
      {/* Top row: icon + name + delete */}
      <div className="flex items-center gap-1">
        <div
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
          style={{ background: `${color}20` }}
        >
          <span style={{ color }}><Icon size={8} /></span>
        </div>
        <span
          className="flex-1 truncate text-[9px] font-medium text-zinc-300"
          title={track.name}
        >
          {track.name}
        </span>
        <button
          onClick={onRemove}
          className="shrink-0 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
        >
          <Trash2 size={8} />
        </button>
      </div>

      {/* Bottom row: M, S, volume */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate({ muted: !track.muted })}
          className={`flex h-4 min-w-[18px] items-center justify-center rounded px-0.5 text-[7px] font-bold transition ${
            track.muted
              ? 'bg-amber-500/40 text-amber-300'
              : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
          }`}
          title="Mute"
        >M</button>
        <button
          onClick={() => onUpdate({ solo: !track.solo })}
          className={`flex h-4 min-w-[18px] items-center justify-center rounded px-0.5 text-[7px] font-bold transition ${
            track.solo
              ? 'bg-yellow-500/40 text-yellow-300'
              : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
          }`}
          title="Solo"
        >S</button>
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={track.volume}
          onChange={e => onUpdate({ volume: parseFloat(e.target.value) })}
          className="h-[3px] flex-1 cursor-pointer rounded-full"
          style={{ accentColor: color }}
          title={`Vol: ${Math.round(track.volume * 100)}%`}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SCROLLABLE CONTENT  (sits inside the scrollable timeline div)
───────────────────────────────────────────────────────── */

interface ContentProps {
  pps: number;
  totalWidth: number;
  totalDuration?: number;
  labelW?: number;
}

export function MultiTrackMixerContent({ pps, totalWidth }: ContentProps) {
  const {
    tracks, importedAudios, playheadTime, isPlaying,
    selectedClipId, addClip, removeClip, updateClip, moveClip,
    setPlayheadTime, selectClip, play, pause,
  } = useAudioStore();

  // Clip drag state
  const [dragging, setDragging] = useState<{
    clipId: string;
    fromTrackId: string;
    origStart: number;
    startX: number;
  } | null>(null);
  const [dragPreviewStart, setDragPreviewStart] = useState<number | null>(null);
  const [hoverTrackId, setHoverTrackId] = useState<string | null>(null);

  // Clip resize state
  const [resizing, setResizing] = useState<{
    clipId: string;
    origDuration: number;
    startX: number;
  } | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      setDragPreviewStart(Math.max(0, dragging.origStart + dx / pps));
    } else if (resizing) {
      const dx = e.clientX - resizing.startX;
      updateClip(resizing.clipId, { duration: Math.max(0.1, resizing.origDuration + dx / pps) });
    }
  }, [dragging, resizing, pps, updateClip]);

  const handlePointerUp = useCallback(() => {
    if (dragging && dragPreviewStart !== null) {
      const targetTrack = hoverTrackId ?? dragging.fromTrackId;
      moveClip(dragging.clipId, targetTrack, dragPreviewStart);
    }
    setDragging(null);
    setResizing(null);
    setDragPreviewStart(null);
    setHoverTrackId(null);
  }, [dragging, dragPreviewStart, hoverTrackId, moveClip]);

  // Handle drop from audio library
  const handleDrop = useCallback((e: React.DragEvent, trackId: string, contentLeft: number) => {
    e.preventDefault();
    const audioId = e.dataTransfer.getData('application/audio-id');
    if (!audioId) return;
    const audio = importedAudios.find(a => a.id === audioId);
    if (!audio) return;
    const x = e.clientX - contentLeft;
    const startTime = Math.max(0, x / pps);
    const track = tracks.find(t => t.id === trackId);
    const color = TRACK_COLORS[track?.type ?? 'sfx'] ?? '#74B9FF';
    addClip(trackId, { audioId, startTime, duration: audio.duration, srcOffset: 0, volume: 1, color });
  }, [importedAudios, pps, tracks, addClip]);

  // Seek by clicking the transport bar
  const handleTransportClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setPlayheadTime(Math.max(0, x / pps));
  }, [pps, setPlayheadTime]);

  const playheadPx = playheadTime * pps;

  return (
    <div
      className="relative"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Transport / scrub bar */}
      <div
        className="relative cursor-col-resize select-none border-b border-zinc-700/60 bg-zinc-950"
        style={{ height: TRANSPORT_H, width: totalWidth }}
        onClick={handleTransportClick}
        title="Click to seek"
      >
        {/* Second marks */}
        <TransportRuler totalWidth={totalWidth} pps={pps} height={TRANSPORT_H} />

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 z-10 w-px"
          style={{ left: playheadPx, height: TRANSPORT_H, background: '#60a5fa' }}
        />
        <div
          className="pointer-events-none absolute top-0 z-10"
          style={{ left: playheadPx - 5 }}
        >
          <div
            className="h-0 w-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '8px solid #60a5fa',
            }}
          />
        </div>

        {/* Double-click: play/pause */}
        <div className="absolute inset-0" onDoubleClick={() => isPlaying ? pause() : play()} />
      </div>

      {/* Audio track content rows */}
      {tracks.map(track => {
        const color = TRACK_COLORS[track.type] ?? '#74B9FF';
        return (
          <AudioTrackContent
            key={track.id}
            track={track}
            pps={pps}
            totalWidth={totalWidth}
            color={color}
            selectedClipId={selectedClipId}
            draggingClipId={dragging?.clipId ?? null}
            dragPreviewStart={dragPreviewStart}
            playheadPx={playheadPx}
            onDrop={(e, el) => handleDrop(e, track.id, el.getBoundingClientRect().left)}
            onDragOver={(e) => { e.preventDefault(); setHoverTrackId(track.id); }}
            onClipPointerDown={(clipId, e, origStart) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setDragging({ clipId, fromTrackId: track.id, origStart, startX: e.clientX });
              selectClip(clipId, track.id);
            }}
            onResizeStart={(clipId, e, origDuration) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setResizing({ clipId, origDuration, startX: e.clientX });
            }}
            onRemoveClip={removeClip}
            onSelectClip={(id) => selectClip(id, track.id)}
          />
        );
      })}

      {/* Add-track empty state */}
      {tracks.length === 0 && (
        <div
          className="flex items-center justify-center border-b border-zinc-800/40 text-[10px] text-zinc-700"
          style={{ height: 36 }}
        >
          No audio tracks
        </div>
      )}

      {/* Add-track row spacer */}
      <div
        className="border-b border-zinc-800/40"
        style={{ height: 26, width: totalWidth }}
      />
    </div>
  );
}

/* ─── Transport ruler ─────────────────────────────────── */

function TransportRuler({ totalWidth, pps, height }: { totalWidth: number; pps: number; height: number }) {
  const marks: React.ReactNode[] = [];
  const totalSec = totalWidth / pps;
  const step = pps >= 60 ? 1 : pps >= 30 ? 2 : 5;
  for (let s = 0; s <= totalSec; s += step) {
    const x = s * pps;
    marks.push(
      <div key={s} className="absolute" style={{ left: x, top: 0, height: '100%' }}>
        <div className="absolute bottom-0 w-px" style={{ height: s % 5 === 0 ? 8 : 4, background: '#52525b' }} />
        {s % 5 === 0 && (
          <span className="absolute bottom-[8px] -translate-x-1/2 select-none text-[8px] tabular-nums text-zinc-600">
            {s}s
          </span>
        )}
      </div>
    );
  }
  return <div className="relative" style={{ width: totalWidth, height }}>{marks}</div>;
}

/* ─── Audio Track Content row ─────────────────────────── */

interface TrackContentProps {
  track: AudioTrackData;
  pps: number;
  totalWidth: number;
  color: string;
  selectedClipId: string | null;
  draggingClipId: string | null;
  dragPreviewStart: number | null;
  playheadPx: number;
  onDrop: (e: React.DragEvent, el: HTMLElement) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClipPointerDown: (clipId: string, e: React.PointerEvent, origStart: number) => void;
  onResizeStart: (clipId: string, e: React.PointerEvent, origDuration: number) => void;
  onRemoveClip: (clipId: string) => void;
  onSelectClip: (clipId: string) => void;
}

function AudioTrackContent({
  track, pps, totalWidth, color, selectedClipId,
  draggingClipId, dragPreviewStart, playheadPx,
  onDrop, onDragOver, onClipPointerDown, onResizeStart, onRemoveClip, onSelectClip,
}: TrackContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative border-b border-zinc-800/60"
      style={{
        height: AUDIO_TRACK_H,
        width: totalWidth,
        background: track.muted ? 'rgba(63,63,70,0.15)' : `${color}08`,
      }}
      onDrop={e => ref.current && onDrop(e, ref.current)}
      onDragOver={onDragOver}
    >
      {/* Drop hint */}
      {track.clips.length === 0 && !track.muted && (
        <div className="pointer-events-none absolute inset-0 flex items-center pl-2">
          <span className="text-[8px] text-zinc-700">↓ Drag audio here</span>
        </div>
      )}

      {/* Playhead line */}
      <div
        className="pointer-events-none absolute top-0 z-10 w-px"
        style={{ left: playheadPx, height: AUDIO_TRACK_H, background: `${color}50` }}
      />

      {/* Clips */}
      {track.clips.map(clip => {
        const isDragging = draggingClipId === clip.id;
        const effectiveStart = isDragging && dragPreviewStart !== null ? dragPreviewStart : clip.startTime;
        return (
          <AudioClipBlock
            key={clip.id}
            clip={clip}
            effectiveStart={effectiveStart}
            pps={pps}
            trackH={AUDIO_TRACK_H}
            selected={selectedClipId === clip.id}
            isDragging={isDragging}
            color={color}
            muted={track.muted}
            onPointerDown={e => { e.stopPropagation(); onClipPointerDown(clip.id, e, clip.startTime); }}
            onResizeStart={e => onResizeStart(clip.id, e, clip.duration)}
            onRemove={() => onRemoveClip(clip.id)}
            onSelect={() => onSelectClip(clip.id)}
          />
        );
      })}
    </div>
  );
}

/* ─── Audio Clip Block ────────────────────────────────── */

interface ClipProps {
  clip: AudioClip;
  effectiveStart: number;
  pps: number;
  trackH: number;
  selected: boolean;
  isDragging: boolean;
  color: string;
  muted: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent) => void;
  onRemove: () => void;
  onSelect: () => void;
}

function AudioClipBlock({
  clip, effectiveStart, pps, trackH, selected, isDragging, color, muted,
  onPointerDown, onResizeStart, onRemove, onSelect,
}: ClipProps) {
  const left = effectiveStart * pps;
  const width = Math.max(18, clip.duration * pps);
  const buffer = audioEngine.getBuffer(clip.audioId);

  return (
    <div
      className={`group absolute top-[2px] flex cursor-grab flex-col overflow-hidden rounded-[3px] border-l-[2px] select-none active:cursor-grabbing ${
        selected ? 'ring-1 ring-white/50 z-10' : 'z-0'
      } ${isDragging ? 'opacity-60 z-20' : ''}`}
      style={{
        left,
        width,
        height: trackH - 4,
        borderLeftColor: muted ? '#52525b' : color,
        background: muted ? 'rgba(39,39,42,0.8)' : `${color}22`,
        boxShadow: selected ? `0 0 0 1px ${color}60` : undefined,
      }}
      onPointerDown={onPointerDown}
      onClick={e => { e.stopPropagation(); onSelect(); }}
    >
      {/* Label bar */}
      <div
        className="flex shrink-0 items-center gap-0.5 px-1"
        style={{ height: 14, background: muted ? 'rgba(39,39,42,0.6)' : `${color}30` }}
      >
        <span
          className="flex-1 truncate text-[7px] font-medium leading-none"
          style={{ color: muted ? '#52525b' : color }}
        >
          {clip.duration > 0.5 ? `${clip.duration.toFixed(1)}s` : ''}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="shrink-0 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
          style={{ color: '#52525b' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l6 6M7 1L1 7" />
          </svg>
        </button>
      </div>

      {/* Waveform */}
      <div className="flex flex-1 items-center px-1 overflow-hidden">
        {buffer ? (
          <WaveformCanvas
            buffer={buffer}
            color={muted ? '#3f3f46' : color}
            width={Math.max(4, width - 8)}
            height={trackH - 20}
          />
        ) : (
          <div className="h-px w-full rounded" style={{ background: muted ? '#3f3f46' : `${color}60` }} />
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 top-0 w-[5px] cursor-col-resize opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(to right, transparent, ${color}80)` }}
        onPointerDown={onResizeStart}
      />
    </div>
  );
}

/* ─── Waveform Canvas ─────────────────────────────────── */

function WaveformCanvas({
  buffer, color, width, height,
}: {
  buffer: AudioBuffer;
  color: string;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(data.length / width));
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 0;
      let max = 0;
      for (let j = 0; j < step; j++) {
        const v = data[i * step + j] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      // Center line when silence
      const y0 = amp + min * amp;
      const y1 = amp + max * amp;
      const yTop = Math.min(y0, y1);
      const yBot = Math.max(y0, y1);
      ctx.moveTo(i, yTop < amp - 0.5 ? yTop : amp - 0.5);
      ctx.lineTo(i, yBot > amp + 0.5 ? yBot : amp + 0.5);
    }
    ctx.stroke();
  }, [buffer, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', imageRendering: 'pixelated' }}
    />
  );
}
