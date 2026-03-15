import type { Segment } from "../data/types";
import type { MoldDef } from "../data/moldRegistry";

export interface SegmentValidationResult {
  segmentId: string;
  missingAssets: string[];
  hasHookConflict: boolean;
  hasHookMissing: boolean;
  isValid: boolean;
}

export function validateSegment(seg: Segment, moldDef: MoldDef): SegmentValidationResult {
  const missing: string[] = [];
  let hookConflict = false;
  let hookMissing = false;

  if (moldDef.id === "AvatarWithPicture") {
    const hasVideo = !!seg.assets["hook_video"];
    const hasImage = !!seg.assets["hook_image"];
    if (hasVideo && hasImage) hookConflict = true;
    if (!hasVideo && !hasImage) hookMissing = true;
  }

  for (const spec of moldDef.assets) {
    if (moldDef.id === "AvatarWithPicture" && (spec.key === "hook_video" || spec.key === "hook_image")) continue;
    if (spec.required && !seg.assets[spec.key]) {
      missing.push(spec.label);
    }
  }

  return {
    segmentId: seg.id,
    missingAssets: missing,
    hasHookConflict: hookConflict,
    hasHookMissing: hookMissing,
    isValid: missing.length === 0 && !hookConflict && !hookMissing,
  };
}
