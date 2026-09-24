// Prints the evidence-gate signals for every evaluation question, to calibrate GATE.
// Not part of the product.
import { getIndex, allowedMissions, readJson } from "../lib/engine/data";
import { embedQuery } from "../lib/engine/embed";
import { paths } from "../lib/engine/paths";
import { search } from "../lib/engine/retrieve";
import type { EvalQuestion } from "../lib/engine/evaluate";

async function main() {
  const idx = getIndex();
  const { questions } = readJson<{ questions: EvalQuestion[] }>(paths.evalQuestions);
  for (const q of questions) {
    const qVec = await embedQuery(q.question);
    const { gate, hits } = search(idx, q.question, qVec, allowedMissions(q.user));
    const top = hits[0];
    console.log(
      `${q.split.padEnd(6)} ${q.id.padEnd(4)} ${q.expected.padEnd(9)} best ${gate.bestSegmentSimilarity.toFixed(3)} chunk ${top ? top.semantic.toFixed(3) : "-"} bm25 ${top ? top.bm25.toFixed(1) : "-"} unknown ${gate.unknownTerms.length}/${gate.topicTerms.length} [${gate.unknownTerms.join(",")}]`,
    );
  }
}

main();
