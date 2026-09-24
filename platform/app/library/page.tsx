import Link from "next/link";
import { getCatalog, getIndex } from "@/lib/engine/data";
import { formatTime } from "@/lib/engine/text";
import { currentUser } from "@/lib/session";

export default async function LibraryPage() {
  const user = await currentUser();
  const idx = getIndex();
  const missions = getCatalog().missions.filter((m) => user.missions.includes(m.id));

  return (
    <div className="max-w-4xl">
      <h1 className="text-[2rem] font-semibold tracking-tight">Library</h1>
      <p className="mt-2 text-ink-soft">
        Every recording is filed under its mission, with its date and participants. You see the missions you belong to.
      </p>

      <div className="mt-8 space-y-10">
        {missions.map((m) => {
          const recs = idx.recordings.filter((r) => r.mission === m.id).sort((a, b) => b.date.localeCompare(a.date));
          const decisions = idx.decisions.filter((d) => d.mission === m.id);
          return (
            <section key={m.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">{m.name}</h2>
                <p className="text-sm text-ink-faint">
                  {m.sector}, {m.practice}
                  {m.restricted ? ", restricted to the mission team" : ""}
                </p>
              </div>
              <p className="mt-1 text-ink-soft">{m.description}</p>
              <p className="mt-1 text-sm text-ink-faint tabular">
                {recs.length} recordings, {formatTime(recs.reduce((s, r) => s + r.durationSec, 0))} of audio,{" "}
                {decisions.filter((d) => d.status === "current").length} current decisions
              </p>
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {recs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/library/${r.id}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-paper">
                      <span>
                        <span className="font-medium">{r.title}</span>
                        <span className="ml-2 text-sm text-ink-faint">{r.participants.join(", ")}</span>
                      </span>
                      <span className="tabular text-sm text-ink-soft">
                        {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, {formatTime(r.durationSec)}
                        {r.language === "fr" ? ", in French" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
