import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../store/useStore";
import { MOLD_REGISTRY } from "../data/moldRegistry";
import { validateSegment } from "../utils/assetValidator";

export interface ValidationIssue {
  type: "global" | "segment" | "transition";
  id?: string;
  msg: string;
}

export function useValidation(): ValidationIssue[] {
  const { videoId, segments, transitions } = useStore(useShallow(s => ({
    videoId: s.videoId,
    segments: s.segments,
    transitions: s.transitions,
  })));

  return useMemo(() => {
    const issues: ValidationIssue[] = [];

    if (!videoId) issues.push({ type: "global", msg: "Video ID is required" });
    if (segments.length === 0) issues.push({ type: "global", msg: "Add at least one segment" });

    segments.forEach((seg, i) => {
      const mold = MOLD_REGISTRY[seg.moldId];
      if (!mold) return;

      const result = validateSegment(seg, mold);
      result.missingAssets.forEach(label => {
        issues.push({ type: "segment", id: seg.id, msg: `SEG${i + 1}: Missing "${label}"` });
      });
      if (result.hasHookMissing) {
        issues.push({ type: "segment", id: seg.id, msg: `SEG${i + 1}: Must have either Hook Video or Hook Image` });
      }
      if (result.hasHookConflict) {
        issues.push({ type: "segment", id: seg.id, msg: `SEG${i + 1}: Has both Hook Video and Hook Image — remove one` });
      }
      if (mold.durationType === "whisper" && !seg.endWord) {
        issues.push({ type: "segment", id: seg.id, msg: `SEG${i + 1}: End word not set` });
      }
    });

    // Trigger words are optional — no validation needed

    return issues;
  }, [videoId, segments, transitions]);
}
