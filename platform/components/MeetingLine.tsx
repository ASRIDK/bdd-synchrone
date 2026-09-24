// The signature element of the heroes: the archive drawn as a red line, one dot per recorded
// meeting placed at its date, with a playhead sweeping across (it stops if the user prefers
// reduced motion). It is decorative, so it is hidden from screen readers.
export function MeetingLine({ dates, className = "" }: { dates: string[]; className?: string }) {
  const times = dates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(1, max - min);
  return (
    <div aria-hidden="true" className={`relative h-6 ${className}`}>
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-signal/70" />
      {times.map((t, i) => (
        <span
          key={i}
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal"
          style={{ left: `${((t - min) / span) * 100}%` }}
        />
      ))}
      <span className="playhead absolute top-0 h-6 w-px bg-white/80" />
    </div>
  );
}
