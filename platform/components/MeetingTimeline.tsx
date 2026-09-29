"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTime } from "@/lib/engine/text";

const BARS = 64;

// Peaks per recording, decoded once per page load from the same audio the player streams
// (access is checked by /api/audio). Shared between every waveform of the same recording.
const peaksCache = new Map<string, Promise<number[] | null>>();

export function loadPeaks(recordingId: string, bars = BARS): Promise<number[] | null> {
  const key = `${recordingId}:${bars}`;
  let p = peaksCache.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`/api/audio/${recordingId}`);
        if (!res.ok) return null;
        const buf = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(await res.arrayBuffer());
        const data = buf.getChannelData(0);
        const size = Math.floor(data.length / bars) || 1;
        const peaks = Array.from({ length: bars }, (_, i) => {
          let max = 0;
          for (let j = i * size; j < Math.min(data.length, (i + 1) * size); j += 16) max = Math.max(max, Math.abs(data[j]));
          return max;
        });
        const top = Math.max(...peaks) || 1;
        return peaks.map((v) => v / top);
      } catch {
        return null;
      }
    })();
    peaksCache.set(key, p);
  }
  return p;
}

// A recording drawn as its waveform, with the cited second as the red playhead. The timecode
// chip and the bars both open the recording at that second, where it starts playing.
export function MeetingTimeline({
  recordingId,
  start,
  duration,
  tone = "neutral",
}: {
  recordingId: string;
  start: number;
  duration: number;
  tone?: "neutral" | "current" | "history";
}) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadPeaks(recordingId).then((p) => live && setPeaks(p));
    return () => {
      live = false;
    };
  }, [recordingId]);

  const head = Math.min(BARS - 1, Math.max(0, Math.floor((start / Math.max(1, duration)) * BARS)));
  const chip = tone === "current" ? "bg-valid" : tone === "history" ? "bg-history" : "bg-ink";
  return (
    <Link
      href={`/library/${recordingId}?t=${Math.floor(start)}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-3"
      aria-label={`Play the recording from ${formatTime(start)} of ${formatTime(duration)}`}
    >
      <span className="inline-flex items-center gap-2 rounded-full bg-paper py-1 pl-1 pr-3 font-mono text-[13px] font-medium text-ink group-hover:bg-line">
        <span aria-hidden="true" className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] text-white ${chip}`}>
          ▶
        </span>
        {formatTime(start)}
      </span>
      <span aria-hidden="true" className="flex h-7 items-center gap-[2px]">
        {Array.from({ length: BARS }, (_, i) => {
          const v = peaks ? Math.max(0.12, peaks[i]) : 0.3;
          return (
            <span
              key={i}
              className={`flex-1 rounded-[2px] transition-[height] duration-300 ${i === head ? "bg-signal" : i < head ? "bg-ink" : "bg-wave"}`}
              style={{ height: `${Math.round((i === head ? 1 : v) * 100)}%` }}
            />
          );
        })}
      </span>
      <span className="font-mono text-[12px] text-ink-faint">{formatTime(duration)}</span>
    </Link>
  );
}
