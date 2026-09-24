// Runs the 50-question evaluation and writes data/eval/results.json.
//   npm run eval                 quote mode unless a language model is configured
//   npm run eval -- --quote      force quote mode
//   npm run eval -- --split tune only print the tune questions (thresholds are set on these)
import { runEvaluation } from "../lib/engine/evaluate";

const pct = (x: number) => `${Math.round(x * 100)}%`;

async function main() {
  const mode = process.argv.includes("--quote") ? "quote" : process.argv.includes("--llm") ? "llm" : "auto";
  const splitArg = process.argv.indexOf("--split");
  const onlySplit = splitArg > 0 ? process.argv[splitArg + 1] : null;

  const report = await runEvaluation(mode, (r) => {
    if (onlySplit && r.split !== onlySplit) return;
    const mark = r.pass ? "PASS" : "FAIL";
    console.log(`${mark} ${r.id.padEnd(4)} ${r.category.padEnd(15)} ${r.status.padEnd(10)} ${r.latencyMs}ms  ${r.failure ?? ""}`);
  });
  const s = report.summary;
  console.log(`\nMode: ${report.mode}`);
  console.log(`All questions:     ${s.all.passed}/${s.all.total} (${pct(s.all.rate)})`);
  console.log(`Report split only: ${s.report.passed}/${s.report.total} (${pct(s.report.rate)})`);
  for (const [cat, c] of Object.entries(s.byCategory)) console.log(`  ${cat.padEnd(15)} ${c.passed}/${c.total}`);
  console.log(`Exact questions, right passage in top 3:      ${pct(s.exactHitAt3)} (target 90%)`);
  console.log(`Paraphrased questions, right passage in top 3: ${pct(s.paraphraseHitAt3)} (target 80%)`);
  console.log(`Trap questions answered instead of refused:  ${s.answeredTraps} (target 0)`);
  console.log(`Access leaks:                                  ${s.accessLeaks} (target 0)`);
  console.log(`Latency p50 / p95:                             ${s.latencyP50} / ${s.latencyP95} ms (target p95 < 5000)`);
  console.log(`Cost per question:                             $${s.costPerQuestionUsd.toFixed(4)}`);
  const a = report.asr;
  console.log(`\nTranscription: ${a.audioMinutes.toFixed(1)} min of audio at ${a.realtimeFactor.toFixed(1)}x realtime`);
  console.log(`Word error rate: English ${pct(a.werEnglish)}, French ${pct(a.werFrench)}`);
  console.log(`Glossary terms heard correctly: ${a.glossary.heard}/${a.glossary.checked}. Missed: ${a.glossary.missed.join("; ") || "none"}`);
}

main();
