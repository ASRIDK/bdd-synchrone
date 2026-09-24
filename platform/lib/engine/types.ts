// Shared data shapes. The index file on disk follows these types exactly.

export type Mission = {
  id: string;
  name: string;
  client: string;
  sector: string;
  practice: string;
  restricted: boolean;
  description: string;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  voice: string;
  language: string;
  departure_date?: string;
};

export type User = {
  login: string;
  name: string;
  role: string;
  missions: string[];
};

// aliases: other correct ways to say the term ("Postgres").
// misheard: known transcription errors, found in review ("Post-Gur-SQL"). Both are mapped to the
// term for search; only "misheard" ones are flagged in the transcript review queue.
export type GlossaryEntry = { term: string; aliases: string[]; misheard?: string[] };

export type Catalog = {
  missions: Mission[];
  people: Person[];
  users: User[];
  glossary: GlossaryEntry[];
};

export type Recording = {
  id: string;
  mission: string;
  title: string;
  date: string;
  language: string;
  participants: string[];
  file: string;
  source: string;
  durationSec: number;
  transcription: {
    model: string;
    language: string;
    wallTimeSec: number;
    realtimeFactor: number | null;
    transcribedAt: string;
  };
};

export type Segment = {
  id: string;
  recordingId: string;
  mission: string;
  start: number;
  end: number;
  text: string;
  avgLogprob: number;
  noSpeechProb: number;
  compressionRatio: number;
  corrected?: boolean;
};

export type Chunk = {
  id: string;
  recordingId: string;
  mission: string;
  start: number;
  end: number;
  segmentIds: string[];
  text: string;
};

export type DecisionStatus = "current" | "superseded";

export type Decision = {
  id: string;
  mission: string;
  recordingId: string;
  date: string;
  segmentId: string;
  segmentIds: string[];
  start: number;
  text: string;
  status: DecisionStatus;
  supersededBy?: string;
  supersedes: string[];
  confirmedBy: string[];
  method: "rules" | "llm";
};

export type KnowledgeIndex = {
  builtAt: string;
  embeddingModel: string;
  recordings: Recording[];
  segments: Segment[];
  segmentVectors: number[][];
  chunks: Chunk[];
  chunkVectors: number[][];
  decisions: Decision[];
  decisionVectors: number[][];
  stats: {
    recordings: number;
    audioSeconds: number;
    segments: number;
    chunks: number;
    decisions: number;
    superseded: number;
    buildSeconds: number;
  };
};

export type Hit = {
  chunk: Chunk;
  recording: Recording;
  bm25: number;
  bm25Rank: number | null;
  semantic: number;
  semanticRank: number;
  fused: number;
  anchor: { segmentId: string; start: number; score: number };
};

export type Citation = {
  recordingId: string;
  title: string;
  date: string;
  mission: string;
  start: number;
  segmentId: string;
  quote: string;
};

export type Statement = {
  text: string;
  citations: Citation[];
  role: "evidence" | "current" | "history";
};

export type AnswerStatus = "answered" | "not_found";

export type TraceStep = { step: string; detail: string; data?: unknown };

export type Answer = {
  question: string;
  user: string;
  status: AnswerStatus;
  mode: "quote" | "llm";
  headline: string;
  statements: Statement[];
  decisions: {
    current: Decision[];
    history: Decision[];
  };
  hits: Hit[];
  trace: TraceStep[];
  latencyMs: number;
  usage?: { provider: string; model: string; inputTokens: number; outputTokens: number; costUsd: number };
};
