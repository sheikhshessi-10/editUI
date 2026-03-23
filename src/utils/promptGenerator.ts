import type { Segment, Transition, ExtraVFX, AudioConfig, AssetKey, WhisperWord } from "../data/types";
import { MOLD_REGISTRY, type AssetSpec } from "../data/moldRegistry";
import { LIGHT_LEAK_OPTIONS, EXTRA_VFX_OPTIONS } from "../data/transitionRegistry";

interface PromptState {
  videoId: string;
  segments: Segment[];
  transitions: Transition[];
  extraVfx: ExtraVFX[];
  audio: AudioConfig;
  whisperWords: WhisperWord[];
}

const FPS = 30;

const CORE_ASSET_KEYS: AssetKey[] = [
  "background", "avatar", "hook_video", "hook_image", "hero_video",
];

const SPECIALTY_ASSET_KEYS: AssetKey[] = [
  "center_card", "pan_image", "logo_image", "video", "player_1", "player_2", "player_3",
];

function leakFrames(leakType: string): number {
  return LIGHT_LEAK_OPTIONS.find(o => o.id === leakType)?.frames ?? 0;
}

function vfxDefaultFrames(type: string): number {
  return EXTRA_VFX_OPTIONS.find(o => o.id === type)?.defaultDurationFrames ?? 15;
}

function extractFilename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1];
}

function buildAssetDescription(spec: AssetSpec): string {
  const parts: string[] = [spec.label];
  if (spec.note) parts.push(spec.note);
  if (spec.isContin) parts.push("Continuous asset — uses startFrom.");
  if (spec.key === "hero_video") parts.push("Starts from frame 0 when this mold begins (no startFrom).");
  return parts.join(" ");
}

export function generateAssemblyJSON(state: PromptState): object {
  const { videoId, segments, transitions, extraVfx, audio, whisperWords } = state;

  const lastWord = whisperWords.length > 0 ? whisperWords[whisperWords.length - 1] : null;
  const totalDurationS = segments.length > 0
    ? segments[segments.length - 1].endTimeS
    : (lastWord?.end ?? 0);

  const totalFrames = segments.reduce((sum, seg) => {
    return sum + Math.round((seg.endTimeS - seg.startTimeS) * FPS);
  }, 0);

  // --- Collect all unique asset filenames across segments ---
  const coreAssets: Record<string, string | null> = {};
  CORE_ASSET_KEYS.forEach(k => { coreAssets[k] = null; });
  const specialtyAssets: Record<string, string | null> = {};
  SPECIALTY_ASSET_KEYS.forEach(k => { specialtyAssets[k] = null; });

  segments.forEach(seg => {
    Object.entries(seg.assets).forEach(([key, filePath]) => {
      if (!filePath) return;
      const filename = extractFilename(filePath);
      if (CORE_ASSET_KEYS.includes(key as AssetKey)) {
        if (!coreAssets[key]) coreAssets[key] = filename;
      } else {
        if (!specialtyAssets[key]) specialtyAssets[key] = filename;
      }
    });
  });
  if (audio.voiceoverFile) {
    coreAssets["voiceover"] = extractFilename(audio.voiceoverFile);
  }

  // --- Starting frame text ---
  const typographySeg = segments.find(s => MOLD_REGISTRY[s.moldId]?.hasTypography);
  const startingFrameText = typographySeg
    ? { line1: typographySeg.line1Text ?? "", line2: typographySeg.line2Text ?? "" }
    : null;

  // --- Build segments array ---
  const jsonSegments = segments.map((seg, i) => {
    const mold = MOLD_REGISTRY[seg.moldId];
    const durationS = parseFloat((seg.endTimeS - seg.startTimeS).toFixed(4));
    const durationFrames = Math.round(durationS * FPS);

    const assetRequirements = (mold?.assets ?? []).map(spec => {
      const rawFile = seg.assets[spec.key] ?? null;
      const filename = rawFile ? extractFilename(rawFile) : null;
      const timing = seg.assetTiming[spec.key] ?? null;
      const entry: Record<string, unknown> = {
        asset: spec.key,
        file: filename,
        required: spec.required,
        isContin: spec.isContin,
        description: buildAssetDescription(spec),
      };
      if (timing) {
        entry.videoTrim = {
          startS: timing.startS,
          endS: timing.endS,
        };
      }
      return entry;
    });

    const result: Record<string, unknown> = {
      seg: i + 1,
      frame: seg.moldId,
      startS: parseFloat(seg.startTimeS.toFixed(4)),
      endS: parseFloat(seg.endTimeS.toFixed(4)),
      durationS,
      durationFrames,
      startWord: seg.startWord ? seg.startWord.word : null,
      startWordTimeS: seg.startWord ? parseFloat(seg.startWord.start.toFixed(4)) : null,
      endWord: seg.endWord ? seg.endWord.word : null,
      endWordTimeS: seg.endWord ? parseFloat(seg.endWord.end.toFixed(4)) : null,
      hasCaptions: mold?.hasCaptions ?? false,
      captionStyle: (mold?.hasCaptions) ? seg.captionStyle : null,
      emphasisWords: seg.emphasisWords,
      assetRequirements,
    };

    if (mold?.hasTypography) {
      result.line1Text = seg.line1Text ?? "";
      result.line2Text = seg.line2Text ?? "";
    }

    if (seg.moldId === "ThreeBoxesFrame" || seg.moldId === "TwoBoxesWithAvatarFrame") {
      result.showBoxLabels = seg.showBoxLabels ?? false;
    }

    return result;
  });

  // --- Build transitions array ---
  const jsonTransitions = transitions.map((t, i) => {
    const fromSeg = segments[i];
    const toSeg = segments[i + 1];
    const leakDur = leakFrames(t.lightLeak);

    const entry: Record<string, unknown> = {
      cut: i + 1,
      fromSeg: i + 1,
      toSeg: i + 2,
      fromFrame: fromSeg?.moldId ?? null,
      toFrame: toSeg?.moldId ?? null,
      triggerWord: t.triggerWord ? t.triggerWord.word : null,
      triggerTimeS: t.triggerWord ? parseFloat(t.triggerWord.start.toFixed(4)) : null,
      morph: t.morph,
      morphFunction: t.morph ? t.morphFunction : null,
      lightLeak: t.lightLeak,
      woosh: t.woosh,
      redEnergy: t.redEnergy,
    };

    if (t.lightLeak !== "none" && leakDur > 0) {
      entry.leakDurationFrames = leakDur;
      entry.leakRatio = t.leakRatio;
    }

    return entry;
  });

  // --- Extra VFX ---
  const jsonExtraVfx = extraVfx.map(vfx => ({
    type: vfx.type,
    timeS: parseFloat(vfx.timeS.toFixed(4)),
    durationFrames: vfxDefaultFrames(vfx.type),
    triggerWord: vfx.triggerWord ? vfx.triggerWord.word : null,
  }));

  // --- Specialty notes ---
  const usedMoldIds = new Set(segments.map(s => s.moldId));
  const specialtyNotes: Record<string, unknown> = {
    threeBoxesFrame: usedMoldIds.has("ThreeBoxesFrame")
      ? { boxLabels: segments.find(s => s.moldId === "ThreeBoxesFrame")?.showBoxLabels ?? false }
      : null,
    twoBoxesWithAvatarFrame: usedMoldIds.has("TwoBoxesWithAvatarFrame")
      ? { boxLabels: segments.find(s => s.moldId === "TwoBoxesWithAvatarFrame")?.showBoxLabels ?? false }
      : null,
    onlyBackgroundCenter: usedMoldIds.has("OnlyBackgroundCenter") || usedMoldIds.has("OnlyBackgroundCenterWithAvatar")
      ? { used: true }
      : null,
  };

  // --- Assemble the full JSON (matching ARCHITECT.md Section 7 schema) ---
  const assembly: Record<string, unknown> = {
    meta: {
      videoId,
      totalDurationS: parseFloat(totalDurationS.toFixed(4)),
      totalFrames,
      fps: FPS,
    },

    whisper: {
      path: `public/assets/${videoId}/${videoId}-whisper.json`,
    },

    assets: {
      core: coreAssets,
      specialty: specialtyAssets,
    },
  };

  if (startingFrameText) {
    assembly.startingFrameText = startingFrameText;
  }

  assembly.segments = jsonSegments;
  assembly.transitions = jsonTransitions;
  assembly.extraVfx = jsonExtraVfx;
  assembly.kineticOverlays = [];
  assembly.specialtyNotes = specialtyNotes;

  assembly.audio = {
    bgMusicVolume: audio.bgMusicVolume,
    wooshVolume: audio.wooshVolume,
    voiceoverFile: audio.voiceoverFile ? extractFilename(audio.voiceoverFile) : null,
  };

  return assembly;
}
