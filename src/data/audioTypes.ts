export interface ImportedAudio {
  id: string;
  name: string;
  duration: number; // seconds
}

export interface AudioClip {
  id: string;
  audioId: string;    // references ImportedAudio.id
  trackId: string;
  startTime: number;  // timeline position in seconds
  duration: number;   // clip duration in seconds
  srcOffset: number;  // start offset into source audio
  volume: number;     // 0–1 per-clip gain
  color: string;
}

export interface AudioTrackData {
  id: string;
  name: string;
  type: 'voiceover' | 'music' | 'sfx';
  muted: boolean;
  solo: boolean;
  volume: number;
  clips: AudioClip[];
}
