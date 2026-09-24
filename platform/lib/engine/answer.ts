// Answers a question for one user, with sources, freshness and an honest "not found".
//
//   1. Access    missions the user belongs to (from the catalog; SSO groups in production)
//   2. Retrieve  hybrid search restricted to those missions
//   3. Gate      not enough evidence -> "not found", no language model is called
//   4. Freshness decisions found in the evidence are checked against the decision register;
//                a replaced decision brings its replacement in, labelled CURRENT vs HISTORY
//   5. Compose   quote mode: verbatim transcript sentences with their minute
//                model mode: a language model writes the answer from the evidence
//   6. Verify    (model mode) every sentence must cite evidence it was given and be supported
//                by it; unsupported sentences are dropped; nothing left -> "not found"
import fs from "node:fs";
import path from "node:path";
import { allowedMissions, getIndex, getUser, type LoadedIndex } from "./data";
import { cosine, embedPassages, embedQuery } from "./embed";
import { llmConfigured, writeAnswer } from "./llm";
import { paths } from "./paths";
import { search } from "./retrieve";
import { readSettings } from "./settings";
import { excerpt, formatTime, tokenize, topicTokens } from "./text";
import type { Answer, Citation, Decision, Hit, Segment, Statement, TraceStep } from "./types";

const MAX_EVIDENCE_SEGMENTS = 3;
const EVIDENCE_MARGIN = 0.045;
const DIVERSITY_MARGIN = 0.02;
const SUPPORT_MIN_COSINE = 0.82;
const SUPPORT_MIN_OVERLAP = 0.3;

type Mode = "auto" | "quote" | "llm";

function citationFor(idx: LoadedIndex, seg: Segment, quote?: string): Citation {
  const rec = idx.recordingById.get(seg.recordingId)!;
  return {
    recordingId: rec.id,
    title: rec.title,
    date: rec.date,
    mission: rec.mission,
    start: seg.start,
    segmentId: seg.id,
    quote: quote ?? seg.text,
  };
}

function segmentById(idx: LoadedIndex, id: string): Segment {
  return idx.segments[idx.segmentPos.get(id)!];
}

// A Whisper segment can stop mid-sentence; extend short ones with the next segment.
function quoteFrom(idx: LoadedIndex, seg: Segment): string {
  if (seg.text.length >= 70) return seg.text;
  const next = idx.segments[idx.segmentPos.get(seg.id)! + 1];
  if (next && next.recordingId === seg.recordingId && next.start - seg.end < 2) return `${seg.text} ${next.text}`;
  return seg.text;
}

const DECISION_NEAR_SEC = 12;
const DECISION_MATCH_COSINE = 0.86;

// Decisions stated at the evidence, or elsewhere in the same meeting when they match the
// question closely (the decision is often stated a few sentences after the discussion).
function decisionsNear(idx: LoadedIndex, seg: Segment, qVec: number[]): Decision[] {
  return idx.decisions.filter((d, i) => {
    if (d.recordingId !== seg.recordingId) return false;
    if (d.segmentIds.includes(seg.id) || Math.abs(d.start - seg.start) <= DECISION_NEAR_SEC) return true;
    return cosine(qVec, idx.decisionVectors[i]) >= DECISION_MATCH_COSINE;
  });
}

function latestOf(idx: LoadedIndex, d: Decision): Decision {
  let cur = d;
  const seen = new Set<string>();
  while (cur.supersededBy && !seen.has(cur.id)) {
    seen.add(cur.id);
    const next = idx.decisions.find((x) => x.id === cur.supersededBy);
    if (!next) break;
    cur = next;
  }
  return cur;
}

function logQuestion(answer: Answer) {
  try {
    fs.mkdirSync(path.dirname(paths.qaLog), { recursive: true });
    fs.appendFileSync(
      paths.qaLog,
      JSON.stringify({
        at: new Date().toISOString(),
        user: answer.user,
        question: answer.question,
        status: answer.status,
        mode: answer.mode,
        citations: answer.statements.flatMap((s) => s.citations.map((c) => `${c.recordingId}@${Math.floor(c.start)}`)),
        latencyMs: answer.latencyMs,
        costUsd: answer.usage?.costUsd ?? 0,
      }) + "\n",
    );
  } catch {
    // Logging must never break an answer.
  }
}

export async function answerQuestion(question: string, login: string, mode: Mode = "auto"): Promise<Answer> {
  const started = performance.now();
  const idx = getIndex();
  const trace: TraceStep[] = [];
  const user = getUser(login);
  const missions = allowedMissions(login);
  trace.push({
    step: "Access",
    detail: user
      ? `${user.name} can search ${missions.length} mission(s): ${missions.join(", ")}. Everything else is excluded before search.`
      : `Unknown user "${login}": no access.`,
  });

  const qVec = await embedQuery(question);
  const { hits, gate, allowedChunks } = search(idx, question, qVec, missions);
  trace.push({
    step: "Retrieve",
    detail: `Keyword and semantic search over ${allowedChunks} passages. Top ${hits.length} kept.`,
    data: hits.map((h) => ({
      passage: h.chunk.id,
      meeting: h.recording.title,
      keywordRank: h.bm25Rank,
      semanticRank: h.semanticRank,
      semantic: Number(h.semantic.toFixed(3)),
      bestSentenceAt: formatTime(h.anchor.start),
      bestSentenceScore: Number(h.anchor.score.toFixed(3)),
    })),
  });
  trace.push({
    step: "Evidence gate",
    detail: gate.pass ? `Passed. ${gate.reason}` : `Stopped. ${gate.reason}`,
    data: { bestSentenceScore: Number(gate.bestSegmentSimilarity.toFixed(3)), topicTerms: gate.topicTerms, unknownTerms: gate.unknownTerms },
  });

  const base = { question, user: login, hits, trace };
  if (!gate.pass) {
    const answer: Answer = {
      ...base,
      status: "not_found",
      mode: "quote",
      headline: "Not found in the recordings you can access.",
      statements: [],
      decisions: { current: [], history: [] },
      latencyMs: Math.round(performance.now() - started),
    };
    logQuestion(answer);
    return answer;
  }

  // Evidence: the best sentence of the top passages, within a margin of the best one.
  // First pass takes one sentence per meeting (so a question spanning meetings gets each of
  // them), second pass fills up with the next best sentences.
  const ranked = [...hits].sort((a, b) => b.anchor.score - a.anchor.score);
  const bestScore = ranked[0].anchor.score;
  const eligible = ranked.filter((h) => h.anchor.score >= bestScore - EVIDENCE_MARGIN);
  const evidenceHits: Hit[] = [];
  const seenSegments = new Set<string>();
  const seenMeetings = new Set<string>();
  for (const pass of [0, 1]) {
    for (const h of eligible) {
      if (evidenceHits.length >= MAX_EVIDENCE_SEGMENTS) break;
      if (seenSegments.has(h.anchor.segmentId)) continue;
      if (pass === 0 && (seenMeetings.has(h.recording.id) || h.anchor.score < bestScore - DIVERSITY_MARGIN)) continue;
      seenSegments.add(h.anchor.segmentId);
      seenMeetings.add(h.recording.id);
      evidenceHits.push(h);
    }
  }
  const evidenceSegments = evidenceHits.map((h) => segmentById(idx, h.anchor.segmentId));

  // Freshness: look for decisions at or right around the evidence.
  const current = new Map<string, Decision>();
  const history = new Map<string, Decision>();
  for (const seg of evidenceSegments) {
    for (const d of decisionsNear(idx, seg, qVec)) {
      if (d.status === "superseded") {
        history.set(d.id, d);
        const latest = latestOf(idx, d);
        current.set(latest.id, latest);
      } else {
        current.set(d.id, d);
        for (const oldId of d.supersedes) {
          const old = idx.decisions.find((x) => x.id === oldId);
          if (old) history.set(old.id, old);
        }
      }
    }
  }
  // Only keep "current" decisions that are part of a replacement chain or directly in evidence.
  const currentList = [...current.values()].filter((d) => d.supersedes.length > 0 || evidenceSegments.some((s) => s.id === d.segmentId));
  const historyList = [...history.values()];
  trace.push({
    step: "Freshness",
    detail: historyList.length
      ? `${historyList.length} decision(s) in the evidence were replaced later. The latest one is shown as current, the older one as history.`
      : "No replaced decision in the evidence.",
    data: { current: currentList.map((d) => `${d.date}: ${d.text}`), history: historyList.map((d) => `${d.date}: ${d.text}`) },
  });

  const settings = readSettings();
  const useLlm = mode === "llm" || (mode === "auto" && llmConfigured(settings));

  let statements: Statement[] = [];
  let usage: Answer["usage"];
  let usedMode: Answer["mode"] = "quote";

  if (useLlm && llmConfigured(settings)) {
    try {
      const result = await composeWithModel(idx, question, evidenceHits, currentList, historyList, settings, trace);
      statements = result.statements;
      usage = result.usage;
      usedMode = "llm";
    } catch (err) {
      trace.push({ step: "Model", detail: `The language model failed (${(err as Error).message}). Falling back to quote mode.` });
    }
  }

  if (usedMode === "quote") {
    // When a replacement chain answers the question, the chain (current decision plus what it
    // replaced) is the answer; other quotes next to it were found to be noise.
    const hasChain = currentList.some((d) => d.supersedes.length > 0);
    const quoteSegments = hasChain ? [] : evidenceSegments;
    statements = composeQuotes(idx, quoteSegments, currentList, historyList);
    trace.push({ step: "Compose", detail: "Quote mode: the answer is made of verbatim transcript sentences, so nothing can be invented." });
  }

  const status = statements.length > 0 ? "answered" : "not_found";
  const meetings = new Set(statements.flatMap((s) => s.citations.map((c) => c.recordingId)));
  const latest = currentList.find((d) => d.supersedes.length > 0);
  const headline =
    status === "not_found"
      ? "Not found in the recordings you can access."
      : latest
        ? `Found in ${meetings.size} meeting${meetings.size > 1 ? "s" : ""}. This was changed later: the latest decision is from ${new Date(latest.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
        : `Found in ${meetings.size} meeting${meetings.size > 1 ? "s" : ""}.`;

  const answer: Answer = {
    ...base,
    status,
    mode: usedMode,
    headline,
    statements,
    decisions: { current: currentList, history: historyList },
    latencyMs: Math.round(performance.now() - started),
    usage,
  };
  logQuestion(answer);
  return answer;
}

function composeQuotes(idx: LoadedIndex, evidence: Segment[], current: Decision[], history: Decision[]): Statement[] {
  const statements: Statement[] = [];
  const used = new Set<string>();
  const historySegments = new Set(history.map((d) => d.segmentId));

  for (const d of current.filter((c) => c.supersedes.length > 0)) {
    const seg = segmentById(idx, d.segmentId);
    used.add(seg.id);
    statements.push({ text: excerpt(d.text), role: "current", citations: [citationFor(idx, seg, excerpt(d.text))] });
  }
  for (const seg of evidence) {
    if (used.has(seg.id) || historySegments.has(seg.id)) continue;
    used.add(seg.id);
    const quote = quoteFrom(idx, seg);
    statements.push({ text: quote, role: "evidence", citations: [citationFor(idx, seg, quote)] });
  }
  for (const d of history) {
    const seg = segmentById(idx, d.segmentId);
    if (used.has(seg.id)) continue;
    used.add(seg.id);
    statements.push({ text: excerpt(d.text), role: "history", citations: [citationFor(idx, seg, excerpt(d.text))] });
  }
  return statements;
}

async function composeWithModel(
  idx: LoadedIndex,
  question: string,
  hits: Hit[],
  current: Decision[],
  history: Decision[],
  settings: ReturnType<typeof readSettings>,
  trace: TraceStep[],
): Promise<{ statements: Statement[]; usage: Answer["usage"] }> {
  // Evidence blocks: the retrieved passages plus the passages holding current decisions.
  const blocks = new Map<string, { label: string; chunkPos: number }>();
  const labelFor = (chunkPos: number) => {
    const segIds = new Set(idx.chunks[chunkPos].segmentIds);
    if (current.some((d) => d.supersedes.length > 0 && segIds.has(d.segmentId))) return "CURRENT";
    if (history.some((d) => segIds.has(d.segmentId))) return "HISTORY";
    return "";
  };
  for (const h of hits) blocks.set(h.chunk.id, { label: "", chunkPos: idx.chunkPos.get(h.chunk.id)! });
  for (const d of current) {
    const chunkPos = idx.chunks.findIndex((c) => c.segmentIds.includes(d.segmentId));
    if (chunkPos >= 0) blocks.set(idx.chunks[chunkPos].id, { label: "", chunkPos });
  }
  const evidence = [...blocks.values()].map((b, i) => ({ id: `E${i + 1}`, ...b, label: labelFor(b.chunkPos) }));
  const prompt = [
    `Question: ${question}`,
    "",
    "Evidence:",
    ...evidence.map((e) => {
      const c = idx.chunks[e.chunkPos];
      const r = idx.recordingById.get(c.recordingId)!;
      return `[${e.id}]${e.label ? ` ${e.label}` : ""} ${r.date}, "${r.title}", at ${formatTime(c.start)}: ${c.text}`;
    }),
  ].join("\n");

  if (process.env.KW_DEBUG_PROMPT) console.error(prompt);
  const result = await writeAnswer(settings, prompt);
  trace.push({
    step: "Model",
    detail: `${result.provider} ${result.model} wrote ${result.answer.statements.length} statement(s) (${result.inputTokens} input and ${result.outputTokens} output tokens, $${result.costUsd.toFixed(4)}).`,
  });

  // The decision rests on the statements, not on the model's own status flag: in testing, a
  // local model wrote correct, cited statements and still flagged "not_found", while on trap
  // questions it wrote no statement at all. An answer exists only if a statement survives the
  // verification below.
  if (result.answer.statements.length === 0) {
    return { statements: [], usage: { provider: result.provider, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: result.costUsd } };
  }
  if (result.answer.status === "not_found") {
    trace.push({ step: "Model", detail: "The model flagged the question as not answered but still wrote statements; they are kept only if verification confirms them." });
  }

  // Verification: citations must point at evidence we gave, and the sentence must be supported.
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const kept: Statement[] = [];
  const dropped: string[] = [];
  const vectors = await embedPassages(result.answer.statements.map((s) => s.text));
  result.answer.statements.forEach((s, i) => {
    const cited = s.evidence.map((id) => byId.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
    if (cited.length === 0) {
      dropped.push(`"${s.text}" (no valid source)`);
      return;
    }
    const citations: Citation[] = [];
    let supported = false;
    const stmtTopic = new Set(topicTokens(s.text, idx.canon));
    for (const e of cited) {
      const chunk = idx.chunks[e.chunkPos];
      const chunkTokens = new Set(tokenize(chunk.text, idx.canon));
      const overlap = stmtTopic.size ? [...stmtTopic].filter((t) => chunkTokens.has(t)).length / stmtTopic.size : 0;
      const sim = cosine(vectors[i], idx.chunkVectors[e.chunkPos]);
      if (sim >= SUPPORT_MIN_COSINE || overlap >= SUPPORT_MIN_OVERLAP) supported = true;
      let bestSeg = segmentById(idx, chunk.segmentIds[0]);
      let bestSim = -1;
      for (const segId of chunk.segmentIds) {
        const pos = idx.segmentPos.get(segId)!;
        const segSim = cosine(vectors[i], idx.segmentVectors[pos]);
        if (segSim > bestSim) {
          bestSim = segSim;
          bestSeg = idx.segments[pos];
        }
      }
      citations.push(citationFor(idx, bestSeg));
    }
    if (!supported) {
      dropped.push(`"${s.text}" (not supported by its source)`);
      return;
    }
    const role = cited.some((e) => e.label === "HISTORY") && !cited.some((e) => e.label === "CURRENT") ? "history" : cited.some((e) => e.label === "CURRENT") ? "current" : "evidence";
    kept.push({ text: s.text, role, citations });
  });
  trace.push({
    step: "Verify",
    detail: dropped.length ? `${dropped.length} statement(s) dropped: ${dropped.join("; ")}` : "Every statement cites its evidence and is supported by it.",
  });
  return {
    statements: kept,
    usage: { provider: result.provider, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: result.costUsd },
  };
}
