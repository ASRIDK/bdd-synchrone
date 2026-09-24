// Every capability of the platform, with its launch status.
//   live     part of the product, always on
//   beta     built and working, switched on per team from Settings (soft launch)
//   planned  designed but not built: what it needs and how it plugs in is documented here and
//            in docs/ROADMAP.md, so it can be picked up without redesign
export type FeatureStatus = "live" | "beta" | "planned";

export type Feature = {
  id: string;
  name: string;
  status: FeatureStatus;
  forWho: string;
  summary: string;
  href?: string;
  needs?: string;
};

export const FEATURES: Feature[] = [
  {
    id: "ask",
    name: "Ask the recordings",
    status: "live",
    forWho: "engineers on missions",
    summary: "A plain-language question returns the answer, the meeting and minute that prove it, whether it is still valid, or a clear \"not found\".",
    href: "/",
  },
  {
    id: "library",
    name: "Mission library",
    status: "live",
    forWho: "everyone",
    summary: "Recordings filed by mission, with date and participants. Open a meeting, read the transcript, click a line to hear it.",
    href: "/library",
  },
  {
    id: "decisions",
    name: "Decision register",
    status: "live",
    forWho: "project managers and practice leads",
    summary: "Every decision found in the recordings, which one is current, and what replaced the old ones.",
    href: "/decisions",
  },
  {
    id: "evaluation",
    name: "Quality report",
    status: "live",
    forWho: "Synchrone and the project team",
    summary: "The 50 test questions from the reverse brief, scored pass or fail, failures included.",
    href: "/evaluation",
  },
  {
    id: "value",
    name: "Value and cost",
    status: "live",
    forWho: "management",
    summary: "The business case from the reverse brief as a live calculator, with the running cost at scale.",
    href: "/value",
  },
  {
    id: "experts",
    name: "Who knows what",
    status: "beta",
    forWho: "practice leads and staffing",
    summary: "People and the topics they speak about in recordings, and knowledge held by a single person who is about to leave.",
    href: "/experts",
  },
  {
    id: "review",
    name: "Transcript review",
    status: "beta",
    forWho: "mission leads and quality",
    summary: "Sentences Whisper was unsure about, and client jargon it misheard. A reviewer fixes them; the fix is used at the next index build.",
    href: "/review",
  },
  {
    id: "digest",
    name: "Decision digest",
    status: "beta",
    forWho: "mission teams",
    summary: "What changed per mission over a period: new decisions and the ones they replaced. Ready to paste in a weekly email.",
    href: "/digest",
  },
  {
    id: "meeting-bot",
    name: "Meeting recorder bot",
    status: "planned",
    forWho: "everyone",
    summary: "Invite the recorder to a Teams meeting like a colleague; it joins, records and files the recording under the right mission.",
    needs: "Microsoft Teams bot registration and Graph API recording permissions from Synchrone IT. Plugs into the recording registry (data/recordings.json) as a new source.",
  },
  {
    id: "upload",
    name: "Upload a recording",
    status: "planned",
    forWho: "everyone",
    summary: "Drop an existing recording in the library; it is transcribed and indexed automatically.",
    needs: "A job queue and a transcription worker (the pipeline already exists: pipeline/transcribe.py). Storage in Synchrone's tenant.",
  },
  {
    id: "sso",
    name: "Sign-in with Synchrone accounts",
    status: "planned",
    forWho: "Synchrone IT",
    summary: "Use the login employees already have. Mission access follows directory groups instead of the demo catalog.",
    needs: "Microsoft Entra ID app registration; one group per mission. Replaces lib/session.ts and the users list in catalog.json.",
  },
  {
    id: "teams-assistant",
    name: "Ask from Teams",
    status: "planned",
    forWho: "engineers",
    summary: "The same question and answer, inside a Teams chat.",
    needs: "A Teams app calling POST /api/ask with the signed-in user. No change to the engine.",
  },
  {
    id: "speakers",
    name: "Speaker names",
    status: "planned",
    forWho: "everyone",
    summary: "Who said each sentence, so the register can tell who took a decision.",
    needs: "Speaker diarisation (for example pyannote) in the pipeline, then a one-time mapping of voices to people.",
  },
  {
    id: "llm-decisions",
    name: "Model-checked decision register",
    status: "planned",
    forWho: "project managers",
    summary: "A language model confirms each \"replaced by\" link that the rules propose, and catches the ones they miss.",
    needs: "A configured model (Settings). Runs at index build time on candidate pairs only, so cost stays small.",
  },
  {
    id: "retention",
    name: "Retention and deletion rules",
    status: "planned",
    forWho: "legal and IT",
    summary: "Delete or anonymise recordings after a period set per client contract, and on request.",
    needs: "Client contract terms and a data protection review. Deletion must remove audio, transcript and index entries together.",
  },
];

export function featureById(id: string): Feature | undefined {
  return FEATURES.find((f) => f.id === id);
}
