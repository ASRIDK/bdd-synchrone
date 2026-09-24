import { Page } from "@/components/Page";
import fs from "node:fs";
import path from "node:path";
import { paths } from "@/lib/engine/paths";
import type { EvalReport } from "@/lib/engine/evaluate";

const CATEGORY_NAME: Record<string, string> = {
  exact: "Answer in the recordings, asked directly",
  paraphrase: "Answer in the recordings, asked differently",
  cross_language: "Asked in English, answered in a French meeting",
  multi_source: "Answer spread over several meetings",
  superseded: "Decision changed by a later meeting",
  not_in_archive: "Trap: the answer is not in the recordings",
  access: "Trap: the answer is in a mission the user cannot see",
};

function load(file: string): EvalReport | null {
  const p = path.join(path.dirname(paths.evalResults), file);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as EvalReport) : null;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Scorecard({ r, title }: { r: EvalReport; title: string }) {
  const s = r.summary;
  const rows: Array<[string, string, string, boolean]> = [
    ["Right passage in the top 3, direct questions", pct(s.exactHitAt3), "90%", s.exactHitAt3 >= 0.9],
    ["Right passage in the top 3, reworded questions", pct(s.paraphraseHitAt3), "80%", s.paraphraseHitAt3 >= 0.8],
    ["Trap questions answered instead of refused", String(s.answeredTraps), "0 of 20", s.answeredTraps === 0],
    ["Content shown from a mission the user cannot see", String(s.accessLeaks), "0", s.accessLeaks === 0],
    ["Time to answer, 95th percentile", s.latencyP95 < 1000 ? `${s.latencyP95} ms` : `${(s.latencyP95 / 1000).toFixed(1)} s`, "under 5 s", s.latencyP95 < 5000],
  ];
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-ink-soft">
        <span className="text-2xl font-semibold text-ink tabular">{s.all.passed}/{s.all.total}</span> questions passed.{" "}
        On the half never used to tune thresholds: <span className="tabular">{s.report.passed}/{s.report.total}</span>.
      </p>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-ink-faint">
          <tr>
            <th className="py-1.5 pr-3 font-normal">Target from the reverse brief</th>
            <th className="py-1.5 pr-3 font-normal">Measured</th>
            <th className="py-1.5 pr-3 font-normal">Target</th>
            <th className="py-1.5 font-normal">Met</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map(([label, got, target, ok]) => (
            <tr key={label} className="border-t border-line">
              <td className="py-1.5 pr-3">{label}</td>
              <td className="py-1.5 pr-3 font-medium">{got}</td>
              <td className="whitespace-nowrap py-1.5 pr-3 text-ink-soft">{target}</td>
              <td className={`py-1.5 font-medium ${ok ? "text-valid" : "text-history"}`}>{ok ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function EvaluationPage() {
  const quote = load("results.json");
  const model = load("results-llm-ollama.json");
  if (!quote) return <p>No evaluation yet. Run <code>npm run eval</code> in the platform folder.</p>;
  const a = quote.asr;

  return (
    <Page title="Quality" accent="report" width="max-w-5xl" intro={<>The 50 test questions from our reverse brief, written before tuning, scored pass or fail. Failures are listed with the reason. Thresholds were set on half of the questions only; the other half shows how the system does on questions it was not tuned on.</>}>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Scorecard r={quote} title="Quote mode (no language model)" />
        {model && <Scorecard r={model} title="Model mode (local Qwen 3.5, 9.7B, via Ollama)" />}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">By type of question, quote mode</h2>
        <table className="mt-3 w-full text-left text-sm">
          <tbody className="tabular">
            {Object.entries(quote.summary.byCategory).map(([cat, c]) => (
              <tr key={cat} className="border-t border-line">
                <td className="py-2 pr-3">{CATEGORY_NAME[cat] ?? cat}</td>
                <td className="py-2 pr-3 font-medium">{c.passed}/{c.total}</td>
                <td className="py-2">
                  <span className="block h-1.5 w-32 rounded-full bg-line">
                    <span className="block h-1.5 rounded-full bg-ink" style={{ width: `${c.rate * 100}%` }} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Transcription quality</h2>
        <p className="mt-2 text-ink-soft">
          Measured against the meeting scripts. {a.audioMinutes.toFixed(1)} minutes of audio were transcribed on a laptop
          processor at {a.realtimeFactor.toFixed(1)} times real time. Word error rate: {pct(a.werEnglish)} in English, {pct(a.werFrench)} in French.
          Client jargon heard correctly: {a.glossary.heard} of {a.glossary.checked} terms.
        </p>
        {a.glossary.missed.length > 0 && <p className="mt-2 text-sm text-ink-faint">Misheard: {a.glossary.missed.join("; ")}.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Failed questions, quote mode</h2>
        <ul className="mt-3 space-y-3">
          {quote.questions.filter((q) => !q.pass).map((q) => (
            <li key={q.id} className="rounded-lg border border-line bg-surface p-4">
              <p className="text-sm text-ink-faint">{q.id}, {CATEGORY_NAME[q.category]}, asked as {q.user}</p>
              <p className="mt-1 font-medium">{q.question}</p>
              <p className="mt-1 text-history">{q.failure}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-ink-faint">
        Run on {new Date(quote.runAt).toLocaleString("en-GB")}. Reproduce with <code>npm run eval</code>. Questions: data/eval/questions.json.
      </p>
    </Page>
  );
}
