import { AssistantChat } from "@/components/AssistantChat";
import { Page } from "@/components/Page";
import { getIndex, indexExists } from "@/lib/engine/data";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Assistant | Knowledge Warranty" };

// Suggested questions per mission, chosen to show the behaviours: a direct answer, a decision
// that changed, an answer from a French meeting, and an honest "not found".
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
  "nova-soc": ["In the ransomware playbook, what is the first thing to do on an infected host?"],
  "practice-data-ai": ["When evaluating a RAG assistant, how many test questions should we start with?"],
  "talks-library": ["What is the coded gaze?"],
};

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, user] = await Promise.all([searchParams, currentUser()]);
  if (!indexExists()) return <Page title="Assistant">The archive index is missing. Run npm run index.</Page>;
  const idx = getIndex();
  const durations = Object.fromEntries(idx.recordings.map((r) => [r.id, r.durationSec]));
  const suggestions = user.missions.flatMap((m) => SUGGESTIONS[m] ?? []).slice(0, 5);

  return (
    <Page
      title="Ask the"
      accent="archive"
      intro="Plain words, English or French. Every answer shows the meeting and the minute behind it, says when a later meeting changed it, and says so when the recordings do not know."
      width="max-w-4xl"
    >
      <AssistantChat key={user.email} suggestions={suggestions} durations={durations} initialQuestion={q} />
    </Page>
  );
}
