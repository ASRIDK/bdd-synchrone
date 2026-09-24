"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/engine/text";

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
  // Links carry whole seconds (a sentence at 44.6 s is linked as t=44), so allow one second.
  const cited = startAt === null ? null : segments.reduce<Seg | null>((best, s) => (s.start < startAt + 1 ? s : best), null);
  const decisionOf = new Map(decisions.map((d) => [d.segmentId, d]));

  useEffect(() => {
    if (startAt === null || !audio.current) return;
    const el = audio.current;
    const seek = () => {
      el.currentTime = startAt;
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
        <audio
          ref={audio}
          controls
          preload="metadata"
          src={`/api/audio/${recordingId}`}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          className="w-full"
        />
        {cited && <p className="mt-2 text-sm text-ink-soft">Opened at the cited moment, {formatTime(cited.start)}. The cited sentence is highlighted.</p>}
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
