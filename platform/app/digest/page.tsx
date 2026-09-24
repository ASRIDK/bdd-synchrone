import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getIndex } from "@/lib/engine/data";
import { excerpt, formatTime } from "@/lib/engine/text";
import { isEnabled } from "@/lib/flags";
import { currentUser } from "@/lib/session";

const PERIODS = [30, 90, 365];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export default async function DigestPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!isEnabled("digest")) notFound();
  const { days: raw } = await searchParams;
  const days = PERIODS.includes(Number(raw)) ? Number(raw) : 90;
  const user = await currentUser();
  const idx = getIndex();
  const byId = new Map(idx.decisions.map((d) => [d.id, d]));
  const since = isoDaysAgo(days);
  const missions = getCatalog().missions.filter((m) => user.missions.includes(m.id));

  const sections = missions
    .map((m) => ({ m, list: idx.decisions.filter((d) => d.mission === m.id && d.date >= since).sort((a, b) => a.date.localeCompare(b.date)) }))
    .filter((x) => x.list.length > 0);

  return (
    <div className="max-w-3xl">
      <h1 className="text-[2rem] font-semibold tracking-tight">Decision digest</h1>
      <p className="mt-2 text-ink-soft">What was decided in your missions, and what it replaced. Ready to paste into a team email.</p>
      <div className="mt-4 flex gap-2">
        {PERIODS.map((p) => (
          <Link key={p} href={`/digest?days=${p}`} aria-current={p === days ? "page" : undefined} className={`rounded-md border px-3 py-1.5 text-sm ${p === days ? "border-ink" : "border-line text-ink-soft"}`}>
            Last {p} days
          </Link>
        ))}
      </div>

      {sections.length === 0 ? (
        <p className="mt-8 text-ink-soft">No decision recorded in your missions over the last {days} days. Try a longer period.</p>
      ) : (
        <article className="mt-8 rounded-xl border border-line bg-surface p-6">
          <p className="font-medium">Decisions since {new Date(since).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          {sections.map(({ m, list }) => (
            <section key={m.id} className="mt-5">
              <h2 className="font-semibold">{m.name}</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {list.map((d) => {
                  const rec = idx.recordingById.get(d.recordingId)!;
                  return (
                    <li key={d.id}>
                      {d.date}, {rec.title} ({formatTime(d.start)}): <span className="spoken">&ldquo;{excerpt(d.text)}&rdquo;</span>
                      {d.supersedes.length > 0 && (
                        <span className="text-history"> This replaces: &ldquo;{excerpt(byId.get(d.supersedes[0])?.text ?? "")}&rdquo; ({byId.get(d.supersedes[0])?.date}).</span>
                      )}
                      {d.status === "superseded" && <span className="text-history"> Replaced later.</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </article>
      )}
    </div>
  );
}
