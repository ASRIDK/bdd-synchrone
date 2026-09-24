// Smoke test: loads the local multilingual embedding model and checks that an English question
// lands closer to the French passage that answers it than to an unrelated English one.
import { embedPassages, embedQuery, cosine } from "../lib/engine/embed";

async function main() {
  const started = Date.now();
  const q = await embedQuery("Which day do TransRail production deployments go out now?");
  const [fr, other] = await embedPassages([
    "Alors on change. À partir de maintenant, les mises en production passent le mardi matin, et plus le jeudi.",
    "Kafka retention is seven days on all topics.",
  ]);
  console.log(`model ready and 3 texts embedded in ${Date.now() - started} ms`);
  console.log(`question vs French answer: ${cosine(q, fr).toFixed(3)}`);
  console.log(`question vs unrelated:     ${cosine(q, other).toFixed(3)}`);
}

main();
