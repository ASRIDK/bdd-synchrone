// Grid-searches the evidence gate on the TUNE half of the evaluation set only, then shows how
// the chosen setting does on the REPORT half, which was never used to choose it.
// Traps count double: the brief's target is zero invented answers.
//   npm run calibrate
import { allowedMissions, getIndex, readJson } from "../lib/engine/data";
import { embedQuery } from "../lib/engine/embed";
import type { EvalQuestion } from "../lib/engine/evaluate";
import { paths } from "../lib/engine/paths";
import { decideGate, search, type GateParams, type GateSignals } from "../lib/engine/retrieve";

type Row = { q: EvalQuestion; signals: GateSignals };

function score(rows: Row[], p: GateParams) {
  let answerableOk = 0;
  let answerable = 0;
  let trapOk = 0;
  let traps = 0;
  for (const { q, signals } of rows) {
    const pass = decideGate(signals, p).pass;
    if (q.expected === "answered") {
      answerable++;
      if (pass) answerableOk++;
    } else {
      traps++;
      if (!pass) trapOk++;
    }
  }
  return { answerableOk, answerable, trapOk, traps, objective: answerableOk + 2 * trapOk };
}

async function main() {
  const idx = getIndex();
  const { questions } = readJson<{ questions: EvalQuestion[] }>(paths.evalQuestions);
  const rows: Row[] = [];
  for (const q of questions) {
    const { gate } = search(idx, q.question, await embedQuery(q.question), allowedMissions(q.user));
    rows.push({ q, signals: gate });
  }
  const tune = rows.filter((r) => r.q.split === "tune");
  const report = rows.filter((r) => r.q.split === "report");

  let best: { p: GateParams; s: ReturnType<typeof score> } | null = null;
  for (let min = 0.78; min <= 0.9001; min += 0.005)
    for (let strong = min; strong <= 0.96; strong += 0.01)
      for (const share of [0.2, 0.25, 0.3, 0.34, 0.4, 0.5, 1.01])
        for (const cov of [0, 0.3, 0.4, 0.5, 0.6]) {
          const p = { minSegmentSimilarity: +min.toFixed(3), strongSegmentSimilarity: +strong.toFixed(3), maxUnknownTopicShare: share, minCoverage: cov };
          const s = score(tune, p);
          // Ties: prefer the least aggressive setting (lower thresholds) to avoid overfitting.
          if (!best || s.objective > best.s.objective) best = { p, s };
        }

  const r = score(report, best!.p);
  console.log("Chosen on the tune half:", best!.p);
  console.log(`  tune:   answerable ${best!.s.answerableOk}/${best!.s.answerable}, traps refused ${best!.s.trapOk}/${best!.s.traps}`);
  console.log(`  report: answerable ${r.answerableOk}/${r.answerable}, traps refused ${r.trapOk}/${r.traps}   (never seen during the search)`);
}

main();
