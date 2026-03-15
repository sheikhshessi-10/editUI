import type { ExtraVFXType } from "./types";

export interface LightLeakOption {
  id: "fast" | "2nd" | "double" | "none";
  label: string;
  frames: number;
  durationS: number;
}

export const LIGHT_LEAK_OPTIONS: LightLeakOption[] = [
  { id: "fast",   label: "Fast (0.97s / 29fr)",   frames: 29, durationS: 0.972 },
  { id: "2nd",    label: "2nd (1.01s / 30fr)",    frames: 30, durationS: 1.008 },
  { id: "double", label: "Double (1.76s / 53fr)", frames: 53, durationS: 1.758 },
  { id: "none",   label: "None",                  frames: 0,  durationS: 0 },
];

export const LEAK_RATIO_OPTIONS = ["70/30", "50/50", "30/70"] as const;

export interface FixedMorphDef {
  fn: string;
  sourceMold: string;
  destMold: string;
  label: string;
  localTriggerFrame: number;
}

export const FIXED_MORPHS: FixedMorphDef[] = [
  { fn: "calcLayoutExpansion",  sourceMold: "StartingFrame",     destMold: "SimpleAvatarFrame", label: "Layout Expansion",   localTriggerFrame: 5  },
  { fn: "calcHookReturn",       sourceMold: "SimpleAvatarFrame", destMold: "AvatarWithPicture", label: "Hook Return",        localTriggerFrame: 23 },
  { fn: "calcHeroImpact",       sourceMold: "AvatarWithPicture", destMold: "AvatarWithVideo",   label: "Hero Impact",        localTriggerFrame: 23 },
  { fn: "calcAvatarFillScreen", sourceMold: "AvatarWithVideo",   destMold: "EndingAvatar",      label: "Avatar Fill Screen", localTriggerFrame: 24 },
];

export const EXTRA_VFX_OPTIONS: { id: ExtraVFXType; label: string; defaultDurationFrames: number }[] = [
  { id: "ZakaSweep",        label: "Zaka Sweep",         defaultDurationFrames: 15 },
  { id: "WhiteFlash",       label: "White Flash",        defaultDurationFrames: 4  },
  { id: "RedEnergyOverlay", label: "Red Energy Overlay", defaultDurationFrames: 24 },
  { id: "LightLeakOverlay", label: "Light Leak (CSS)",   defaultDurationFrames: 18 },
];
