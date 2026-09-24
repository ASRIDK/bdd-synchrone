// Decision register: finds decisions in transcripts and works out which ones are still current.
//
// Baseline method (no language model, fully explainable):
//   1. A decision is a segment that contains a decision cue ("the decision is", "we go with",
//      "from now on", "à partir de maintenant"...). Adjacent cue segments are merged.
//   2. Two decisions of the same mission are on the same topic when their meaning (multilingual
//      embedding) and their topic words are close enough.
//   3. A later decision replaces an earlier one only if it is on the same topic AND carries a
//      change cue ("instead", "we replace", "from today", "plus le jeudi"). A later mention without
//      a change cue ("we keep five seconds") confirms the earlier decision, it does not replace it.
//      This follows the brief: more recent is not automatically right.
import { cosine } from "./embed";
import { normalize, topicTokens, type Canonicalizer } from "./text";
import type { Decision, Recording, Segment } from "./types";

// "decided" counts only when it records the team's decision ("Decided, ...", "we decided"),
// not in narration ("the organizers decided to take a tour").
const DECIDED = /\b(?:we|i|it is|it's|is|was) decided\b|\bdecided\s*[,.:;]/;

const DECISION_CUES = [
  /\bthe decision is\b/, /\bdecision\b/, DECIDED, /\bwe go with\b/, /\bagreed\b/,
  /\bwe keep\b/, /\blet'?s keep\b/, /\bwe replace\b/, /\bfrom today\b/, /\bfrom now on\b/,
  /\bthe rule is\b/, /\bwe reduce\b/, /\bwe move\b/, /\bmoves to\b/, /\bwe change\b/, /\bwe stay\b/,
  /\bdoes not change\b/, /\bfull stop\b/, /\bgo out on\b/, /\bretention is\b/, /\breplaces\b/,
  /\bdecision\b/, /\bon change\b/, /\ba partir de maintenant\b/, /\bon garde\b/, /\bdesormais\b/,
  /\bpassent le\b/,
];

const PROPOSAL_CUES = [/\bi propose\b/, /\bi suggest\b/, /\bwe could\b/, /\bshould we\b/, /\bje propose\b/];
const STRONG_CUES = [
  /\bthe decision is\b/, /\b(?:we|i|it is|it's|is|was) decided\b|\bdecided\s*[,.:;]/, /\bdecision\b/, /\bagreed\b/, /\bwe go with\b/, /\bfrom today\b/,
  /\bfrom now on\b/, /\bthe rule is\b/, /\ba partir de maintenant\b/,
];

const CHANGE_CUES = [
  /\bchange\b/, /\breplace/, /\binstead\b/, /\bfrom today\b/, /\bfrom now on\b/, /\bmoves? (?:\w+ ){0,3}(?:from|to)\b/,
  /\breduce\b/, /\bincrease\b/, /\bno longer\b/, /\bnot anymore\b/, /\bfrom \w+ (?:seconds|days) to\b/,
  /\ba partir de maintenant\b/, /\bon change\b/, /\bplus le\b/, /\bremplace/, /\bdesormais\b/,
];

const CONFIRM_ONLY = [/\bdoes not change\b/, /\bfor now\b/, /\bwe keep\b/, /\bwe stay\b/, /\bstill\b/];

const NUMBER_WORDS = new Set(
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen twenty thirty forty fifty hundred thousand un deux trois quatre cinq six sept huit neuf dix".split(" "),
);

// Words that signal a decision but say nothing about its topic.
const CUE_WORDS = new Set(
  "keep stay change agreed decided decision instead replace today first rule move reduce increase point last noted".split(" "),
);

// Calibrated on the demo archive (see docs/HOW-IT-WORKS.md): every true replacement scored
// 0.86 or more, and requiring a shared topic word removes the look-alikes.
export const SAME_TOPIC_MIN_COSINE = 0.85;
// A plain repetition ("we keep five seconds") is worded more loosely than a formal change, so
// confirmations accept a slightly lower score, still with a shared topic word.
export const CONFIRM_MIN_COSINE = 0.82;
export const MERGE_WINDOW_SEC = 18;

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function isDecisionText(text: string): boolean {
  const n = normalize(text);
  if (!hasAny(n, DECISION_CUES)) return false;
  // "I suggest we stay on 14" is a proposal, unless the same sentence also records the decision.
  if (hasAny(n, PROPOSAL_CUES) && !hasAny(n, STRONG_CUES)) return false;
  return true;
}

export function isChangeText(text: string): boolean {
  const n = normalize(text);
  if (!hasAny(n, CHANGE_CUES)) return false;
  // "the region does not change" is a confirmation even though it contains "change".
  if (/\bdoes not change\b/.test(n) && !/\binstead\b|\breplace/.test(n)) return false;
  return true;
}

export function isConfirmText(text: string): boolean {
  return hasAny(normalize(text), CONFIRM_ONLY);
}

function topicSet(text: string, canon: Canonicalizer): Set<string> {
  return new Set(
    topicTokens(text, canon).filter((t) => !NUMBER_WORDS.has(t) && !/^\d+$/.test(t) && !CUE_WORDS.has(t)),
  );
}

export function sharedTopicWords(a: string, b: string, canon: Canonicalizer): string[] {
  const sb = topicSet(b, canon);
  return [...topicSet(a, canon)].filter((t) => sb.has(t));
}

export type TopicMatch = { cosine: number; shared: string[]; sameTopic: boolean };

export function topicMatch(
  a: { text: string; vector: number[] },
  b: { text: string; vector: number[] },
  canon: Canonicalizer,
): TopicMatch {
  const cos = cosine(a.vector, b.vector);
  const shared = sharedTopicWords(a.text, b.text, canon);
  return { cosine: cos, shared, sameTopic: cos >= SAME_TOPIC_MIN_COSINE && shared.length > 0 };
}

export type DecisionCandidate = Omit<Decision, "status" | "supersedes" | "confirmedBy" | "supersededBy"> & {
  change: boolean;
  confirm: boolean;
};

// Step 1: find decision segments, merging a cue segment with the next one when it is the
// continuation of the same sentence ("Then we replace the five second timeout." + "From today...").
export function findDecisionCandidates(segments: Segment[], recordings: Recording[]): DecisionCandidate[] {
  const dateOf = new Map(recordings.map((r) => [r.id, r.date]));
  const byRecording = new Map<string, Segment[]>();
  for (const s of segments) {
    const list = byRecording.get(s.recordingId) ?? [];
    list.push(s);
    byRecording.set(s.recordingId, list);
  }
  const out: DecisionCandidate[] = [];
  for (const [recordingId, list] of byRecording) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 0; i < list.length; i++) {
      const seg = list[i];
      if (!isDecisionText(seg.text)) continue;
      let text = seg.text;
      const segmentIds = [seg.id];
      const next = list[i + 1];
      if (next && next.start - seg.end < 1.5 && isDecisionText(next.text)) {
        text = `${seg.text} ${next.text}`;
        segmentIds.push(next.id);
        i++;
      } else if (next && next.start - seg.end < 1.5 && !/[.!?]$/.test(seg.text.trim())) {
        // Whisper cut the sentence: keep the end of it so the decision reads complete.
        text = `${seg.text} ${next.text}`;
        segmentIds.push(next.id);
      }
      out.push({
        id: `D-${seg.id}`,
        mission: seg.mission,
        recordingId,
        date: dateOf.get(recordingId) ?? "",
        segmentId: seg.id,
        segmentIds,
        start: seg.start,
        text,
        method: "rules",
        change: isChangeText(text),
        confirm: isConfirmText(text),
      });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? a.start - b.start : a.date.localeCompare(b.date)));
}

// Merges a proposal and the decision that closes it a few seconds later in the same meeting
// ("I propose to change the timeout to seven seconds" ... "From today, the timeout is seven
// seconds") into one decision, so the register holds one entry per decision taken.
export function mergeNearDuplicates(
  candidates: DecisionCandidate[],
  vectors: number[][],
): { candidates: DecisionCandidate[]; vectors: number[][] } {
  const outC: DecisionCandidate[] = [];
  const outV: number[][] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const prev = outC[outC.length - 1];
    if (
      prev &&
      prev.recordingId === c.recordingId &&
      c.start - prev.start <= MERGE_WINDOW_SEC &&
      cosine(outV[outV.length - 1], vectors[i]) >= SAME_TOPIC_MIN_COSINE
    ) {
      outC[outC.length - 1] = {
        ...prev,
        text: `${prev.text} ${c.text}`,
        segmentIds: [...prev.segmentIds, ...c.segmentIds],
        change: prev.change || c.change,
        confirm: prev.confirm && c.confirm,
      };
      continue;
    }
    outC.push(c);
    outV.push(vectors[i]);
  }
  return { candidates: outC, vectors: outV };
}

// Steps 2 and 3: resolve which decisions are replaced, confirmed or current.
// A change replaces only the single closest earlier decision on the same topic, plus the
// mentions that had confirmed it. Decisions of different missions never interact.
export function resolveDecisions(candidates: DecisionCandidate[], vectors: number[][], canon: Canonicalizer): Decision[] {
  const decisions: Decision[] = candidates.map((c) => ({
    id: c.id,
    mission: c.mission,
    recordingId: c.recordingId,
    date: c.date,
    segmentId: c.segmentId,
    segmentIds: c.segmentIds,
    start: c.start,
    text: c.text,
    method: c.method,
    status: "current",
    supersedes: [],
    confirmedBy: [],
  }));
  const confirmedTarget = new Map<number, number>();

  for (let j = 0; j < candidates.length; j++) {
    const later = candidates[j];
    let best = -1;
    let bestCos = 0;
    for (let i = 0; i < j; i++) {
      const earlier = candidates[i];
      if (earlier.mission !== later.mission || earlier.recordingId === later.recordingId) continue;
      if (decisions[i].status !== "current" || confirmedTarget.has(i)) continue;
      const m = topicMatch({ text: earlier.text, vector: vectors[i] }, { text: later.text, vector: vectors[j] }, canon);
      const eligible = later.change ? m.sameTopic : m.cosine >= CONFIRM_MIN_COSINE && m.shared.length > 0;
      if (eligible && m.cosine > bestCos) {
        best = i;
        bestCos = m.cosine;
      }
    }
    if (best < 0) continue;

    if (later.change) {
      const replaced = [best, ...[...confirmedTarget].filter(([, target]) => target === best).map(([c]) => c)];
      for (const i of replaced) {
        decisions[i].status = "superseded";
        decisions[i].supersededBy = decisions[j].id;
        decisions[j].supersedes.push(decisions[i].id);
      }
    } else {
      decisions[best].confirmedBy.push(decisions[j].id);
      confirmedTarget.set(j, best);
    }
  }
  return decisions;
}
