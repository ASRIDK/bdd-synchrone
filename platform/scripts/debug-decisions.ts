// Prints the raw semantic and keyword similarity of every same-mission decision pair.
// Used to calibrate SAME_TOPIC_THRESHOLD; not part of the product.
import { cosine } from "../lib/engine/embed";
import { getCatalog, getIndex } from "../lib/engine/data";
import { topicTokens } from "../lib/engine/text";

const idx = getIndex();
const canon = idx.canon;
void getCatalog;
const d = idx.decisions;
for (let j = 0; j < d.length; j++) {
  for (let i = 0; i < j; i++) {
    if (d[i].mission !== d[j].mission || d[i].recordingId === d[j].recordingId) continue;
    const cos = cosine(idx.decisionVectors[i], idx.decisionVectors[j]);
    const a = new Set(topicTokens(d[i].text, canon));
    const b = new Set(topicTokens(d[j].text, canon));
    const shared = [...a].filter((t) => b.has(t));
    console.log(`cos ${cos.toFixed(3)}  shared [${shared.join(",")}]  ${d[i].text.slice(0, 50)}  ->  ${d[j].text.slice(0, 50)}`);
  }
}
