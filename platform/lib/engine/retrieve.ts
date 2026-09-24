// Hybrid retrieval: keyword (BM25) + meaning (embeddings), fused by reciprocal rank.
// The access filter is applied BEFORE ranking: chunks from missions the user cannot see are
// never scored, so they cannot leak through scores, ranks or "not found" explanations.
import { scoreBm25 } from "./bm25";
import { cosine } from "./embed";
import type { LoadedIndex } from "./data";
import { tokenize, topicTokens } from "./text";
import type { Hit } from "./types";

const RRF_K = 60;

// Evidence gate thresholds, calibrated on the "tune" half of the evaluation set only
// (npm run calibrate). See docs/HOW-IT-WORKS.md, section "Saying I don't know".
export type GateParams = {
  minSegmentSimilarity: number;
  strongSegmentSimilarity: number;
  maxUnknownTopicShare: number;
  minCoverage: number;
};

// Output of `npm run calibrate` on the tune half (24 questions), 24 September 2026.
export const GATE: GateParams = {
  minSegmentSimilarity: 0.78,
  strongSegmentSimilarity: 0.86,
  maxUnknownTopicShare: 0.2,
  minCoverage: 0.6,
};

export type GateSignals = {
  bestSegmentSimilarity: number;
  unknownTerms: string[];
  topicTerms: string[];
  unknownShare: number;
  coverage: number;
};

export type Gate = GateSignals & { pass: boolean; reason: string };

export function decideGate(s: GateSignals, p: GateParams = GATE): { pass: boolean; reason: string } {
  if (s.bestSegmentSimilarity < p.minSegmentSimilarity) {
    return { pass: false, reason: `No passage is close enough to the question (best ${s.bestSegmentSimilarity.toFixed(2)}, needs ${p.minSegmentSimilarity}).` };
  }
  if (s.bestSegmentSimilarity < p.strongSegmentSimilarity) {
    if (s.unknownShare >= p.maxUnknownTopicShare && s.unknownTerms.length > 0) {
      return { pass: false, reason: `The recordings you can access never mention: ${s.unknownTerms.join(", ")}.` };
    }
    if (s.coverage < p.minCoverage) {
      return { pass: false, reason: `The best passages cover only ${Math.round(s.coverage * 100)}% of the question's key words.` };
    }
  }
  return { pass: true, reason: "Strong match in the recordings." };
}

export type SearchResult = { hits: Hit[]; gate: Gate; allowedChunks: number };

export function search(idx: LoadedIndex, question: string, qVec: number[], missions: string[], k = 8): SearchResult {
  const allowedSet = new Set(missions);
  const allowed: number[] = [];
  idx.chunks.forEach((c, i) => {
    if (allowedSet.has(c.mission)) allowed.push(i);
  });

  const topicTerms = [...new Set(topicTokens(question, idx.canon))];
  if (allowed.length === 0) {
    return {
      hits: [],
      allowedChunks: 0,
      gate: {
        pass: false,
        bestSegmentSimilarity: 0,
        unknownTerms: topicTerms,
        topicTerms,
        unknownShare: 1,
        coverage: 0,
        reason: "You have no mission access, so there is nothing to search.",
      },
    };
  }

  const qTokens = tokenize(question, idx.canon);
  const bm25 = scoreBm25(idx.bm25, qTokens, allowed);
  const bm25Order = [...bm25.entries()].sort((a, b) => b[1] - a[1]).map(([doc]) => doc);
  const bm25Rank = new Map(bm25Order.map((doc, r) => [doc, r + 1]));

  const semantic = allowed.map((doc) => ({ doc, score: cosine(qVec, idx.chunkVectors[doc]) }));
  semantic.sort((a, b) => b.score - a.score);
  const semanticRank = new Map(semantic.map((s, r) => [s.doc, r + 1]));
  const semanticScore = new Map(semantic.map((s) => [s.doc, s.score]));

  const fused = allowed.map((doc) => {
    const br = bm25Rank.get(doc);
    const score = 1 / (RRF_K + semanticRank.get(doc)!) + (br ? 1 / (RRF_K + br) : 0);
    return { doc, score };
  });
  fused.sort((a, b) => b.score - a.score);

  const qTopic = new Set(topicTerms);
  const hits: Hit[] = fused.slice(0, k).map(({ doc, score }) => {
    const chunk = idx.chunks[doc];
    let anchor = { segmentId: chunk.segmentIds[0], start: chunk.start, score: -1 };
    for (const segId of chunk.segmentIds) {
      const pos = idx.segmentPos.get(segId)!;
      const seg = idx.segments[pos];
      const segTokens = new Set(tokenize(seg.text, idx.canon));
      const overlap = qTopic.size ? [...qTopic].filter((t) => segTokens.has(t)).length / qTopic.size : 0;
      const s = cosine(qVec, idx.segmentVectors[pos]) + 0.05 * overlap;
      if (s > anchor.score) anchor = { segmentId: segId, start: seg.start, score: s };
    }
    return {
      chunk,
      recording: idx.recordingById.get(chunk.recordingId)!,
      bm25: bm25.get(doc) ?? 0,
      bm25Rank: bm25Rank.get(doc) ?? null,
      semantic: semanticScore.get(doc)!,
      semanticRank: semanticRank.get(doc)!,
      fused: score,
      anchor,
    };
  });

  // Which topic words of the question never appear in anything this user can access
  // (transcripts, meeting titles, mission and client names)?
  const known = new Set<string>();
  for (const m of missions) for (const t of idx.missionVocabulary.get(m) ?? []) known.add(t);
  const unknownTerms = topicTerms.filter((t) => !known.has(t) && !allowed.some((doc) => idx.bm25.docTokens[doc].has(t)));
  const best = Math.max(...hits.map((h) => h.anchor.score));
  const unknownShare = topicTerms.length ? unknownTerms.length / topicTerms.length : 0;
  const top3Tokens = new Set<string>();
  for (const h of hits.slice(0, 3)) for (const t of tokenize(h.chunk.text, idx.canon)) top3Tokens.add(t);
  const coverage = topicTerms.length ? topicTerms.filter((t) => top3Tokens.has(t)).length / topicTerms.length : 1;

  const signals: GateSignals = { bestSegmentSimilarity: best, unknownTerms, topicTerms, unknownShare, coverage };
  return { hits, allowedChunks: allowed.length, gate: { ...signals, ...decideGate(signals) } };
}
