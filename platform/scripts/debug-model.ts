// Shows the raw model output for a few evaluation questions. Not part of the product.
import { allowedMissions, getIndex } from "../lib/engine/data";
import { embedQuery } from "../lib/engine/embed";
import { writeAnswer } from "../lib/engine/llm";
import { search } from "../lib/engine/retrieve";
import { DEFAULT_SETTINGS } from "../lib/engine/settings";
import { formatTime } from "../lib/engine/text";

const CASES: Array<[string, string]> = [
  ["camille.moreau", "What was ticket HEX-2291 about?"],
  ["thomas.girard", "What caused the station displays to go blank on March 19th?"],
  ["thomas.girard", "Which Kafka version does TransRail run?"],
  ["camille.moreau", "When does Hexa go live with SEPA Direct Debit?"],
];

async function main() {
  const idx = getIndex();
  for (const [user, q] of CASES) {
    const { hits } = search(idx, q, await embedQuery(q), allowedMissions(user));
    const prompt = [`Question: ${q}`, "", "Evidence:", ...hits.slice(0, 3).map((h, i) => `[E${i + 1}] ${h.recording.date}, "${h.recording.title}", at ${formatTime(h.chunk.start)}: ${h.chunk.text}`)].join("\n");
    const r = await writeAnswer(DEFAULT_SETTINGS, prompt, "ollama");
    console.log(`\n${q}\n  ${JSON.stringify(r.answer)}`);
  }
}

main();
