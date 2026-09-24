// Groups consecutive transcript segments into short passages for retrieval.
// Short passages keep citations precise: a chunk never spans more than MAX_SEC, and the answer
// later points at the single best segment inside it, not at the chunk start.
import type { Chunk, Segment } from "./types";

export const TARGET_SEC = 25;
export const MAX_SEC = 40;

export function buildChunks(segments: Segment[]): Chunk[] {
  const byRecording = new Map<string, Segment[]>();
  for (const s of segments) {
    const list = byRecording.get(s.recordingId) ?? [];
    list.push(s);
    byRecording.set(s.recordingId, list);
  }

  const chunks: Chunk[] = [];
  for (const [recordingId, list] of byRecording) {
    list.sort((a, b) => a.start - b.start);
    let current: Segment[] = [];
    const flush = () => {
      if (current.length === 0) return;
      const start = current[0].start;
      chunks.push({
        id: `${recordingId}@${Math.floor(start)}`,
        recordingId,
        mission: current[0].mission,
        start,
        end: current[current.length - 1].end,
        segmentIds: current.map((s) => s.id),
        text: current.map((s) => s.text).join(" "),
      });
      current = [];
    };
    for (const seg of list) {
      if (current.length > 0) {
        const duration = seg.end - current[0].start;
        const reachedTarget = current[current.length - 1].end - current[0].start >= TARGET_SEC;
        if (duration > MAX_SEC || reachedTarget) flush();
      }
      current.push(seg);
    }
    flush();
  }
  return chunks;
}
