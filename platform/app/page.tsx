import { AskClient } from "@/components/AskClient";
import { getCatalog, getIndex, indexExists } from "@/lib/engine/data";
import { currentUser } from "@/lib/session";

// Suggested questions per mission, chosen to show the four behaviours: a direct answer, a
// decision that changed, an answer found in a French meeting, and an honest "not found".
const SUGGESTIONS: Record<string, string[]> = {
  "hexa-instant-payments": [
    "What is the gateway timeout towards the clearing?",
    "Customers were charged twice when a payment was sent again. How was that solved?",
    "Which vendor provides fraud scoring for Banque Hexa?",
  ],
  "transrail-cloud": [
    "Screens in the stations went blank after new certificates were installed. What should I check first?",
    "On which day do TransRail production deployments go out?",
    "Who is the CTO of TransRail?",
  ],
  "nova-soc": [
    "In the ransomware playbook, what is the first thing to do on an infected host?",
    "Who on the team knows how to capture memory on the Nova fleet?",
  ],
  "practice-data-ai": ["When evaluating a RAG assistant, how many test questions should we start with?"],
};

export default async function AskPage() {
  const user = await currentUser();
  if (!indexExists()) {
    return <p className="text-ink-soft">The search index is missing. Run <code>npm run index</code> in the platform folder, then reload.</p>;
  }
  const idx = getIndex();
  const missions = getCatalog().missions.filter((m) => user.missions.includes(m.id));
  const suggestions = user.missions.flatMap((m) => SUGGESTIONS[m] ?? []).slice(0, 5);
  const durations = Object.fromEntries(idx.recordings.map((r) => [r.id, r.durationSec]));

  return (
    <div className="max-w-3xl">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-tight">Does Synchrone already know this?</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Ask in plain words, in English or French. You get the answer with the meeting and minute that prove it,
        whether a later meeting changed it, or a clear &quot;not found&quot;.
      </p>
      <p className="mt-3 text-sm text-ink-faint">
        Searching {missions.length} mission{missions.length > 1 ? "s" : ""} you belong to: {missions.map((m) => m.name).join("; ")}.
      </p>
      <AskClient key={user.login} suggestions={suggestions} durations={durations} />
    </div>
  );
}
