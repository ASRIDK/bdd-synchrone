// Runs the 50-question evaluation from the reverse brief and scores every question pass/fail.
// Also measures transcription quality against the meeting scripts (word error rate and
// glossary terms heard correctly), which the brief asks for on poor audio and accents.
import fs from "node:fs";
import path from "node:path";
import { answerQuestion } from "./answer";
import { getCatalog, getIndex, readJson } from "./data";
import { GATE } from "./retrieve";
import { paths } from "./paths";
import { makeCanonicalizer, normalize } from "./text";
import type { Answer } from "./types";

export type EvalQuestion = {
  id: string;
  split: "tune" | "report";
  category: "exact" | "paraphrase" | "cross_language" | "multi_source" | "superseded" | "not_in_archive" | "access";
  user: string;
  question: string;
  expected: "answered" | "not_found";
  refs?: string[];
  minMeetings?: number;
  current?: string;
  history?: string;
  forbidden?: string;
};

type Truth = Record<string, { file: string; duration_sec: number; lines: Record<string, [number, number]> }>;
type ScriptMeeting = { id: string; language: string; lines: Array<[string, string, string]> };

export type QuestionResult = {
  id: string;
  split: string;
  category: string;
  user: string;
  question: string;
  expected: string;
  status: string;
  pass: boolean;
  checks: Record<string, boolean | number | null>;
  failure?: string;
  citations: string[];
  latencyMs: number;
  costUsd: number;
};

export type EvalReport = {
  runAt: string;
  mode: string;
  gate: typeof GATE;
  windowSec: number;
  summary: {
    all: CategorySummary;
    report: CategorySummary;
    byCategory: Record<string, CategorySummary>;
    exactHitAt3: number;
    paraphraseHitAt3: number;
    answeredTraps: number;
    accessLeaks: number;
    latencyP50: number;
    latencyP95: number;
    costPerQuestionUsd: number;
  };
  asr: AsrReport;
  questions: QuestionResult[];
};

type CategorySummary = { total: number; passed: number; rate: number };
type AsrReport = {
  meetings: Array<{ id: string; language: string; words: number; wer: number }>;
  werEnglish: number;
  werFrench: number;
  glossary: { checked: number; heard: number; missed: string[] };
  realtimeFactor: number;
  audioMinutes: number;
};

const WINDOW_SEC = 30;

function lineLocation(truth: Truth, lineId: string): { recordingId: string; start: number } | null {
  for (const [recordingId, m] of Object.entries(truth)) {
    if (m.lines[lineId]) return { recordingId, start: m.lines[lineId][0] };
  }
  return null;
}

function near(loc: { recordingId: string; start: number } | null, recordingId: string, start: number): boolean {
  return Boolean(loc && loc.recordingId === recordingId && Math.abs(loc.start - start) <= WINDOW_SEC);
}

function summarize(results: QuestionResult[]): CategorySummary {
  const passed = results.filter((r) => r.pass).length;
  return { total: results.length, passed, rate: results.length ? passed / results.length : 0 };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

export function scoreQuestion(q: EvalQuestion, a: Answer, truth: Truth, userMissions: string[]): QuestionResult {
  const citations = a.statements.flatMap((s) => s.citations);
  const checks: QuestionResult["checks"] = {};
  let pass = false;
  let failure: string | undefined;

  const leak =
    a.hits.some((h) => !userMissions.includes(h.chunk.mission)) ||
    citations.some((c) => !userMissions.includes(c.mission));
  checks.accessLeak = leak;

  if (q.expected === "answered") {
    const refs = (q.refs ?? []).map((r) => lineLocation(truth, r));
    const top3 = [...a.hits].sort((x, y) => y.fused - x.fused).slice(0, 3);
    const hitAt3 = top3.some((h) => refs.some((ref) => near(ref, h.chunk.recordingId, h.anchor.start)));
    const citationOk = citations.some((c) => refs.some((ref) => near(ref, c.recordingId, c.start)));
    checks.hitAt3 = hitAt3;
    checks.answered = a.status === "answered";
    checks.citationWithin30s = citationOk;
    pass = a.status === "answered" && hitAt3 && citationOk;
    if (a.status !== "answered") failure = "Said not found, but the answer is in the recordings.";
    else if (!hitAt3) failure = "The right passage was not in the top 3 results.";
    else if (!citationOk) failure = "No citation within 30 s of the right moment.";

    if (q.minMeetings) {
      const meetings = new Set(citations.map((c) => c.recordingId)).size;
      checks.meetingsCited = meetings;
      if (pass && meetings < q.minMeetings) {
        pass = false;
        failure = `Cited ${meetings} meeting(s), expected at least ${q.minMeetings}.`;
      }
    }
    if (q.current) {
      const cur = lineLocation(truth, q.current);
      const hist = q.history ? lineLocation(truth, q.history) : null;
      const currentOk = a.statements.some((s) => s.role === "current" && s.citations.some((c) => near(cur, c.recordingId, c.start)));
      const oldShownAsCurrent = a.statements.some(
        (s) => s.role !== "history" && s.citations.some((c) => hist && c.recordingId === hist.recordingId && Math.abs(c.start - hist.start) <= 5),
      );
      checks.currentShownAsCurrent = currentOk;
      checks.oldShownAsCurrent = oldShownAsCurrent;
      if (pass && (!currentOk || oldShownAsCurrent)) {
        pass = false;
        failure = !currentOk ? "The latest decision was not labelled as current." : "The replaced decision was presented as current.";
      }
    }
  } else {
    checks.saidNotFound = a.status === "not_found";
    checks.answeredTrap = a.status === "answered";
    pass = a.status === "not_found" && !leak;
    if (!pass) failure = leak ? "Content from a mission the user cannot see was exposed." : "Answered a question the recordings cannot answer.";
  }
  if (leak) pass = false;

  return {
    id: q.id,
    split: q.split,
    category: q.category,
    user: q.user,
    question: q.question,
    expected: q.expected,
    status: a.status,
    pass,
    checks,
    failure: pass ? undefined : failure,
    citations: citations.map((c) => `${c.recordingId} @ ${Math.floor(c.start)}s`),
    latencyMs: a.latencyMs,
    costUsd: a.usage?.costUsd ?? 0,
  };
}

// ---- Transcription quality -------------------------------------------------------------------

const EN_UNITS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const EN_TENS = "  twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
const FR_UNITS = "zero un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize".split(" ");
const FR_TENS = "  vingt trente quarante cinquante soixante".split(" ");

function numberToWords(n: number, lang: string): string {
  if (lang === "fr") {
    if (n < 17) return FR_UNITS[n];
    if (n < 20) return `dix ${FR_UNITS[n - 10]}`;
    if (n < 70) return `${FR_TENS[Math.floor(n / 10)]}${n % 10 ? ` ${FR_UNITS[n % 10]}` : ""}`;
    return String(n);
  }
  if (n < 20) return EN_UNITS[n];
  if (n < 100) return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? ` ${EN_UNITS[n % 10]}` : ""}`;
  if (n < 1000) return `${EN_UNITS[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberToWords(n % 100, lang)}` : ""}`;
  return String(n);
}

function werTokens(text: string, lang: string): string[] {
  return normalize(text)
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(/\b\d{1,3}\b/g, (d) => ` ${numberToWords(Number(d), lang)} `)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(a: string[], b: string[]): number {
  const prev = new Array(b.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export function measureAsr(): AsrReport {
  const idx = getIndex();
  const catalog = getCatalog();
  const script = readJson<ScriptMeeting[]>(paths.meetingsScript);
  const canon = makeCanonicalizer([]);
  const meetings: AsrReport["meetings"] = [];
  let checked = 0;
  let heard = 0;
  const missed = new Set<string>();

  for (const m of script) {
    const reference = m.lines.map((l) => l[2]).join(" ");
    const hypothesis = idx.segments.filter((s) => s.recordingId === m.id).map((s) => s.text).join(" ");
    const ref = werTokens(reference, m.language);
    const hyp = werTokens(hypothesis, m.language);
    meetings.push({ id: m.id, language: m.language, words: ref.length, wer: editDistance(ref, hyp) / ref.length });

    // A glossary term is "heard" when its exact spelling appears in the raw transcript.
    const hypNorm = canon(hypothesis).replace(/[^a-z0-9]+/g, "");
    for (const g of catalog.glossary) {
      const term = normalize(g.term).replace(/[^a-z0-9]+/g, "");
      if (!normalize(reference).replace(/[^a-z0-9]+/g, "").includes(term)) continue;
      checked++;
      if (hypNorm.includes(term)) heard++;
      else missed.add(`${g.term} (${m.id})`);
    }
  }
  const weighted = (lang: string) => {
    const list = meetings.filter((x) => x.language === lang);
    const words = list.reduce((s, x) => s + x.words, 0);
    return words ? list.reduce((s, x) => s + x.wer * x.words, 0) / words : 0;
  };
  const audio = idx.recordings.reduce((s, r) => s + r.durationSec, 0);
  const wall = idx.recordings.reduce((s, r) => s + r.transcription.wallTimeSec, 0);
  return {
    meetings,
    werEnglish: weighted("en"),
    werFrench: weighted("fr"),
    glossary: { checked, heard, missed: [...missed] },
    realtimeFactor: wall ? audio / wall : 0,
    audioMinutes: audio / 60,
  };
}

// ---- Runner ----------------------------------------------------------------------------------

export async function runEvaluation(mode: "auto" | "quote" | "llm" = "auto", onProgress?: (r: QuestionResult) => void): Promise<EvalReport> {
  const { questions } = readJson<{ questions: EvalQuestion[] }>(paths.evalQuestions);
  const truth = readJson<Truth>(paths.groundTruth);
  const catalog = getCatalog();
  const results: QuestionResult[] = [];
  let usedMode = "quote";

  for (const q of questions) {
    const answer = await answerQuestion(q.question, q.user, mode);
    if (answer.mode === "llm") usedMode = "llm";
    const userMissions = catalog.users.find((u) => u.login === q.user)?.missions ?? [];
    const r = scoreQuestion(q, answer, truth, userMissions);
    results.push(r);
    onProgress?.(r);
  }

  const byCategory: Record<string, CategorySummary> = {};
  for (const cat of [...new Set(results.map((r) => r.category))]) {
    byCategory[cat] = summarize(results.filter((r) => r.category === cat));
  }
  const rate = (cat: string) => {
    const list = results.filter((r) => r.category === cat);
    return list.length ? list.filter((r) => r.checks.hitAt3).length / list.length : 0;
  };
  const latencies = results.map((r) => r.latencyMs);
  const report: EvalReport = {
    runAt: new Date().toISOString(),
    mode: usedMode,
    gate: GATE,
    windowSec: WINDOW_SEC,
    summary: {
      all: summarize(results),
      report: summarize(results.filter((r) => r.split === "report")),
      byCategory,
      exactHitAt3: rate("exact"),
      paraphraseHitAt3: rate("paraphrase"),
      answeredTraps: results.filter((r) => r.checks.answeredTrap === true).length,
      accessLeaks: results.filter((r) => r.checks.accessLeak === true).length,
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
      costPerQuestionUsd: results.reduce((s, r) => s + r.costUsd, 0) / Math.max(1, results.length),
    },
    asr: measureAsr(),
    questions: results,
  };
  fs.mkdirSync(path.dirname(paths.evalResults), { recursive: true });
  fs.writeFileSync(paths.evalResults, JSON.stringify(report, null, 2));
  return report;
}
