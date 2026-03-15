import type { AssetKey } from "./types";

export interface AssetSpec {
  key: AssetKey;
  label: string;
  required: boolean;
  accepts: string[];
  isContin: boolean;
  note?: string;
}

export interface MoldDef {
  id: string;
  label: string;
  description: string;
  color: string;
  group: "starting" | "body" | "card" | "ending";
  hasCaptions: boolean;
  captionStyleDefault: string | null;
  hasTypography: boolean;
  durationType: "whisper" | "fixed5";
  assets: AssetSpec[];
  hasInternalAudio: boolean;
  fixedMorphIncoming: string | null;
  fixedMorphOutgoing: string | null;
  validIncomingMorph: string | null;
}

export const MOLD_REGISTRY: Record<string, MoldDef> = {
  StartingFrame: {
    id: "StartingFrame",
    label: "Starting Frame",
    description: "Hook video top 65% + avatar + typography bottom",
    color: "#FF6B35",
    group: "starting",
    hasCaptions: true,
    captionStyleDefault: "hook-punch",
    hasTypography: true,
    durationType: "whisper",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: true },
      { key: "hook_video", label: "Hook Video", required: true, accepts: [".mp4"], isContin: true },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: "calcLayoutExpansion",
    validIncomingMorph: null,
  },

  StartingFrameHookFullBg: {
    id: "StartingFrameHookFullBg",
    label: "Starting Frame – Hook Full BG",
    description: "Hook video fills entire canvas + avatar + typography",
    color: "#D63031",
    group: "starting",
    hasCaptions: true,
    captionStyleDefault: "fullbg-punch",
    hasTypography: true,
    durationType: "whisper",
    assets: [
      { key: "hook_video", label: "Hook Video (Full BG)", required: true, accepts: [".mp4"], isContin: true },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  StartingFrameLogoFullBg: {
    id: "StartingFrameLogoFullBg",
    label: "Starting Frame – Logo Full BG",
    description: "Static logo/brand image fills canvas + avatar + typography",
    color: "#E84393",
    group: "starting",
    hasCaptions: true,
    captionStyleDefault: "hook-punch",
    hasTypography: true,
    durationType: "whisper",
    assets: [
      { key: "logo_image", label: "Logo/Brand Image (Full BG)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  SimpleAvatarFrame: {
    id: "SimpleAvatarFrame",
    label: "Simple Avatar Frame",
    description: "Clean full-height avatar only + captions",
    color: "#4ECDC4",
    group: "body",
    hasCaptions: true,
    captionStyleDefault: "clean-bounce",
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: true },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: "calcLayoutExpansion",
    fixedMorphOutgoing: "calcHookReturn",
    validIncomingMorph: "StartingFrame",
  },

  AvatarWithPicture: {
    id: "AvatarWithPicture",
    label: "Avatar with Picture",
    description: "Avatar (60%) + hook video OR image in top 35% (masked)",
    color: "#45B7D1",
    group: "body",
    hasCaptions: true,
    captionStyleDefault: "karaoke-stats",
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: true },
      { key: "hook_video", label: "Hook Video (or use Hook Image)", required: false, accepts: [".mp4"], isContin: true, note: "Use hook video OR hook image — not both." },
      { key: "hook_image", label: "Hook Image (or use Hook Video)", required: false, accepts: [".jpg",".jpeg",".png"], isContin: false, note: "Static image. Use instead of hook video." },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: "calcHookReturn",
    fixedMorphOutgoing: "calcHeroImpact",
    validIncomingMorph: "SimpleAvatarFrame",
  },

  AvatarWithVideo: {
    id: "AvatarWithVideo",
    label: "Avatar with Video",
    description: "Avatar (60%) + hero video in top 35% (new clip, NOT continuous)",
    color: "#F7DC6F",
    group: "body",
    hasCaptions: true,
    captionStyleDefault: "hero-slam",
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: true },
      { key: "hook_video", label: "Hook Video (bg texture layer)", required: true, accepts: [".mp4"], isContin: true, note: "Plays behind the hero video. Is continuous." },
      { key: "hero_video", label: "Hero Video (NEW clip — no startFrom)", required: true, accepts: [".mp4"], isContin: false, note: "Starts from frame 0 when this mold begins." },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: "calcHeroImpact",
    fixedMorphOutgoing: "calcAvatarFillScreen",
    validIncomingMorph: "AvatarWithPicture",
  },

  AvatarWithImagePan: {
    id: "AvatarWithImagePan",
    label: "Avatar with Image Pan",
    description: "Full-screen panning image IS the background + avatar + captions",
    color: "#74B9FF",
    group: "body",
    hasCaptions: true,
    captionStyleDefault: "pan-bounce",
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "pan_image", label: "Panning Image (full-screen)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  AvatarWithImagePanAbove: {
    id: "AvatarWithImagePanAbove",
    label: "Avatar with Image Pan (Above)",
    description: "Background + panning image in top 35% zone + avatar + captions",
    color: "#0984E3",
    group: "body",
    hasCaptions: true,
    captionStyleDefault: "pan-bounce",
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: true },
      { key: "pan_image", label: "Panning Image (top zone)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  OnlyVideo: {
    id: "OnlyVideo",
    label: "Only Video",
    description: "Full-screen video + captions only. No avatar, no background.",
    color: "#636E72",
    group: "body",
    hasCaptions: true,
    captionStyleDefault: "video-clean",
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "video", label: "Full Screen Video", required: true, accepts: [".mp4"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  OnlyBackgroundCenter: {
    id: "OnlyBackgroundCenter",
    label: "Only Background + Center Card",
    description: "Background + bouncing center card. No avatar, no captions. Fixed 5s.",
    color: "#00B894",
    group: "card",
    hasCaptions: false,
    captionStyleDefault: null,
    hasTypography: false,
    durationType: "fixed5",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "center_card", label: "Center Card Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  OnlyBackgroundCenterWithAvatar: {
    id: "OnlyBackgroundCenterWithAvatar",
    label: "Background + Center Card + Avatar",
    description: "Background + bouncing center card + avatar. Fixed 5s.",
    color: "#00CEC9",
    group: "card",
    hasCaptions: false,
    captionStyleDefault: null,
    hasTypography: false,
    durationType: "fixed5",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "center_card", label: "Center Card Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  ThreeBoxesFrame: {
    id: "ThreeBoxesFrame",
    label: "Three Boxes Frame",
    description: "3 image boxes slide in staggered. Has internal woosh. Fixed 5s.",
    color: "#FDCB6E",
    group: "card",
    hasCaptions: false,
    captionStyleDefault: null,
    hasTypography: false,
    durationType: "fixed5",
    assets: [
      { key: "player_1", label: "Box 1 Image (slides LEFT)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "player_2", label: "Box 2 Image (slides RIGHT)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "player_3", label: "Box 3 Image (slides LEFT)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
    ],
    hasInternalAudio: true,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  TwoBoxesWithAvatarFrame: {
    id: "TwoBoxesWithAvatarFrame",
    label: "Two Boxes + Avatar Frame",
    description: "2 image boxes + dark YOU? box + avatar slides in. Has internal woosh. Fixed 5s.",
    color: "#E17055",
    group: "card",
    hasCaptions: false,
    captionStyleDefault: null,
    hasTypography: false,
    durationType: "fixed5",
    assets: [
      { key: "player_1", label: "Box 1 Image (slides LEFT)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "player_2", label: "Box 2 Image (slides RIGHT)", required: true, accepts: [".jpg",".jpeg",".png"], isContin: false },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: false, note: "Avatar has NO startFrom — resets to frame 0." },
    ],
    hasInternalAudio: true,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },

  EndingAvatar: {
    id: "EndingAvatar",
    label: "Ending Avatar",
    description: "Avatar fill-scaled to canvas. Background only. No captions.",
    color: "#A29BFE",
    group: "ending",
    hasCaptions: false,
    captionStyleDefault: null,
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "background", label: "Background Image", required: true, accepts: [".jpg",".jpeg",".png"], isContin: true },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: "calcAvatarFillScreen",
    fixedMorphOutgoing: null,
    validIncomingMorph: "AvatarWithVideo",
  },

  EndingAvatarHookFullBg: {
    id: "EndingAvatarHookFullBg",
    label: "Ending Avatar – Hook Full BG",
    description: "Avatar fill-scaled. Hook video as full-screen background. No captions.",
    color: "#6C5CE7",
    group: "ending",
    hasCaptions: false,
    captionStyleDefault: null,
    hasTypography: false,
    durationType: "whisper",
    assets: [
      { key: "hook_video", label: "Hook Video (Full BG)", required: true, accepts: [".mp4"], isContin: true },
      { key: "avatar", label: "Avatar (.webm)", required: true, accepts: [".webm"], isContin: true },
    ],
    hasInternalAudio: false,
    fixedMorphIncoming: null,
    fixedMorphOutgoing: null,
    validIncomingMorph: null,
  },
};

export const MOLD_GROUPS = [
  { key: "starting" as const, label: "STARTING" },
  { key: "body" as const, label: "BODY" },
  { key: "card" as const, label: "CARD" },
  { key: "ending" as const, label: "ENDING" },
];
