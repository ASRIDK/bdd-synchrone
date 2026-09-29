"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/engine/text";
import { loadPeaks } from "./MeetingTimeline";

const BARS = 140;

type Seg = { id: string; start: number; end: number; text: string; lowConfidence: boolean };
type Dec = { segmentId: string; status: "current" | "superseded"; supersededBy?: string };

export function MeetingPlayer({
  recordingId,
  segments,
  decisions,
  startAt,
}: {
  recordingId: string;
  segments: Seg[];
  decisions: Dec[];
  startAt: number | null;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [now, setNow] = useState(startAt ?? 0);
  const [length, setLength] = useState(0);
  const [paused, setPaused] = useState(true);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadPeaks(recordingId, BARS).then((p) => live && setPeaks(p));
    return () => {
      live = false;
    };
  }, [recordingId]);
  // Links carry whole seconds (a sentence at 44.6 s is linked as t=44), so allow one second.
  const cited = startAt === null ? null : segments.reduce<Seg | null>((best, s) => (s.start < startAt + 1 ? s : best), null);
  const decisionOf = new Map(decisions.map((d) => [d.segmentId, d]));

  useEffect(() => {
    if (startAt === null || !audio.current) return;
    const el = audio.current;
    // The "Play from" link is a click, so the browser lets the audio start on its own. If it
    // blocks autoplay anyway, the player stays paused at the cited second.
    const seek = () => {
      el.currentTime = startAt;
      el.play().catch(() => {});
    };
    if (el.readyState >= 1) seek();
    else el.addEventListener("loadedmetadata", seek, { once: true });
    document.getElementById(`seg-${cited?.id}`)?.scrollIntoView({ block: "center" });
  }, [startAt, cited?.id]);

  const play = (s: Seg) => {
    if (!audio.current) return;
    audio.current.currentTime = s.start;
    void audio.current.play();
  };

  return (
    <div className="mt-6">
      <div className="sticky top-0 z-10 -mx-1 bg-paper px-1 py-3">
        {/* One player: the button plays or pauses, the tape seeks, the clock reads current / total. */}
        <div className="mb-3 flex h-16 items-center gap-4 rounded-card bg-night px-4 py-3">
          <button
            type="button"
            aria-label={paused ? "Play" : "Pause"}
            onClick={() => {
              const el = audio.current;
              if (!el) return;
              if (el.paused) el.play().catch(() => {});
              else el.pause();
            }}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${paused ? "bg-white text-night" : "bg-signal text-white"}`}
          >
            {paused ? (
              <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M4 2.5v11l9.5-5.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
                <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
              </svg>
            )}
          </button>
          {/* The tape: click anywhere to play from there. The red bar follows the playback. */}
          <div
            aria-hidden="true"
            onClick={(e) => {
              const el = audio.current;
              if (!el || !length) return;
              const r = e.currentTarget.getBoundingClientRect();
              el.currentTime = ((e.clientX - r.left) / r.width) * length;
              el.play().catch(() => {});
            }}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-[2px]"
          >
            {Array.from({ length: BARS }, (_, i) => {
              const at = length ? Math.min(BARS - 1, Math.floor((now / length) * BARS)) : -1;
              const v = peaks ? Math.max(0.1, peaks[i]) : 0.3;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-[2px] ${i === at ? "bg-signal" : i < at ? "bg-white" : "bg-white/25"}`}
                  style={{ height: `${Math.round((i === at ? 1 : v) * 100)}%` }}
                />
              );
            })}
          </div>
          <span className="shrink-0 font-mono text-sm tabular text-white/75">
            {formatTime(now)} / {formatTime(length)}
          </span>
        </div>
        {/* No native controls: the element only plays, the bar above drives it. */}
        <audio
          ref={audio}
          onLoadedMetadata={(e) => setLength(e.currentTarget.duration || 0)}
          preload="metadata"
          src={`/api/audio/${recordingId}`}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          className="hidden"
        />
        {cited && <p className="mt-2 text-sm text-ink-soft">Playing from the cited moment, {formatTime(cited.start)}. The cited sentence is highlighted.</p>}
      </div>

      <ol className="mt-2 space-y-0.5">
        {segments.map((s) => {
          const active = now >= s.start && now < s.end;
          const d = decisionOf.get(s.id);
          return (
            <li key={s.id} id={`seg-${s.id}`}>
              <button
                type="button"
                onClick={() => play(s)}
                className={`grid w-full grid-cols-[3.5rem_1fr] gap-3 rounded-md px-2 py-1.5 text-left ${
                  s.id === cited?.id ? "bg-valid-bg" : active ? "bg-surface" : "hover:bg-surface"
                }`}
              >
                <span className="tabular pt-0.5 text-sm text-ink-faint">{formatTime(s.start)}</span>
                <span>
                  <span className="spoken">{s.text}</span>
                  {d && (
                    <span className={`ml-2 whitespace-nowrap text-sm font-medium ${d.status === "current" ? "text-valid" : "text-history"}`}>
                      {d.status === "current" ? "Decision, current" : "Decision, replaced later"}
                    </span>
                  )}
                  {s.lowConfidence && <span className="ml-2 text-sm text-ink-faint">Transcription unsure</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
