import { Page } from "@/components/Page";
import Link from "next/link";
import fs from "node:fs";
import { notFound } from "next/navigation";
import { saveCorrection } from "@/app/review/actions";
import { getCatalog, getIndex } from "@/lib/engine/data";
import { paths } from "@/lib/engine/paths";
import { formatTime, normalize } from "@/lib/engine/text";
import { isEnabled } from "@/lib/flags";
import { currentUser } from "@/lib/session";

type Correction = { segmentId: string; text: string; reviewer: string; at: string };

export default async function ReviewPage() {
  if (!isEnabled("review")) notFound();
  const user = await currentUser();
  const idx = getIndex();
  const glossary = getCatalog().glossary;
  const corrections: Correction[] = fs.existsSync(paths.corrections) ? JSON.parse(fs.readFileSync(paths.corrections, "utf8")) : [];
  const pending = new Map(corrections.map((c) => [c.segmentId, c]));

  // A segment needs a look when Whisper was unsure, or when it contains a known mishearing of a
  // client term (a glossary alias such as "Post-Gur-SQL" for PostgreSQL).
  const queue = idx.segments
    .filter((s) => user.missions.includes(s.mission) && !s.corrected)
    .map((s) => {
      const reasons: string[] = [];
      if (s.avgLogprob < -0.3) reasons.push(`Whisper was unsure (confidence ${s.avgLogprob})`);
      if (s.noSpeechProb > 0.5) reasons.push("May be silence or noise");
      if (s.compressionRatio > 2.4) reasons.push("Repetitive text, possible hallucination");
      const text = normalize(s.text);
      for (const g of glossary) {
        for (const wrong of g.misheard ?? []) {
          const pattern = normalize(wrong).split(/[^a-z0-9]+/).filter(Boolean).join("[^a-z0-9]*");
          if (pattern && new RegExp(`\\b${pattern}\\b`).test(text)) reasons.push(`"${wrong}" is probably "${g.term}"`);
        }
      }
      return { s, reasons };
    })
    .filter((x) => x.reasons.length > 0);

  return (
    <Page title="Transcript" accent="review" width="max-w-4xl" intro={<>Sentences worth a human look. Listen, correct the text, save. Corrections are used the next time the index is built (<code>npm run index</code>), and the audio always stays the reference.</>}>
      <p className="mt-2 text-sm text-ink-faint">{queue.length} sentences to review in your missions, {corrections.length} corrections saved.</p>

      <ul className="mt-6 space-y-4">
        {queue.map(({ s, reasons }) => {
          const rec = idx.recordingById.get(s.recordingId)!;
          const saved = pending.get(s.id);
          return (
            <li key={s.id} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm text-ink-faint">
                <Link href={`/library/${rec.id}?t=${Math.floor(s.start)}`} className="underline underline-offset-4">{rec.title}, at {formatTime(s.start)}</Link>
              </p>
              <p className="mt-1 text-sm text-history">{reasons.join(". ")}.</p>
              <form action={saveCorrection} className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="segmentId" value={s.id} />
                <label className="sr-only" htmlFor={`fix-${s.id}`}>Corrected text</label>
                <input id={`fix-${s.id}`} name="text" defaultValue={saved?.text ?? s.text} className="spoken min-w-0 flex-1 rounded-md border border-line px-3 py-2" />
                <button type="submit" className="rounded-md border border-ink px-4 py-2 text-sm font-medium">{saved ? "Update correction" : "Save correction"}</button>
              </form>
              {saved && <p className="mt-1 text-sm text-valid">Correction saved by {saved.reviewer}, used at the next index build.</p>}
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
