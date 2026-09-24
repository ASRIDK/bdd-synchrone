import Link from "next/link";
import { notFound } from "next/navigation";
import { MeetingPlayer } from "@/components/MeetingPlayer";
import { getCatalog, getIndex } from "@/lib/engine/data";
import { formatTime } from "@/lib/engine/text";
import { currentUser } from "@/lib/session";

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const user = await currentUser();
  const idx = getIndex();
  const rec = idx.recordingById.get(id);
  // A recording of a mission you do not belong to looks exactly like one that does not exist.
  if (!rec || !user.missions.includes(rec.mission)) notFound();

  const mission = getCatalog().missions.find((m) => m.id === rec.mission)!;
  const segments = idx.segments
    .filter((s) => s.recordingId === id)
    .map((s) => ({ id: s.id, start: s.start, end: s.end, text: s.text, lowConfidence: s.avgLogprob < -0.5 }));
  const decisions = idx.decisions
    .filter((d) => d.recordingId === id)
    .map((d) => ({ segmentId: d.segmentId, status: d.status, supersededBy: d.supersededBy }));
  const startAt = t ? Math.max(0, Number(t) || 0) : null;

  return (
    <div className="max-w-3xl">
      <Link href="/library" className="text-sm text-ink-soft underline underline-offset-4">Library</Link>
      <h1 className="mt-2 text-[1.8rem] font-semibold leading-tight tracking-tight">{rec.title}</h1>
      <p className="mt-1 text-ink-soft">
        {mission.name}. {new Date(rec.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.
      </p>
      <p className="mt-1 text-sm text-ink-faint tabular">
        {rec.participants.join(", ")}. {formatTime(rec.durationSec)}, {rec.language === "fr" ? "French" : "English"}. Transcribed by Whisper{" "}
        {rec.transcription.model} at {rec.transcription.realtimeFactor}x real time.
      </p>
      <MeetingPlayer recordingId={id} segments={segments} decisions={decisions} startAt={startAt} />
    </div>
  );
}
