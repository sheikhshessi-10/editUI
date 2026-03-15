import type { WhisperWord } from "../data/types";

export function parseWhisperJSON(raw: Record<string, unknown>): WhisperWord[] {
  const words: WhisperWord[] = [];
  const segments = (raw.segments ?? []) as Array<{
    words?: Array<{ word: string; start: number; end: number; probability?: number }>;
  }>;
  for (const segment of segments) {
    for (const w of segment.words ?? []) {
      words.push({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
        probability: w.probability,
      });
    }
  }
  return words.sort((a, b) => a.start - b.start);
}
