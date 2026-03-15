import { useRef, useState, useEffect, useCallback } from "react";
import { useStore } from "../store/useStore";
import { getProjectFile } from "./useFileSystem";

/**
 * Manages playback of the selected voiceover file.
 *
 * The file is resolved from the project folder via the File System Access API
 * (requires the user to have opened the project folder this session).
 * If the folder hasn't been opened yet (e.g. after a page reload), `isReady`
 * will remain false and the controls will be shown as disabled.
 */
export function useVoiceoverPlayer() {
  const voiceoverFile = useStore(s => s.audio.voiceoverFile);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeS, setCurrentTimeS] = useState(0);
  const [durationS, setDurationS] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load audio whenever the selected file changes
  useEffect(() => {
    // Reset state
    setIsReady(false);
    setCurrentTimeS(0);
    setDurationS(null);
    setIsPlaying(false);

    if (!voiceoverFile) return;

    let cancelled = false;

    getProjectFile(voiceoverFile).then(file => {
      if (cancelled || !file) return;

      // Revoke the previous object URL to avoid memory leaks
      if (objUrlRef.current) {
        URL.revokeObjectURL(objUrlRef.current);
        objUrlRef.current = null;
      }

      const url = URL.createObjectURL(file);
      objUrlRef.current = url;

      // Reuse the same <audio> element across loads
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const el = audioRef.current;

      // Wire event listeners
      el.onloadedmetadata = () => {
        if (!cancelled) {
          setDurationS(el.duration);
          setIsReady(true);
        }
      };
      el.ontimeupdate = () => {
        if (!cancelled) setCurrentTimeS(el.currentTime);
      };
      el.onplay  = () => { if (!cancelled) setIsPlaying(true); };
      el.onpause = () => { if (!cancelled) setIsPlaying(false); };
      el.onended = () => { if (!cancelled) setIsPlaying(false); };

      el.src = url;
      el.load();
    });

    return () => { cancelled = true; };
  }, [voiceoverFile]);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    };
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((timeS: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, timeS);
    }
  }, []);

  const skipToStart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTimeS(0);
    }
  }, []);

  return { isPlaying, currentTimeS, durationS, isReady, play, pause, seek, skipToStart };
}
