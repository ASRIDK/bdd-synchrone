import Link from "next/link";
import { formatTime } from "@/lib/engine/text";

// A recording drawn as a bar, with a mark where the cited sentence is. It tells at a glance
// "minute 1 of a 2 minute meeting" and links straight to that moment.
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
  const pct = Math.min(100, Math.max(0, (start / Math.max(1, duration)) * 100));
  const color = tone === "current" ? "var(--valid)" : tone === "history" ? "var(--history)" : "var(--ink)";
  return (
    <Link
      href={`/library/${recordingId}?t=${Math.floor(start)}`}
      className="group flex items-center gap-3 text-sm"
      aria-label={`Open the recording at ${formatTime(start)} of ${formatTime(duration)}`}
    >
      <span className="relative block h-2 w-40 rounded-full bg-line">
        <span className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${pct}%`, background: color }} />
        <span
          className="absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm"
          style={{ left: `${pct}%`, background: color }}
        />
      </span>
      <span className="tabular text-ink-soft group-hover:text-ink group-hover:underline">
        Play from {formatTime(start)} <span className="text-ink-faint">of {formatTime(duration)}</span>
      </span>
    </Link>
  );
}
