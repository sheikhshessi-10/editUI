import { useEffect } from "react";
import { X } from "lucide-react";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { SegmentInspector } from "../inspector/SegmentInspector";

interface FrameModalProps {
  segmentId: string | null;
  onClose: () => void;
}

export function FrameModal({ segmentId, onClose }: FrameModalProps) {
  const select   = useStore(s => s.select);
  const segments = useStore(s => s.segments);

  // Drive the inspector by selecting this segment in the store
  useEffect(() => {
    if (segmentId) {
      select("segment", segmentId);
    }
    return () => {
      if (segmentId) select(null, null);
    };
  }, [segmentId, select]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!segmentId) return null;

  const segment = segments.find(s => s.id === segmentId);
  if (!segment) return null;

  const mold  = MOLD_REGISTRY[segment.moldId];
  const color = mold?.color ?? "#52525b";
  const label = mold?.label ?? segment.moldId;
  const index = segments.indexOf(segment);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Modal box */}
      <div
        className="w-[360px] max-h-[85vh] flex flex-col bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
          <span className="text-xs font-bold text-zinc-200 flex-1 truncate">{label}</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ background: `${color}30`, color }}
          >
            SEG {index + 1}
          </span>
          <button
            onClick={onClose}
            className="ml-1 rounded p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Inspector body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <SegmentInspector segment={segment} index={index} />
        </div>
      </div>
    </div>
  );
}
