import { create } from "zustand";
import type { ImportedAudio, AudioClip, AudioTrack } from "../data/audioTypes";
import { audioEngine } from "../components/audio/AudioEngine";

let _uid = 0;
const uid = () => `ac-${++_uid}-${Date.now().toString(36)}`;

const makeDefaultTracks = (): AudioTrack[] => [
  { id: "track-vo",    name: "Voiceover", muted: false, solo: false, volume: 1,   clips: [] },
  { id: "track-music", name: "Music",     muted: false, solo: false, volume: 0.3, clips: [] },
  { id: "track-sfx",  name: "SFX",       muted: false, solo: false, volume: 0.8, clips: [] },
];

interface AudioState {
  importedAudios: ImportedAudio[];
  tracks: AudioTrack[];
  playheadTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;

  importAudio: (file: File) => Promise<void>;
  removeImportedAudio: (id: string) => void;

  addTrack: () => void;
  removeTrack: (id: string) => void;
  updateTrack: (
    id: string,
    patch: Partial<Pick<AudioTrack, "name" | "muted" | "solo" | "volume">>
  ) => void;

  addClipToTrack: (trackId: string, clip: Omit<AudioClip, "id" | "trackId">) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTimeS: number) => void;
  updateClip: (
    clipId: string,
    patch: Partial<Pick<AudioClip, "startTimeS" | "durationS" | "srcOffsetS" | "volume">>
  ) => void;
  selectClip: (id: string | null) => void;

  play: (fromTime?: number) => void;
  pause: () => void;
  stop: () => void;
  setPlayheadTime: (t: number) => void;
}

export const useAudioStore = create<AudioState>()((set, get) => {
  // Wire engine callbacks after store is initialised
  setTimeout(() => {
    audioEngine.onTimeUpdate = (t) => set({ playheadTime: t });
    audioEngine.onPlayingChange = (playing) => set({ isPlaying: playing });
  }, 0);

  return {
    importedAudios: [],
    tracks: makeDefaultTracks(),
    playheadTime: 0,
    isPlaying: false,
    selectedClipId: null,

    // ── Import ─────────────────────────────────────────────────────

    async importAudio(file) {
      const { id, durationS } = await audioEngine.importFile(file);
      const audio: ImportedAudio = { id, name: file.name, durationS };
      set((s) => ({ importedAudios: [...s.importedAudios, audio] }));
    },

    removeImportedAudio(id) {
      set((s) => ({
        importedAudios: s.importedAudios.filter((a) => a.id !== id),
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.audioId !== id),
        })),
      }));
    },

    // ── Tracks ─────────────────────────────────────────────────────

    addTrack() {
      const n = get().tracks.length + 1;
      const track: AudioTrack = {
        id: uid(),
        name: `Track ${n}`,
        muted: false,
        solo: false,
        volume: 1,
        clips: [],
      };
      set((s) => ({ tracks: [...s.tracks, track] }));
    },

    removeTrack(id) {
      set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) }));
    },

    updateTrack(id, patch) {
      set((s) => ({
        tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },

    // ── Clips ──────────────────────────────────────────────────────

    addClipToTrack(trackId, clipData) {
      const clip: AudioClip = { id: uid(), trackId, ...clipData };
      set((s) => ({
        tracks: s.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
        selectedClipId: clip.id,
      }));
    },

    removeClip(clipId) {
      set((s) => ({
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => c.id !== clipId),
        })),
        selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
      }));
    },

    moveClip(clipId, newTrackId, newStartTimeS) {
      set((s) => {
        let found: AudioClip | null = null;
        const tracks = s.tracks.map((t) => {
          const clip = t.clips.find((c) => c.id === clipId);
          if (clip) {
            found = clip;
            return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
          }
          return t;
        });
        if (!found) return s;
        const moved: AudioClip = {
          ...(found as AudioClip),
          trackId: newTrackId,
          startTimeS: Math.max(0, newStartTimeS),
        };
        return {
          tracks: tracks.map((t) =>
            t.id === newTrackId ? { ...t, clips: [...t.clips, moved] } : t
          ),
          selectedClipId: clipId,
        };
      });
    },

    updateClip(clipId, patch) {
      set((s) => ({
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
        })),
      }));
    },

    selectClip(id) {
      set({ selectedClipId: id });
    },

    // ── Playback ───────────────────────────────────────────────────

    play(fromTime) {
      const s = get();
      const t = fromTime ?? s.playheadTime;
      const hasSolo = s.tracks.some((tr) => tr.solo);
      const clips = s.tracks
        .filter((tr) => !tr.muted && (!hasSolo || tr.solo))
        .flatMap((tr) =>
          tr.clips.map((c) => ({
            audioId: c.audioId,
            startTimeS: c.startTimeS,
            durationS: c.durationS,
            srcOffsetS: c.srcOffsetS,
            volume: c.volume * tr.volume,
          }))
        );
      audioEngine.play(clips, t);
    },

    pause() {
      audioEngine.pause();
    },

    stop() {
      audioEngine.stop();
      set({ playheadTime: 0 });
    },

    setPlayheadTime(t) {
      const clamped = Math.max(0, t);
      set({ playheadTime: clamped });
      audioEngine.seek(clamped);
    },
  };
});
