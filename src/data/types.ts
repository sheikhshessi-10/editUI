export type AssetKey =
  | "background" | "hook_video" | "hook_image" | "hero_video"
  | "avatar" | "center_card" | "player_1" | "player_2" | "player_3"
  | "pan_image" | "logo_image" | "video";

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface AssetTiming {
  startS: number;
  endS: number | null;
}

export interface Segment {
  id: string;
  moldId: string;
  assets: Partial<Record<AssetKey, string>>;
  assetTiming: Partial<Record<AssetKey, AssetTiming>>;
  startWord: WhisperWord | null;
  endWord: WhisperWord | null;
  startTimeS: number;
  endTimeS: number;
  captionStyle: string;
  emphasisWords: string[];
  line1Text?: string;
  line2Text?: string;
  showBoxLabels?: boolean;
}

export interface Transition {
  id: string;
  cutIndex: number;
  triggerWord: WhisperWord | null;
  morph: boolean;
  morphFunction: string | null;
  lightLeak: "fast" | "2nd" | "double" | "none";
  leakRatio: "70/30" | "50/50" | "30/70";
  redEnergy: boolean;
  woosh: boolean;
}

export type ExtraVFXType = "ZakaSweep" | "WhiteFlash" | "RedEnergyOverlay" | "LightLeakOverlay";

export interface ExtraVFX {
  id: string;
  type: ExtraVFXType;
  triggerWord: WhisperWord | null;
  timeS: number;
}

export interface AudioConfig {
  voiceoverFile: string | null;
  bgMusicVolume: number;
  wooshVolume: number;
}

export type SelectionType = "segment" | "transition" | "extravfx" | null;
