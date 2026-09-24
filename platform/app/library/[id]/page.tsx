import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/Page";
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

  const language = { fr: "French", en: "English", es: "Spanish", pt: "Portuguese" }[rec.transcription.language] ?? rec.transcription.language;

  return (
    <Page
      title={rec.title}
      width="max-w-4xl"
      intro={
        <>
          <p>
            <Link href="/library" className="underline underline-offset-4">{mission.name}</Link>.{" "}
            {new Date(rec.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.
          </p>
          <p className="mt-1 text-sm text-white/55 tabular">
            {rec.participants.join(", ")}. {formatTime(rec.durationSec)}, {language}. Transcribed by Whisper {rec.transcription.model} at{" "}
            {rec.transcription.realtimeFactor}x real time{rec.source === "import" ? ", imported" : ""}.
          </p>
        </>
      }
    >
      <MeetingPlayer recordingId={id} segments={segments} decisions={decisions} startAt={startAt} />
    </Page>
  );
}
