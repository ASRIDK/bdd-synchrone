import Link from "next/link";
import { ImportStatusList } from "@/components/ImportStatusList";
import { MeetingLine } from "@/components/MeetingLine";
import { Page, PillLinks } from "@/components/Page";
import { QuickAsk } from "@/components/QuickAsk";
import { getCatalog, getIndex, indexExists } from "@/lib/engine/data";
import { listJobs } from "@/lib/engine/importer";
import { excerpt, formatDuration, formatTime } from "@/lib/engine/text";
import type { Recording } from "@/lib/engine/types";
import { currentUser } from "@/lib/session";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MeetingRow({ r, missionName }: { r: Recording; missionName: string }) {
  return (
    <li>
      <Link href={`/library/${r.id}`} className="grid gap-1 px-5 py-4 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center">
        <span>
          <span className="block font-semibold">{r.title}</span>
          <span className="block text-sm text-ink-faint">
            {missionName}. {r.participants.join(", ")}
          </span>
        </span>
        <span className="text-sm text-ink-soft tabular sm:text-right">
          {fmtDate(r.date)}, {formatTime(r.durationSec)}
          {r.language === "fr" ? ", French" : ""}
        </span>
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!indexExists()) {
    return (
      <Page title="Welcome">
        <p>The archive index is missing. Run <code>npm run index</code> in the platform folder, then reload.</p>
      </Page>
    );
  }
  const idx = getIndex();
  const catalog = getCatalog();
  const person = catalog.people.find((p) => p.id === user.personId);
  const missionName = new Map(catalog.missions.map((m) => [m.id, m.name]));
  const mine = idx.recordings.filter((r) => user.missions.includes(r.mission));
  const attended = person ? mine.filter((r) => r.participants.includes(person.name)).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const missions = catalog.missions.filter((m) => user.missions.includes(m.id));
  const changes = idx.decisions
    .filter((d) => user.missions.includes(d.mission) && d.supersedes.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const byId = new Map(idx.decisions.map((d) => [d.id, d]));
  const jobs = listJobs().filter((j) => j.user === user.email || user.missions.includes(j.mission)).slice(0, 3);
  const firstName = user.name.split(" ")[0];
  const attendedSeconds = attended.reduce((s, r) => s + r.durationSec, 0);

  return (
    <Page
      title={`Bonjour ${firstName},`}
      accent="here is your archive"
      intro={
        <>
          <p>
            {user.role}. You can search {missions.length} mission{missions.length > 1 ? "s" : ""}, {mine.length} recordings and{" "}
            {formatDuration(mine.reduce((s, r) => s + r.durationSec, 0))} of audio.
          </p>
          <div className="mt-6 max-w-xl">
            <MeetingLine dates={mine.map((r) => r.date)} />
          </div>
        </>
      }
      aside={<QuickAsk />}
      overlap={
        <PillLinks
          items={[
            { href: "#attended", label: "Your meetings" },
            { href: "#missions", label: "Your missions" },
            { href: "#changes", label: "What changed" },
            { href: "#imports", label: "Imports" },
          ]}
        />
      }
    >
      <dl className="grid gap-3 sm:grid-cols-4">
        {[
          ["Meetings you were in", String(attended.length)],
          ["Of them recorded", formatDuration(attendedSeconds)],
          ["Decisions in force", String(idx.decisions.filter((d) => user.missions.includes(d.mission) && d.status === "current").length)],
          ["Decisions replaced", String(idx.decisions.filter((d) => user.missions.includes(d.mission) && d.status === "superseded").length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface p-5">
            <dt className="text-sm text-ink-faint">{label}</dt>
            <dd className="mt-1 text-3xl font-extrabold tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <section id="attended" className="mt-12 scroll-mt-28">
        <h2 className="display text-2xl">Meetings you were in</h2>
        <p className="mt-1 text-ink-soft">Recorded, transcribed and searchable. Open one to read it and play any sentence.</p>
        {attended.length > 0 ? (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-surface">
            {attended.map((r) => (
              <MeetingRow key={r.id} r={r} missionName={missionName.get(r.mission) ?? r.mission} />
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl bg-surface p-6">
            <p className="font-semibold">No recorded meeting lists you as a participant yet.</p>
            <p className="mt-1 text-ink-soft">
              Meetings you import, or that your mission records, will appear here. Your missions&apos; recordings are listed below.
            </p>
            <Link href="/import" className="mt-4 inline-block rounded-xl bg-night px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white">
              Import a meeting
            </Link>
          </div>
        )}
      </section>

      <section id="missions" className="mt-12 scroll-mt-28">
        <h2 className="display text-2xl">Your missions</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {missions.map((m) => {
            const recs = mine.filter((r) => r.mission === m.id).sort((a, b) => b.date.localeCompare(a.date));
            return (
              <li key={m.id} className="flex flex-col rounded-2xl bg-surface p-5">
                <p className="text-sm text-ink-faint">
                  {m.practice}
                  {m.open ? ", open to everyone" : m.restricted ? ", restricted" : ""}
                </p>
                <h3 className="mt-0.5 text-lg font-bold">{m.name}</h3>
                <p className="mt-1 text-[15px] text-ink-soft">{m.description}</p>
                <p className="mt-3 text-sm text-ink-soft tabular">
                  {recs.length} recordings, {formatDuration(recs.reduce((s, r) => s + r.durationSec, 0))}
                  {recs[0] ? `, latest ${fmtDate(recs[0].date)}` : ""}
                </p>
                <Link href={`/library#${m.id}`} className="mt-3 text-sm font-semibold text-ink underline underline-offset-4">
                  Open in the library
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="changes" className="mt-12 scroll-mt-28">
        <h2 className="display text-2xl">What changed</h2>
        <p className="mt-1 text-ink-soft">Decisions a later meeting replaced, in your missions. The old answer is kept as history.</p>
        {changes.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface p-5 text-ink-soft">No decision has been replaced in your missions.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {changes.map((d) => {
              const old = byId.get(d.supersedes[0]);
              return (
                <li key={d.id} className="rounded-2xl bg-surface p-5">
                  <p className="text-sm font-semibold text-valid">Now, since {fmtDate(d.date)}</p>
                  <p className="spoken mt-1">&ldquo;{excerpt(d.text, 22)}&rdquo;</p>
                  {old && (
                    <>
                      <p className="mt-3 text-sm font-semibold text-history">Before, from {fmtDate(old.date)}</p>
                      <p className="spoken mt-1 text-ink-soft">&ldquo;{excerpt(old.text, 22)}&rdquo;</p>
                    </>
                  )}
                  <Link href={`/library/${d.recordingId}?t=${Math.floor(d.start)}`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                    Hear it at {formatTime(d.start)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="imports" className="mt-12 scroll-mt-28">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-2xl">Imports</h2>
          <Link href="/import" className="text-sm font-semibold underline underline-offset-4">
            See all imports
          </Link>
        </div>
        <p className="mt-1 text-ink-soft">The latest recordings added to your missions, and where they are in the pipeline.</p>
        <ImportStatusList key={jobs.map((j) => j.id + j.status).join()} initial={jobs} scope="dashboard" />
      </section>
    </Page>
  );
}
