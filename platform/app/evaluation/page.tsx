import { Page } from "@/components/Page";
import fs from "node:fs";
import path from "node:path";
import { paths } from "@/lib/engine/paths";
import type { EvalQuestion, EvalReport, QuestionResult } from "@/lib/engine/evaluate";
import { getIndex } from "@/lib/engine/data";
import { formatTime } from "@/lib/engine/text";

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


type ScriptMeeting = { id: string; title: string; date: string; language: string; lines: [string, string, string][] };

// The expected answer for a question, built from its refs (script line ids) in meetings.json.
// Trap questions expect "not found". A question with no usable ref has no reference answer.
function expectedAnswers(): Map<string, { kind: "lines"; lines: { meeting: string; text: string }[] } | { kind: "not_found"; access: boolean } | { kind: "none" }> {
  const script = JSON.parse(fs.readFileSync(paths.meetingsScript, "utf8")) as ScriptMeeting[];
  const line = new Map<string, { meeting: string; text: string }>();
  for (const m of script) {
    const date = new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    for (const [id, , text] of m.lines) line.set(id, { meeting: `${m.title}, ${date}${m.language === "fr" ? ", in French" : ""}`, text });
  }
  const { questions } = JSON.parse(fs.readFileSync(paths.evalQuestions, "utf8")) as { questions: EvalQuestion[] };
  const out = new Map();
  for (const q of questions) {
    if (q.expected === "not_found") out.set(q.id, { kind: "not_found", access: q.category === "access" });
    else {
      const lines = (q.refs ?? []).map((r) => line.get(r)).filter((l): l is { meeting: string; text: string } => !!l);
      out.set(q.id, lines.length ? { kind: "lines", lines } : { kind: "none" });
    }
  }
  return out;
}

// A recorded citation ("recording-id @ 11s") as the meeting title, the time and the sentence said there.
function citationText(c: string): { meeting: string; at: string; text: string } {
  const m = c.match(/^(.+) @ (\d+)s$/);
  if (!m) return { meeting: c, at: "", text: "" };
  const idx = getIndex();
  const sec = Number(m[2]);
  const seg = idx.segments.filter((s) => s.recordingId === m[1] && s.start < sec + 1).at(-1);
  return { meeting: idx.recordingById.get(m[1])?.title ?? m[1], at: formatTime(sec), text: seg?.text ?? "" };
}

function Said({ r }: { r?: QuestionResult }) {
  if (!r) return <span className="text-ink-faint">not run</span>;
  return (
    <div>
      <span className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold ${r.pass ? "bg-valid-bg text-valid" : "bg-history-bg text-history"}`}>
        {r.pass ? "Pass" : "Fail"}
      </span>
      {r.status === "not_found" ? (
        <p className="mt-1">Said: not found.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {[...new Set(r.citations)].slice(0, 3).map((c) => {
            const t = citationText(c);
            return (
              <li key={c}>
                <span className="text-ink-soft">{t.meeting}, {t.at}:</span> <span className="font-serif text-[14px]">&ldquo;{t.text}&rdquo;</span>
              </li>
            );
          })}
        </ul>
      )}
      {r.failure && <p className="mt-1 text-history">{r.failure}</p>}
    </div>
  );
}

function Expected({ e }: { e: ReturnType<typeof expectedAnswers> extends Map<string, infer V> ? V | undefined : never }) {
  if (!e || e.kind === "none") return <span className="text-ink-faint">No reference answer.</span>;
  if (e.kind === "not_found") return <span>Expected: not found{e.access ? " (the answer is in a mission this user cannot see)" : ""}.</span>;
  return (
    <ul className="space-y-1">
      {e.lines.map((l, i) => (
        <li key={i}>
          <span className="text-ink-soft">{l.meeting}:</span> <span className="font-serif text-[14px]">&ldquo;{l.text}&rdquo;</span>
        </li>
      ))}
    </ul>
  );
}

// The failure shown in the demo video. The recorded side is read from the eval file; the live
// side was checked by hand in the app on the date given, and is kept separate on purpose.
const DEMO_FAILURE = {
  id: "X03",
  liveCheckedOn: "29 September 2026",
  live: "Answered from the March incident review only (00:11 and 00:24): certificate rotation caused blank displays. The July meeting is not cited. Still a fail.",
  why: "The question is in English. The March incident review is in English and about the same words (certificate, rotation, problems), so it outranks the French July meeting where the answer is. The model writes only from the passages it is given, so it retells the March problem and misses that the July rotation went fine.",
};

function QuestionTable({ ids, quote, model, expected }: { ids: string[]; quote: EvalReport; model: EvalReport | null; expected: ReturnType<typeof expectedAnswers> }) {
  const byId = (r: EvalReport | null) => new Map((r?.questions ?? []).map((q) => [q.id, q]));
  const qm = byId(quote);
  const mm = byId(model);
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="text-ink-faint">
          <tr>
            <th className="w-[24%] py-1.5 pr-3 font-normal">Question</th>
            <th className="w-[28%] py-1.5 pr-3 font-normal">Expected (from the meeting scripts)</th>
            <th className="w-[24%] py-1.5 pr-3 font-normal">Quote mode said</th>
            <th className="w-[24%] py-1.5 font-normal">Model mode said</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const q = qm.get(id)!;
            return (
              <tr key={id} className="border-t border-line align-top">
                <td className="py-2 pr-3">
                  <p className="text-ink-faint">{id}, asked as {q.user}</p>
                  <p className="font-medium">{q.question}</p>
                  <p className="text-ink-faint">{CATEGORY_NAME[q.category] ?? q.category}</p>
                </td>
                <td className="py-2 pr-3"><Expected e={expected.get(id)} /></td>
                <td className="py-2 pr-3"><Said r={q} /></td>
                <td className="py-2"><Said r={mm.get(id)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
  const expected = expectedAnswers();
  const modelById = new Map((model?.questions ?? []).map((q) => [q.id, q]));
  const failedIds = quote.questions.filter((q) => !q.pass || modelById.get(q.id)?.pass === false).map((q) => q.id);
  const passedIds = quote.questions.filter((q) => !failedIds.includes(q.id)).map((q) => q.id);
  const demo = modelById.get(DEMO_FAILURE.id);
  const demoExpected = expected.get(DEMO_FAILURE.id);

  return (
    <Page title="Quality" accent="report" intro={<>50 test questions from our reverse brief, written before any tuning. Thresholds were set on half of them; the other half shows how the system does on questions it never saw.</>}>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Scorecard r={quote} title="Quote mode (no language model)" />
        {model && <Scorecard r={model} title="Model mode (local Qwen 3.5, 9.7B, via Ollama)" />}
      </div>

      {demo && demoExpected?.kind === "lines" && (
        <section className="mt-8 rounded-xl border border-history bg-surface p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-history">Known failure, shown in the demo</p>
          <p className="mt-1 text-lg font-medium">{demo.id}: {demo.question}</p>
          <dl className="mt-3 grid gap-x-4 gap-y-2 text-[14px] sm:grid-cols-[11rem_1fr]">
            <dt className="text-ink-faint">Expected</dt>
            <dd><Expected e={demoExpected} /></dd>
            <dt className="text-ink-faint">Recorded ({new Date(model!.runAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })})</dt>
            <dd><Said r={demo} /></dd>
            <dt className="text-ink-faint">Live today ({DEMO_FAILURE.liveCheckedOn})</dt>
            <dd>{DEMO_FAILURE.live}</dd>
            <dt className="text-ink-faint">Why it fails</dt>
            <dd>{DEMO_FAILURE.why}</dd>
          </dl>
        </section>
      )}

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
        <h2 className="text-xl font-semibold">Every question: what was expected, what the system said</h2>
        <p className="mt-1 text-ink-soft">
          Expected answers are the lines of the meeting scripts each question points to. Failed in at least one mode: {failedIds.length}. Passed in both: {passedIds.length}.
        </p>
        <QuestionTable ids={failedIds} quote={quote} model={model} expected={expected} />
        <details className="mt-4">
          <summary className="cursor-pointer text-ink-soft underline underline-offset-4">Show the {passedIds.length} questions passed in both modes</summary>
          <QuestionTable ids={passedIds} quote={quote} model={model} expected={expected} />
        </details>
      </section>

      <p className="mt-10 text-sm text-ink-faint">
        Run on {new Date(quote.runAt).toLocaleString("en-GB")}. Reproduce with <code>npm run eval</code>. Questions: data/eval/questions.json.
      </p>
    </Page>
  );
}
