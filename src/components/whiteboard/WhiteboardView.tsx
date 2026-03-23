import { useState, useRef, useEffect, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { EditableWord } from "../shared/EditableWord";
import type { WhisperWord } from "../../data/types";

const CARD_W = 270;
const CARD_H = 170;
const CARD_GAP = 96;

function getWordsInRange(words: WhisperWord[], startS: number, endS: number): WhisperWord[] {
  return words.filter(w => w.start >= startS - 0.01 && w.end <= endS + 0.01);
}

export function WhiteboardView() {
  const { segments, whisperWords, selectedId, select, updateWhisperWord } = useStore(
    useShallow(s => ({
      segments: s.segments,
      whisperWords: s.whisperWords,
      selectedId: s.selectedId,
      select: s.select,
      updateWhisperWord: s.updateWhisperWord,
    }))
  );

  const [pan, setPan] = useState({ x: 60, y: 80 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [editingWord, setEditingWord] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ── Wheel zoom centred on cursor ── */
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setScale(prev => {
      const next = Math.min(2.5, Math.max(0.25, prev * factor));
      const ratio = next / prev;
      setPan(p => ({ x: mx - ratio * (mx - p.x), y: my - ratio * (my - p.y) }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  /* ── Pointer pan ── */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsPanning(true);
    setDragOrigin({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({ x: dragOrigin.px + e.clientX - dragOrigin.mx, y: dragOrigin.py + e.clientY - dragOrigin.my });
  };
  const onPointerUp = () => setIsPanning(false);

  const resetView = () => { setScale(1); setPan({ x: 60, y: 80 }); };

  /* ── Layout ── */
  const cards = segments.map((seg, i) => ({
    seg,
    mold: MOLD_REGISTRY[seg.moldId],
    words: getWordsInRange(whisperWords, seg.startTimeS, seg.endTimeS),
    x: i * (CARD_W + CARD_GAP),
    cy: CARD_H / 2,
  }));

  const totalSvgW = cards.length > 0 ? cards[cards.length - 1].x + CARD_W + 300 : 800;

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={{
        background: "#0c0c12",
        backgroundImage:
          "radial-gradient(circle, rgba(63,63,70,0.45) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        cursor: isPanning ? "grabbing" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Empty state */}
      {segments.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="text-zinc-700 text-5xl">◈</div>
          <p className="text-[13px] text-zinc-600">Add segments in the Timeline to see them here</p>
        </div>
      )}

      {/* Pan + zoom layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          position: "absolute",
          willChange: "transform",
        }}
      >
        {/* SVG connections */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}
          width={totalSvgW}
          height={CARD_H + 100}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(99,102,241,0.55)" />
            </marker>
          </defs>
          {cards.map(({ x, cy }, i) => {
            const next = cards[i + 1];
            if (!next) return null;
            const x1 = x + CARD_W + 2;
            const y1 = cy;
            const x2 = next.x - 2;
            const y2 = next.cy;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="rgba(99,102,241,0.4)"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {/* Segment cards */}
        {cards.map(({ seg, mold, words, x }, i) => {
          const isSelected = selectedId === seg.id;
          const color = mold?.color ?? "#6366f1";
          const dur = seg.endTimeS - seg.startTimeS;

          return (
            <div
              key={seg.id}
              data-no-pan=""
              onClick={() => select("segment", seg.id)}
              style={{
                position: "absolute",
                left: x,
                top: 0,
                width: CARD_W,
                height: CARD_H,
                borderRadius: 14,
                background: "#17171f",
                border: isSelected
                  ? `1.5px solid ${color}70`
                  : "1.5px solid rgba(39,39,52,0.9)",
                boxShadow: isSelected
                  ? `0 0 0 3px ${color}25, 0 16px 40px rgba(0,0,0,0.7)`
                  : "0 4px 20px rgba(0,0,0,0.55)",
                cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Top accent bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}40, transparent)`, flexShrink: 0 }} />

              <div style={{ padding: "10px 12px 10px", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      background: `${color}22`,
                      color,
                      borderRadius: 20,
                      padding: "1px 8px",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "#e4e4e7", fontSize: 12, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mold?.label ?? seg.moldId}
                  </span>
                  <span style={{ color: "#52525b", fontSize: 9, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {dur > 0 ? `${dur.toFixed(1)}s` : "—"}
                  </span>
                </div>

                {/* Caption text */}
                <div style={{ flex: 1, overflow: "hidden", lineHeight: 1.65 }}>
                  {words.length > 0 ? (
                    <p style={{ fontSize: 11, color: "#a1a1aa", margin: 0 }}>
                      {words.map((w, wi) => (
                        <span key={wi}>
                          <EditableWord
                            word={w}
                            isEditing={editingWord === w.start}
                            onStartEdit={() => setEditingWord(w.start)}
                            onCommit={(newText) => {
                              if (newText.trim() && newText.trim() !== w.word) {
                                updateWhisperWord(w.start, newText.trim());
                              }
                              setEditingWord(null);
                            }}
                            onCancel={() => setEditingWord(null)}
                          />
                          {wi < words.length - 1 ? " " : ""}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p style={{ fontSize: 10, color: "#3f3f46", fontStyle: "italic", margin: 0 }}>
                      No words assigned
                    </p>
                  )}
                </div>

                {/* Footer row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid rgba(39,39,52,0.7)", paddingTop: 7, marginTop: 7, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: "#3f3f46" }}>{words.length} words</span>
                  {seg.captionStyle && (
                    <span
                      style={{
                        background: "rgba(39,39,52,0.8)",
                        color: "#71717a",
                        borderRadius: 4,
                        padding: "1px 5px",
                        fontSize: 8,
                      }}
                    >
                      {seg.captionStyle}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "#3f3f46", fontVariantNumeric: "tabular-nums" }}>
                    {seg.startTimeS.toFixed(1)}–{seg.endTimeS.toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom controls (bottom-right) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-[3px]" data-no-pan="">
        <button
          onClick={() => setScale(s => Math.min(2.5, s * 1.15))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-900/90 text-zinc-400 backdrop-blur hover:bg-zinc-800 hover:text-zinc-200 transition"
          title="Zoom in"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={resetView}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-900/90 text-zinc-500 backdrop-blur hover:bg-zinc-800 hover:text-zinc-300 transition"
          title="Reset view"
        >
          <RotateCcw size={11} />
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.25, s / 1.15))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-900/90 text-zinc-400 backdrop-blur hover:bg-zinc-800 hover:text-zinc-200 transition"
          title="Zoom out"
        >
          <Minus size={13} />
        </button>
      </div>

      {/* Scale readout (bottom-left) */}
      <div
        className="absolute bottom-4 left-4 rounded-md border border-zinc-800/60 bg-zinc-900/80 px-2 py-1 text-[10px] tabular-nums text-zinc-600 backdrop-blur"
        data-no-pan=""
      >
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
