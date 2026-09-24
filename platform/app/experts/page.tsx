import { Page } from "@/components/Page";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getIndex } from "@/lib/engine/data";
import { isEnabled } from "@/lib/flags";
import { currentUser } from "@/lib/session";

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default async function ExpertsPage() {
  if (!isEnabled("experts")) notFound();
  const user = await currentUser();
  const idx = getIndex();
  const catalog = getCatalog();
  const recs = idx.recordings.filter((r) => user.missions.includes(r.mission));

  const people = catalog.people
    .map((p) => {
      const meetings = recs.filter((r) => r.participants.includes(p.name));
      const alone = meetings.filter((r) => r.participants.length === 1);
      const decisions = idx.decisions.filter((d) => meetings.some((m) => m.id === d.recordingId) && d.status === "current");
      const daysLeft = p.departure_date ? daysUntil(p.departure_date) : null;
      return { p, meetings, alone, decisions, daysLeft };
    })
    .filter((x) => x.meetings.length > 0)
    .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) || b.meetings.length - a.meetings.length);

  const leaving = people.filter((x) => x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= 90);

  return (
    <Page title="Who knows" accent="what" width="max-w-5xl" intro={<>People and the recorded meetings they took part in, within the missions you can see. It tells you who to call, and which knowledge sits with one person only.</>}>

      {leaving.length > 0 && (
        <section className="mt-8 rounded-xl border border-history bg-history-bg p-5">
          <h2 className="text-lg font-semibold text-history">Knowledge about to leave</h2>
          {leaving.map(({ p, meetings, decisions, daysLeft }) => (
            <div key={p.id} className="mt-3">
              <p>
                <span className="font-medium">{p.name}</span>, {p.role}, leaves in {daysLeft} days ({new Date(p.departure_date!).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}).
                They took part in {meetings.length} recorded meeting{meetings.length > 1 ? "s" : ""} holding {decisions.length} current decision{decisions.length === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Suggested action: record a handover session on these topics before the departure date: {meetings.map((m) => m.title).join("; ")}.
              </p>
            </div>
          ))}
        </section>
      )}

      <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
        {people.map(({ p, meetings, alone }) => (
          <li key={p.id} className="px-4 py-3">
            <p>
              <span className="font-medium">{p.name}</span> <span className="text-ink-faint">{p.role}</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {meetings.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && "; "}
                  <Link href={`/library/${m.id}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">{m.title}</Link>
                </span>
              ))}
            </p>
            {alone.length > 0 && <p className="mt-1 text-sm text-history">Only speaker in {alone.length} recording{alone.length > 1 ? "s" : ""}: this knowledge has a single source.</p>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-faint">
        Based on meeting participants. Knowing who said each sentence needs speaker identification, which is prepared as a planned add-on.
      </p>
    </Page>
  );
}
