import { useEffect, useRef, useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { getFrameThumbnailUrl } from "../../lib/projectService";
import { FrameCard, STEP, CARD_W, CARD_H, CARD_TOP } from "./FrameCard";
import { TransitionCard } from "./TransitionCard";
import { FrameModal } from "./FrameModal";
import { TransitionModal } from "./TransitionModal";
import { ThumbnailPanel } from "./ThumbnailPanel";
import { Film } from "lucide-react";

interface BoardViewProps {
  projectId: string;
}

export function BoardView({ projectId }: BoardViewProps) {
  // ── Store state ───────────────────────────────────────────────────────────
  const { segments, transitions, whisperWords, frameThumbnails, updateWhisperWord } = useStore(
    useShallow(s => ({
      segments:          s.segments,
      transitions:       s.transitions,
      whisperWords:      s.whisperWords,
      frameThumbnails:   s.frameThumbnails,
      updateWhisperWord: s.updateWhisperWord,
    }))
  );

  // ── Pan state ──────────────────────────────────────────────────────────────
  const [panX, setPanX] = useState(80);
  const [panY, setPanY] = useState(120);
  const isPanningRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on direct background clicks (not on cards)
    if ((e.target as HTMLElement).closest("[data-board-card]")) return;
    isPanningRef.current = true;
    (e.currentTarget as HTMLElement).style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    setPanX(p => p + e.movementX);
    setPanY(p => p + e.movementY);
  }, []);

  const stopPan = useCallback((e: React.MouseEvent) => {
    isPanningRef.current = false;
    (e.currentTarget as HTMLElement).style.cursor = "grab";
  }, []);

  // ── Thumbnail URL cache (local state — signed URLs, not persisted) ─────────
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load signed URLs for all stored thumbnail paths on mount / when frameThumbnails changes
    let alive = true;
    async function loadUrls() {
      const entries = Object.entries(frameThumbnails);
      if (entries.length === 0) return;
      const results: Record<string, string> = {};
      await Promise.all(
        entries.map(async ([segId, path]) => {
          try {
            results[segId] = await getFrameThumbnailUrl(path);
          } catch {
            // skip if URL fetch fails
          }
        })
      );
      if (alive) setThumbnailUrls(prev => ({ ...prev, ...results }));
    }
    loadUrls();
    return () => { alive = false; };
  }, [frameThumbnails]);

  function handleThumbnailUploaded(segId: string, objectUrl: string) {
    setThumbnailUrls(prev => ({ ...prev, [segId]: objectUrl }));
  }

  // ── Modal state ───────────────────────────────────────────────────────────
  const [frameModalSegId, setFrameModalSegId]   = useState<string | null>(null);
  const [transModalId,    setTransModalId]       = useState<string | null>(null);

  // ── Canvas content size ───────────────────────────────────────────────────
  const totalW = segments.length > 0
    ? (segments.length - 1) * STEP + CARD_W + 160  // padding right
    : 600;
  const totalH = CARD_TOP + CARD_H + 160; // padding bottom

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Pan canvas ──────────────────────────────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden bg-zinc-950 cursor-grab select-none"
        style={{ backgroundImage: "radial-gradient(circle, #27272a 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopPan}
        onMouseLeave={stopPan}
      >
        {/* Panning container */}
        <div
          style={{
            position: "absolute",
            transform: `translate(${panX}px, ${panY}px)`,
            width: totalW,
            height: totalH,
          }}
        >
          {segments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-10 text-center">
              <Film size={36} className="text-zinc-700" />
              <p className="text-sm text-zinc-600">No segments yet.</p>
              <p className="text-xs text-zinc-700">Switch to Timeline view to add segments.</p>
            </div>
          ) : (
            <>
              {/* Frame cards */}
              {segments.map((seg, i) => (
                <div key={seg.id} data-board-card="true">
                  <FrameCard
                    segment={seg}
                    index={i}
                    thumbnailUrl={thumbnailUrls[seg.id]}
                    whisperWords={whisperWords}
                    onClick={id => setFrameModalSegId(id)}
                    onUpdateWord={updateWhisperWord}
                  />
                </div>
              ))}

              {/* Transition cards */}
              {transitions.map((trans) => {
                const fromSeg = segments[trans.cutIndex];
                const toSeg   = segments[trans.cutIndex + 1];
                if (!fromSeg || !toSeg) return null;
                return (
                  <div key={trans.id} data-board-card="true">
                    <TransitionCard
                      transition={trans}
                      fromSeg={fromSeg}
                      toSeg={toSeg}
                      index={trans.cutIndex}
                      onClick={id => setTransModalId(id)}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Hint text */}
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-zinc-700 pointer-events-none select-none">
          drag to pan · click a card to inspect
        </p>
      </div>

      {/* ── Right thumbnail panel ─────────────────────────────────────────── */}
      <ThumbnailPanel
        projectId={projectId}
        thumbnailUrls={thumbnailUrls}
        onUploaded={handleThumbnailUploaded}
      />

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <FrameModal
        segmentId={frameModalSegId}
        onClose={() => setFrameModalSegId(null)}
      />
      <TransitionModal
        transitionId={transModalId}
        onClose={() => setTransModalId(null)}
      />
    </div>
  );
}
