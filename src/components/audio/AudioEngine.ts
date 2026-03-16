/**
 * Web Audio API engine — singleton that handles decoding, scheduling,
 * and mixing of multiple audio clips across multiple tracks.
 */

interface ClipSchedule {
  audioId: string;
  startTimeS: number;
  durationS: number;
  srcOffsetS: number;
  volume: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private activeSources: AudioBufferSourceNode[] = [];

  private ctxStartTime = 0;      // AudioContext.currentTime at the moment play() was called
  private playheadStart = 0;     // playhead position (seconds) at the moment play() was called
  private _isPlaying = false;
  private rafId: number | null = null;

  /** Called on each animation frame while playing — subscriber updates UI */
  onTimeUpdate: ((t: number) => void) | null = null;
  /** Called when play/pause state changes */
  onPlayingChange: ((playing: boolean) => void) | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  get currentTime(): number {
    if (!this._isPlaying || !this.ctx) return this.playheadStart;
    return this.playheadStart + (this.ctx.currentTime - this.ctxStartTime);
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  // ── Import ───────────────────────────────────────────────────────

  async importFile(file: File, existingId?: string): Promise<{ id: string; durationS: number }> {
    const ctx = this.getCtx();
    const ab = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab);
    const id = existingId ?? `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    this.buffers.set(id, buffer);
    return { id, durationS: buffer.duration };
  }

  getBuffer(id: string): AudioBuffer | undefined {
    return this.buffers.get(id);
  }

  clearBuffers(): void {
    this._isPlaying = false;
    this.stopSources();
    this.stopTick();
    this.playheadStart = 0;
    this.buffers.clear();
    this.onPlayingChange?.(false);
    this.onTimeUpdate?.(0);
  }

  // ── Playback ─────────────────────────────────────────────────────

  play(clips: ClipSchedule[], fromTime: number): void {
    const ctx = this.getCtx();
    this.stopSources();

    const now = ctx.currentTime;
    this.ctxStartTime = now;
    this.playheadStart = fromTime;
    this._isPlaying = true;

    for (const clip of clips) {
      const buffer = this.buffers.get(clip.audioId);
      if (!buffer) continue;

      // Skip clips that have already ended
      if (clip.startTimeS + clip.durationS <= fromTime) continue;

      const offsetIntoClip = Math.max(0, fromTime - clip.startTimeS);
      const startAtCtx    = now + Math.max(0, clip.startTimeS - fromTime);
      const srcOffset     = clip.srcOffsetS + offsetIntoClip;
      const duration      = clip.durationS - offsetIntoClip;
      if (duration <= 0) continue;

      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, clip.volume));
      gain.connect(ctx.destination);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(startAtCtx, srcOffset, duration);
      this.activeSources.push(source);
    }

    this.onPlayingChange?.(true);
    this.startTick();
  }

  pause(): void {
    this.playheadStart = this.currentTime;
    this._isPlaying = false;
    this.stopSources();
    this.stopTick();
    this.onPlayingChange?.(false);
  }

  stop(): void {
    this._isPlaying = false;
    this.stopSources();
    this.stopTick();
    this.playheadStart = 0;
    this.onPlayingChange?.(false);
    this.onTimeUpdate?.(0);
  }

  seek(timeS: number): void {
    this.playheadStart = Math.max(0, timeS);
    if (!this._isPlaying) this.onTimeUpdate?.(this.playheadStart);
  }

  // ── Internals ────────────────────────────────────────────────────

  private stopSources(): void {
    for (const src of this.activeSources) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    this.activeSources = [];
  }

  private startTick(): void {
    this.stopTick();
    const tick = () => {
      if (!this._isPlaying) return;
      this.onTimeUpdate?.(this.currentTime);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopTick(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const audioEngine = new AudioEngine();
