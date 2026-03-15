export interface ImportedAudio {
  id: string;
  name: string;
  durationS: number;
}

export interface AudioClip {
  id: string;
  audioId: string;   // references ImportedAudio.id
  trackId: string;
  startTimeS: number;
  durationS: number;
  srcOffsetS: number; // trim: offset into source audio
  volume: number;     // 0–1 per-clip gain
}

export interface AudioTrack {
  id: string;
  name: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  clips: AudioClip[];
}
