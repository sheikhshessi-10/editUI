export interface PlayClip {
  audioId: string;
  startTime: number;
  srcOffset: number;
  duration: number;
  volume: number;
}

interface AudioEntry {
  buffer: AudioBuffer;
  url: string;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private entries = new Map<string, AudioEntry>();
  private sources: AudioBufferSourceNode[] = [];
  private startedAt = 0;
  private startFromTime = 0;
  private rafId: number | null = null;

  onTimeUpdate?: (t: number) => void;
  onPlayingChange?: (playing: boolean) => void;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async importFile(file: File): Promise<{ id: string; duration: number; url: string }> {
    const ctx = this.getCtx();
    const id = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const url = URL.createObjectURL(file);
    this.entries.set(id, { buffer, url });
    return { id, duration: buffer.duration, url };
  }

  getUrl(id: string): string | undefined {
    return this.entries.get(id)?.url;
  }

  getBuffer(id: string): AudioBuffer | undefined {
    return this.entries.get(id)?.buffer;
  }

  getCurrentTime(): number {
    if (!this.ctx) return this.startFromTime;
    return this.startFromTime + (this.ctx.currentTime - this.startedAt);
  }

  play(clips: PlayClip[], fromTime: number) {
    this._stopSources();
    const ctx = this.getCtx();
    this.startFromTime = fromTime;
    this.startedAt = ctx.currentTime;

    for (const clip of clips) {
      const entry = this.entries.get(clip.audioId);
      if (!entry) continue;
      const { buffer } = entry;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, clip.volume));
      source.connect(gain);
      gain.connect(ctx.destination);

      const clipRelStart = clip.startTime - fromTime;
      const availSrc = buffer.duration - clip.srcOffset;
      const clipDur = Math.min(clip.duration, availSrc);
      if (clipDur <= 0) continue;

      if (clipRelStart >= 0) {
        // clip starts in the future
        source.start(ctx.currentTime + clipRelStart, clip.srcOffset, clipDur);
      } else if (clipRelStart + clipDur > 0) {
        // clip already started, seek into it
        const seekOffset = clip.srcOffset + (-clipRelStart);
        const remaining = clipDur + clipRelStart;
        source.start(ctx.currentTime, seekOffset, remaining);
      }
      // else clip already ended, skip

      this.sources.push(source);
    }

    this._startRaf();
    this.onPlayingChange?.(true);
  }

  pause() {
    if (this.ctx) {
      this.startFromTime = this.getCurrentTime();
    }
    this._stopSources();
    this.onPlayingChange?.(false);
  }

  stop() {
    this._stopSources();
    this.onPlayingChange?.(false);
  }

  cleanup(id: string) {
    const entry = this.entries.get(id);
    if (entry) URL.revokeObjectURL(entry.url);
    this.entries.delete(id);
  }

  private _stopSources() {
    for (const src of this.sources) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    this.sources = [];
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private _startRaf() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    const ctx = this.getCtx();
    const tick = () => {
      const t = this.startFromTime + (ctx.currentTime - this.startedAt);
      this.onTimeUpdate?.(t);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}

export const audioEngine = new AudioEngine();
