import { useState } from "react";
import { X, Clock } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { AssetSpec } from "../../data/moldRegistry";
import type { AssetTiming } from "../../data/types";
import { useStore } from "../../store/useStore";

interface Props {
  spec: AssetSpec;
  assignedFile: string | null;
  segmentId: string;
  timing?: AssetTiming;
}

const VIDEO_EXTS = [".mp4", ".webm", ".mov"];

function isVideoFile(filename: string): boolean {
  return VIDEO_EXTS.some(ext => filename.toLowerCase().endsWith(ext));
}

export function AssetSlot({ spec, assignedFile, segmentId, timing }: Props) {
  const { setSegmentAsset, setSegmentAssetTiming, availableFiles } = useStore(useShallow(s => ({
    setSegmentAsset: s.setSegmentAsset,
    setSegmentAssetTiming: s.setSegmentAssetTiming,
    availableFiles: s.availableFiles,
  })));

  const [showTiming, setShowTiming] = useState(!!timing);

  const matchingFiles = availableFiles.filter(f =>
    spec.accepts.some(ext => f.toLowerCase().endsWith(ext))
  );

  const isEmpty = !assignedFile;
  const isVideo = assignedFile ? isVideoFile(assignedFile) : false;
  const borderClass = isEmpty && spec.required
    ? "border-red-500/50"
    : assignedFile
    ? "border-emerald-500/50"
    : "border-zinc-700";

  function handleTimingChange(field: "startS" | "endS", raw: string) {
    const val = parseFloat(raw);
    if (field === "startS") {
      if (isNaN(val) || val < 0) return;
      setSegmentAssetTiming(segmentId, spec.key, {
        startS: val,
        endS: timing?.endS ?? null,
      });
    } else {
      const endVal = raw === "" ? null : val;
      if (endVal !== null && (isNaN(endVal) || endVal < 0)) return;
      setSegmentAssetTiming(segmentId, spec.key, {
        startS: timing?.startS ?? 0,
        endS: endVal,
      });
    }
  }

  function toggleTiming() {
    if (showTiming) {
      setSegmentAssetTiming(segmentId, spec.key, null);
      setShowTiming(false);
    } else {
      setSegmentAssetTiming(segmentId, spec.key, { startS: 0, endS: null });
      setShowTiming(true);
    }
  }

  return (
    <div className={`rounded-md border p-2 ${borderClass}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-300">
          {spec.label}
          {spec.required && <span className="ml-1 text-red-400">*</span>}
        </span>
        <div className="flex items-center gap-1">
          {isVideo && (
            <button
              onClick={toggleTiming}
              className={`rounded p-0.5 transition ${showTiming ? "text-emerald-400 bg-emerald-500/15" : "text-zinc-600 hover:text-zinc-400"}`}
              title={showTiming ? "Remove trim points" : "Set video trim (in/out)"}
            >
              <Clock size={12} />
            </button>
          )}
          {assignedFile && (
            <button
              onClick={() => { setSegmentAsset(segmentId, spec.key, null); setSegmentAssetTiming(segmentId, spec.key, null); setShowTiming(false); }}
              className="text-zinc-600 hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      {spec.note && (
        <p className="mb-1 text-[9px] italic text-zinc-600">{spec.note}</p>
      )}
      <select
        value={assignedFile ?? ""}
        onChange={e => setSegmentAsset(segmentId, spec.key, e.target.value || null)}
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
      >
        <option value="">— select —</option>
        {matchingFiles.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      {spec.isContin && !showTiming && (
        <span className="mt-0.5 inline-block text-[8px] text-blue-400">continuous (startFrom synced)</span>
      )}

      {/* Video trim controls */}
      {isVideo && showTiming && (
        <div className="mt-1.5 rounded border border-zinc-700/60 bg-zinc-800/50 p-1.5">
          <div className="mb-1 text-[9px] font-medium text-zinc-400">Video Trim</div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-0.5 block text-[8px] text-zinc-500">Start (s)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={timing?.startS ?? 0}
                onChange={e => handleTimingChange("startS", e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-200 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-0.5 block text-[8px] text-zinc-500">End (s) <span className="text-zinc-600">blank = full</span></label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={timing?.endS ?? ""}
                onChange={e => handleTimingChange("endS", e.target.value)}
                placeholder="—"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-200 outline-none placeholder:text-zinc-700"
              />
            </div>
          </div>
          {timing && timing.endS !== null && timing.endS > timing.startS && (
            <div className="mt-1 text-[8px] text-emerald-500">
              Plays {(timing.endS - timing.startS).toFixed(1)}s of video ({timing.startS.toFixed(1)}s → {timing.endS.toFixed(1)}s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
