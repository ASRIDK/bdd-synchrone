import { Page } from "@/components/Page";
import Link from "next/link";
import { getCatalog, getIndex } from "@/lib/engine/data";
import { excerpt, formatTime } from "@/lib/engine/text";
import type { Decision } from "@/lib/engine/types";
import { currentUser } from "@/lib/session";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function DecisionsPage() {
  const user = await currentUser();
  const idx = getIndex();
  const byId = new Map(idx.decisions.map((d) => [d.id, d]));
  const missions = getCatalog().missions.filter((m) => user.missions.includes(m.id));

  const link = (d: Decision) => (
    <Link href={`/library/${d.recordingId}?t=${Math.floor(d.start)}`} className="tabular text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
      {idx.recordingById.get(d.recordingId)?.title}, {fmtDate(d.date)}, at {formatTime(d.start)}
    </Link>
  );

  return (
    <Page title="Decision" accent="register" width="max-w-4xl" intro={<>Decisions found in the recordings, per mission. When a later meeting explicitly changed a decision, the new one is current and the old one stays here as history. A later meeting that only repeats a decision confirms it; it does not replace it.</>}>
      <p className="mt-2 text-sm text-ink-faint">
        Found automatically with language cues in English and French and meaning similarity. Each entry links to the moment it was said, so anyone can check it.
      </p>

      {missions.map((m) => {
        const list = idx.decisions.filter((d) => d.mission === m.id);
        const current = list.filter((d) => d.status === "current").sort((a, b) => b.date.localeCompare(a.date));
        if (list.length === 0) return null;
        return (
          <section key={m.id} className="mt-10">
            <h2 className="text-xl font-semibold">{m.name}</h2>
            <ul className="mt-4 space-y-4">
              {current.map((d) => (
                <li key={d.id} className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-sm font-medium text-valid">Current{d.confirmedBy.length ? `, confirmed ${d.confirmedBy.length} time${d.confirmedBy.length > 1 ? "s" : ""} later` : ""}</p>
                  <p className="spoken mt-1">&ldquo;{excerpt(d.text)}&rdquo;</p>
                  <div className="mt-1">{link(d)}</div>
                  {d.supersedes.map((oldId) => {
                    const old = byId.get(oldId)!;
                    return (
                      <div key={oldId} className="mt-3 border-l-[3px] border-history pl-3">
                        <p className="text-sm font-medium text-history">Replaced this decision</p>
                        <p className="spoken mt-0.5 text-ink-soft">&ldquo;{excerpt(old.text)}&rdquo;</p>
                        <div className="mt-0.5">{link(old)}</div>
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Page>
  );
}
