export interface CaptionStylePreset {
  id: string;
  label: string;
  description: string;
}

export const CAPTION_STYLES: CaptionStylePreset[] = [
  { id: "hook-punch",    label: "Hook Punch",    description: "Bold punchy captions for hook segments" },
  { id: "fullbg-punch",  label: "Full BG Punch", description: "Bold captions on full-screen backgrounds" },
  { id: "clean-bounce",  label: "Clean Bounce",  description: "Clean minimal captions with bounce entry" },
  { id: "karaoke-stats", label: "Karaoke Stats", description: "Word-by-word karaoke style" },
  { id: "hero-slam",     label: "Hero Slam",     description: "Impact-style captions for hero reveal" },
  { id: "pan-bounce",    label: "Pan Bounce",    description: "Captions that work over panning images" },
  { id: "video-clean",   label: "Video Clean",   description: "Minimal captions for video-only frames" },
];
