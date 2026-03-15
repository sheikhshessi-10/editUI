import { create } from 'zustand';
import type { ImportedAudio, AudioClip, AudioTrackData } from '../data/audioTypes';
import { audioEngine } from '../components/audio/AudioEngine';

let _id = 1;
const uid = () => `aud-${_id++}-${Date.now().toString(36)}`;

export const TRACK_COLORS: Record<string, string> = {
  voiceover: '#74B9FF',
  music: '#00B894',
  sfx: '#FDCB6E',
};

const DEFAULT_TRACKS: AudioTrackData[] = [
  { id: 'track-vo',    name: 'Voiceover', type: 'voiceover', muted: false, solo: false, volume: 1,    clips: [] },
  { id: 'track-music', name: 'Music',     type: 'music',     muted: false, solo: false, volume: 0.1,  clips: [] },
  { id: 'track-sfx',  name: 'SFX',       type: 'sfx',       muted: false, solo: false, volume: 0.22, clips: [] },
];

interface AudioState {
  importedAudios: ImportedAudio[];
  tracks: AudioTrackData[];
  playheadTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  selectedTrackId: string | null;

  importAudio(file: File): Promise<void>;
  removeImportedAudio(id: string): void;

  addTrack(type: AudioTrackData['type']): void;
  removeTrack(id: string): void;
  updateTrack(id: string, patch: Partial<Omit<AudioTrackData, 'clips'>>): void;

  addClip(trackId: string, clip: Omit<AudioClip, 'id' | 'trackId'>): void;
  removeClip(clipId: string): void;
  updateClip(clipId: string, patch: Partial<AudioClip>): void;
  moveClip(clipId: string, newTrackId: string, newStartTime: number): void;

  setPlayheadTime(t: number): void;
  selectClip(id: string | null, trackId?: string | null): void;

  play(fromTime?: number): void;
  pause(): void;
  stop(): void;
}

export const useAudioStore = create<AudioState>()((set, get) => {
  // Wire engine callbacks after store is ready
  setTimeout(() => {
    audioEngine.onTimeUpdate = (t) => set({ playheadTime: t });
    audioEngine.onPlayingChange = (playing) => {
      if (!playing) set({ isPlaying: false });
      else set({ isPlaying: true });
    };
  }, 0);

  return {
    importedAudios: [],
    tracks: DEFAULT_TRACKS,
    playheadTime: 0,
    isPlaying: false,
    selectedClipId: null,
    selectedTrackId: null,

    async importAudio(file: File) {
      const { id, duration } = await audioEngine.importFile(file);
      const audio: ImportedAudio = { id, name: file.name, duration };
      set(state => ({ importedAudios: [...state.importedAudios, audio] }));
    },

    removeImportedAudio(id) {
      audioEngine.cleanup(id);
      set(state => ({
        importedAudios: state.importedAudios.filter(a => a.id !== id),
        tracks: state.tracks.map(t => ({
          ...t,
          clips: t.clips.filter(c => c.audioId !== id),
        })),
      }));
    },

    addTrack(type) {
      const names: Record<string, string> = { voiceover: 'V/O', music: 'Music', sfx: 'SFX' };
      const track: AudioTrackData = {
        id: uid(),
        name: names[type] ?? 'Audio',
        type,
        muted: false,
        solo: false,
        volume: 1,
        clips: [],
      };
      set(state => ({ tracks: [...state.tracks, track] }));
    },

    removeTrack(id) {
      set(state => ({
        tracks: state.tracks.filter(t => t.id !== id),
        selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId,
      }));
    },

    updateTrack(id, patch) {
      set(state => ({
        tracks: state.tracks.map(t => t.id === id ? { ...t, ...patch } : t),
      }));
    },

    addClip(trackId, clipData) {
      const clip: AudioClip = { id: uid(), trackId, ...clipData };
      set(state => ({
        tracks: state.tracks.map(t =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
        selectedClipId: clip.id,
        selectedTrackId: trackId,
      }));
    },

    removeClip(clipId) {
      set(state => ({
        tracks: state.tracks.map(t => ({
          ...t,
          clips: t.clips.filter(c => c.id !== clipId),
        })),
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      }));
    },

    updateClip(clipId, patch) {
      set(state => ({
        tracks: state.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => c.id === clipId ? { ...c, ...patch } : c),
        })),
      }));
    },

    moveClip(clipId, newTrackId, newStartTime) {
      set(state => {
        let clip: AudioClip | null = null;
        const tracks = state.tracks.map(t => {
          const found = t.clips.find(c => c.id === clipId);
          if (found) { clip = found; return { ...t, clips: t.clips.filter(c => c.id !== clipId) }; }
          return t;
        });
        if (!clip) return state;
        const foundClip = clip as AudioClip;
        const updated: AudioClip = { ...foundClip, trackId: newTrackId, startTime: Math.max(0, newStartTime) };
        return {
          tracks: tracks.map(t => t.id === newTrackId ? { ...t, clips: [...t.clips, updated] } : t),
          selectedClipId: clipId,
          selectedTrackId: newTrackId,
        };
      });
    },

    setPlayheadTime(t) { set({ playheadTime: Math.max(0, t) }); },

    selectClip(id, trackId) {
      set({ selectedClipId: id, selectedTrackId: trackId ?? null });
    },

    play(fromTime?: number) {
      const state = get();
      const startTime = fromTime ?? state.playheadTime;
      const hasSolo = state.tracks.some(t => t.solo);
      const clips = state.tracks
        .filter(t => !t.muted && (!hasSolo || t.solo))
        .flatMap(t => t.clips.map(c => ({
          audioId: c.audioId,
          startTime: c.startTime,
          srcOffset: c.srcOffset,
          duration: c.duration,
          volume: c.volume * t.volume,
        })));
      audioEngine.play(clips, startTime);
    },

    pause() {
      audioEngine.pause();
    },

    stop() {
      audioEngine.stop();
      set({ playheadTime: 0 });
    },
  };
});
