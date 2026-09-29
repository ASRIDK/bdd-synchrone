// The signature element of the heroes: the archive drawn as a tape waveform, with a red bar
// at the date of each recorded meeting. It is decorative, so it is hidden from screen readers.
const BARS = 90;

export function MeetingLine({ dates, className = "" }: { dates: string[]; className?: string }) {
  const times = dates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
  const min = Math.min(...times);
  const span = Math.max(1, Math.max(...times) - min);
  const marks = new Set(times.map((t) => Math.min(BARS - 1, Math.round(((t - min) / span) * (BARS - 1)))));
  return (
    <div aria-hidden="true" className={`flex h-12 items-center gap-[2px] ${className}`}>
      {Array.from({ length: BARS }, (_, i) => {
        const v = 0.2 + 0.8 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.23));
        return (
          <span
            key={i}
            className={`flex-1 rounded-[2px] ${marks.has(i) ? "bg-signal" : "bg-white/25"}`}
            style={{ height: `${Math.round((marks.has(i) ? 1 : v) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
