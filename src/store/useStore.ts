import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Segment, Transition, ExtraVFX, AudioConfig, SelectionType, WhisperWord, AssetKey, AssetTiming, ExtraVFXType } from "../data/types";
import { MOLD_REGISTRY } from "../data/moldRegistry";
import { FIXED_MORPHS } from "../data/transitionRegistry";
import { generateAssemblyJSON } from "../utils/promptGenerator";

let _nextId = 1;
function uid() { return `id-${_nextId++}-${Date.now().toString(36)}`; }

function findMorph(srcMold: string, dstMold: string) {
  return FIXED_MORPHS.find(m => m.sourceMold === srcMold && m.destMold === dstMold) ?? null;
}

function buildTransition(cutIndex: number, srcMold: string, dstMold: string): Transition {
  const morph = findMorph(srcMold, dstMold);
  return {
    id: uid(),
    cutIndex,
    triggerWord: null,
    morph: !!morph,
    morphFunction: morph?.fn ?? null,
    lightLeak: "none",
    leakRatio: "70/30",
    redEnergy: false,
    woosh: true,
  };
}

function rebuildTransitions(segments: Segment[], existing: Transition[]): Transition[] {
  const result: Transition[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const prev = existing.find(t => t.cutIndex === i);
    if (prev) {
      const morph = findMorph(segments[i].moldId, segments[i + 1].moldId);
      result.push({
        ...prev,
        cutIndex: i,
        morphFunction: morph?.fn ?? null,
        morph: morph ? prev.morph : false,
      });
    } else {
      result.push(buildTransition(i, segments[i].moldId, segments[i + 1].moldId));
    }
  }
  return result;
}

export function findClosestWord(words: WhisperWord[], timeS: number, edge: "start" | "end"): WhisperWord | null {
  if (words.length === 0) return null;
  let best: WhisperWord | null = null;
  let bestDist = Infinity;
  for (const w of words) {
    const t = edge === "start" ? w.start : w.end;
    const dist = Math.abs(t - timeS);
    if (dist < bestDist) {
      bestDist = dist;
      best = w;
    }
  }
  return best;
}

function rippleSegmentTimes(segments: Segment[], words: WhisperWord[]): Segment[] {
  const result: Segment[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = { ...segments[i] };
    if (i === 0) {
      seg.startTimeS = 0;
      seg.startWord = null;
    } else {
      const prevEnd = result[i - 1].endTimeS;
      seg.startTimeS = prevEnd;
      seg.startWord = findClosestWord(words, prevEnd, "start");
    }
    if (MOLD_REGISTRY[seg.moldId]?.durationType === "fixed5") {
      seg.endTimeS = seg.startTimeS + 5;
      seg.endWord = findClosestWord(words, seg.endTimeS, "end");
    }
    result.push(seg);
  }
  return result;
}

interface AppState {
  projectFolderName: string;
  videoId: string;
  whisperWords: WhisperWord[];
  availableFiles: string[];

  segments: Segment[];
  transitions: Transition[];
  extraVfx: ExtraVFX[];

  audio: AudioConfig;

  selectedType: SelectionType;
  selectedId: string | null;

  loadProject(folderName: string, files: string[], whisperWords: WhisperWord[]): void;
  setVideoId(id: string): void;
  addSegment(moldId: string, atIndex?: number): void;
  removeSegment(segId: string): void;
  reorderSegments(activeId: string, overId: string): void;
  setSegmentAsset(segId: string, assetKey: AssetKey, filename: string | null): void;
  setSegmentAssetTiming(segId: string, assetKey: AssetKey, timing: AssetTiming | null): void;
  setSegmentBoundary(segId: string, side: "start" | "end", word: WhisperWord): void;
  updateWhisperWord(wordStart: number, newText: string): void;
  setSegmentCaptionStyle(segId: string, style: string): void;
  setSegmentEmphasisWords(segId: string, words: string[]): void;
  setSegmentTypography(segId: string, line1: string, line2: string): void;
  setSegmentShowBoxLabels(segId: string, show: boolean): void;
  swapSegmentMold(segId: string, newMoldId: string): void;
  resizeSegmentEnd(segId: string, newEndTimeS: number): void;
  updateTransition(transId: string, patch: Partial<Transition>): void;
  addExtraVFX(type: ExtraVFXType): void;
  updateExtraVFX(id: string, patch: Partial<ExtraVFX>): void;
  removeExtraVFX(id: string): void;
  setAudio(patch: Partial<AudioConfig>): void;
  select(type: SelectionType, id: string | null): void;
  autoAssignAssets(): void;
  getAssemblyJSON(): object;
  exportProjectJSON(): string;
  importProjectJSON(json: string): void;
  clearProject(): void;
}

export const useStore = create<AppState>()(persist((set, get) => ({
  projectFolderName: "",
  videoId: "",
  whisperWords: [],
  availableFiles: [],

  segments: [],
  transitions: [],
  extraVfx: [],

  audio: { voiceoverFile: null, bgMusicVolume: 0.05, wooshVolume: 0.22 },

  selectedType: null,
  selectedId: null,

  loadProject(folderName, files, whisperWords) {
    set({ projectFolderName: folderName, availableFiles: files, whisperWords });
  },

  setVideoId(id) { set({ videoId: id }); },

  addSegment(moldId, atIndex) {
    const mold = MOLD_REGISTRY[moldId];
    if (!mold) return;
    set(state => {
      const segs = [...state.segments];
      const idx = atIndex !== undefined ? atIndex : segs.length;
      const prevEnd = idx > 0 ? segs[idx - 1].endTimeS : 0;
      const startWord = idx > 0 ? findClosestWord(state.whisperWords, prevEnd, "start") : null;
      const endTimeS = mold.durationType === "fixed5" ? prevEnd + 5 : prevEnd;
      const endWord = mold.durationType === "fixed5"
        ? findClosestWord(state.whisperWords, endTimeS, "end")
        : null;
      const seg: Segment = {
        id: uid(),
        moldId,
        assets: {},
        assetTiming: {},
        startWord,
        endWord,
        startTimeS: prevEnd,
        endTimeS,
        captionStyle: mold.captionStyleDefault ?? "",
        emphasisWords: [],
        line1Text: mold.hasTypography ? "" : undefined,
        line2Text: mold.hasTypography ? "" : undefined,
      };
      segs.splice(idx, 0, seg);
      return {
        segments: segs,
        transitions: rebuildTransitions(segs, state.transitions),
        selectedType: "segment" as const,
        selectedId: seg.id,
      };
    });
  },

  removeSegment(segId) {
    set(state => {
      const idx = state.segments.findIndex(s => s.id === segId);
      if (idx === -1) return state;
      const segs = state.segments.filter(s => s.id !== segId);
      const rippled = rippleSegmentTimes(segs, state.whisperWords);
      return {
        segments: rippled,
        transitions: rebuildTransitions(rippled, state.transitions),
        selectedType: null,
        selectedId: null,
      };
    });
  },

  reorderSegments(activeId, overId) {
    set(state => {
      const segs = [...state.segments];
      const oldIdx = segs.findIndex(s => s.id === activeId);
      const newIdx = segs.findIndex(s => s.id === overId);
      if (oldIdx === -1 || newIdx === -1) return state;
      const [moved] = segs.splice(oldIdx, 1);
      segs.splice(newIdx, 0, moved);
      const rippled = rippleSegmentTimes(segs, state.whisperWords);
      return {
        segments: rippled,
        transitions: rebuildTransitions(rippled, state.transitions),
      };
    });
  },

  setSegmentAsset(segId, assetKey, filename) {
    set(state => ({
      segments: state.segments.map(s =>
        s.id === segId
          ? { ...s, assets: { ...s.assets, [assetKey]: filename ?? undefined } }
          : s
      ),
    }));
  },

  setSegmentAssetTiming(segId, assetKey, timing) {
    set(state => ({
      segments: state.segments.map(s => {
        if (s.id !== segId) return s;
        const updated = { ...s.assetTiming };
        if (timing) {
          updated[assetKey] = timing;
        } else {
          delete updated[assetKey];
        }
        return { ...s, assetTiming: updated };
      }),
    }));
  },

  setSegmentBoundary(segId, side, word) {
    set(state => {
      const segs = state.segments.map(s => {
        if (s.id !== segId) return s;
        if (side === "start") {
          return { ...s, startWord: word, startTimeS: word.start };
        }
        return { ...s, endWord: word, endTimeS: word.end };
      });
      const rippled = rippleSegmentTimes(segs, state.whisperWords);
      return {
        segments: rippled,
        transitions: rebuildTransitions(rippled, state.transitions),
      };
    });
  },

  resizeSegmentEnd(segId, newEndTimeS) {
    set(state => {
      const idx = state.segments.findIndex(s => s.id === segId);
      if (idx === -1) return state;
      const seg = state.segments[idx];
      const minEnd = seg.startTimeS + 0.1;
      const clamped = Math.max(minEnd, newEndTimeS);
      const endWord = findClosestWord(state.whisperWords, clamped, "end");
      const finalEnd = endWord ? endWord.end : clamped;
      const segs = state.segments.map((s, i) => {
        if (i === idx) return { ...s, endTimeS: finalEnd, endWord };
        return s;
      });
      const rippled = rippleSegmentTimes(segs, state.whisperWords);
      return {
        segments: rippled,
        transitions: rebuildTransitions(rippled, state.transitions),
      };
    });
  },

  updateWhisperWord(wordStart, newText) {
    set(state => {
      const whisperWords = state.whisperWords.map(w =>
        w.start === wordStart ? { ...w, word: newText } : w
      );
      const segments = state.segments.map(s => ({
        ...s,
        startWord: s.startWord?.start === wordStart ? { ...s.startWord, word: newText } : s.startWord,
        endWord: s.endWord?.start === wordStart ? { ...s.endWord, word: newText } : s.endWord,
      }));
      return { whisperWords, segments };
    });
  },

  setSegmentCaptionStyle(segId, style) {
    set(state => ({
      segments: state.segments.map(s => s.id === segId ? { ...s, captionStyle: style } : s),
    }));
  },

  setSegmentEmphasisWords(segId, words) {
    set(state => ({
      segments: state.segments.map(s => s.id === segId ? { ...s, emphasisWords: words } : s),
    }));
  },

  setSegmentTypography(segId, line1, line2) {
    set(state => ({
      segments: state.segments.map(s => s.id === segId ? { ...s, line1Text: line1, line2Text: line2 } : s),
    }));
  },

  setSegmentShowBoxLabels(segId, show) {
    set(state => ({
      segments: state.segments.map(s => s.id === segId ? { ...s, showBoxLabels: show } : s),
    }));
  },

  swapSegmentMold(segId, newMoldId) {
    const mold = MOLD_REGISTRY[newMoldId];
    if (!mold) return;
    set(state => {
      const segs = state.segments.map(s => {
        if (s.id !== segId) return s;
        return {
          ...s,
          moldId: newMoldId,
          captionStyle: mold.captionStyleDefault ?? s.captionStyle,
          line1Text: mold.hasTypography ? (s.line1Text ?? "") : undefined,
          line2Text: mold.hasTypography ? (s.line2Text ?? "") : undefined,
        };
      });
      return {
        segments: segs,
        transitions: rebuildTransitions(segs, state.transitions),
      };
    });
  },

  updateTransition(transId, patch) {
    set(state => ({
      transitions: state.transitions.map(t => t.id === transId ? { ...t, ...patch } : t),
    }));
  },

  addExtraVFX(type) {
    const vfx: ExtraVFX = { id: uid(), type, triggerWord: null, timeS: 0 };
    set(state => ({ extraVfx: [...state.extraVfx, vfx], selectedType: "extravfx" as const, selectedId: vfx.id }));
  },

  updateExtraVFX(id, patch) {
    set(state => ({
      extraVfx: state.extraVfx.map(v => v.id === id ? { ...v, ...patch } : v),
    }));
  },

  removeExtraVFX(id) {
    set(state => ({
      extraVfx: state.extraVfx.filter(v => v.id !== id),
      selectedType: state.selectedId === id ? null : state.selectedType,
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  setAudio(patch) {
    set(state => ({ audio: { ...state.audio, ...patch } }));
  },

  select(type, id) {
    set({ selectedType: type, selectedId: id });
  },

  autoAssignAssets() {
    set(state => {
      const files = state.availableFiles;
      const segs = state.segments.map(s => {
        const mold = MOLD_REGISTRY[s.moldId];
        if (!mold) return s;
        const newAssets = { ...s.assets };
        for (const spec of mold.assets) {
          if (newAssets[spec.key]) continue;
          const match = files.find(f =>
            spec.accepts.some(ext => f.toLowerCase().endsWith(ext))
          );
          if (match) newAssets[spec.key] = match;
        }
        return { ...s, assets: newAssets };
      });
      return { segments: segs };
    });
  },

  getAssemblyJSON() {
    const s = get();
    return generateAssemblyJSON({
      videoId: s.videoId,
      segments: s.segments,
      transitions: s.transitions,
      extraVfx: s.extraVfx,
      audio: s.audio,
      whisperWords: s.whisperWords,
    });
  },

  exportProjectJSON() {
    const s = get();
    const data = {
      _version: 1,
      projectFolderName: s.projectFolderName,
      videoId: s.videoId,
      whisperWords: s.whisperWords,
      availableFiles: s.availableFiles,
      segments: s.segments,
      transitions: s.transitions,
      extraVfx: s.extraVfx,
      audio: s.audio,
    };
    return JSON.stringify(data, null, 2);
  },

  importProjectJSON(json) {
    try {
      const data = JSON.parse(json);
      if (!data._version) throw new Error("Not a valid project file");
      set({
        projectFolderName: data.projectFolderName ?? "",
        videoId: data.videoId ?? "",
        whisperWords: data.whisperWords ?? [],
        availableFiles: data.availableFiles ?? [],
        segments: (data.segments ?? []).map((s: Segment) => ({ ...s, assetTiming: s.assetTiming ?? {} })),
        transitions: data.transitions ?? [],
        extraVfx: data.extraVfx ?? [],
        audio: data.audio ?? { voiceoverFile: null, bgMusicVolume: 0.05, wooshVolume: 0.22 },
        selectedType: null,
        selectedId: null,
      });
    } catch (e) {
      console.error("Failed to import project:", e);
      alert("Invalid project file.");
    }
  },

  clearProject() {
    set({
      projectFolderName: "",
      videoId: "",
      whisperWords: [],
      availableFiles: [],
      segments: [],
      transitions: [],
      extraVfx: [],
      audio: { voiceoverFile: null, bgMusicVolume: 0.05, wooshVolume: 0.22 },
      selectedType: null,
      selectedId: null,
    });
  },
}), {
  name: "video-assembly-editor",
  partialize: (state) => ({
    projectFolderName: state.projectFolderName,
    videoId: state.videoId,
    whisperWords: state.whisperWords,
    availableFiles: state.availableFiles,
    segments: state.segments,
    transitions: state.transitions,
    extraVfx: state.extraVfx,
    audio: state.audio,
  }),
  merge: (persisted, current) => {
    const stored = persisted as Partial<AppState> | undefined;
    if (!stored) return current;
    const segments = (stored.segments ?? []).map((s: any) => ({
      ...s,
      assetTiming: s.assetTiming ?? {},
      assets: s.assets ?? {},
    })) as Segment[];
    return {
      ...current,
      ...stored,
      segments,
    };
  },
}));
