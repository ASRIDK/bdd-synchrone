// Ask a question from the terminal:  npm run ask -- thomas.girard "Which day do we deploy?"
import { answerQuestion } from "../lib/engine/answer";
import { formatTime } from "../lib/engine/text";

async function main() {
  const [login, ...words] = process.argv.slice(2);
  const answer = await answerQuestion(words.join(" "), login);
  console.log(`\n${answer.headline}  [${answer.status}, ${answer.mode}, ${answer.latencyMs} ms]\n`);
  for (const s of answer.statements) {
    const c = s.citations[0];
    console.log(`  ${s.role.toUpperCase().padEnd(8)} "${s.text}"`);
    console.log(`           ${c.date} ${c.title} at ${formatTime(c.start)}`);
  }
  console.log("");
  for (const t of answer.trace) console.log(`  [${t.step}] ${t.detail}`);
}

main();
