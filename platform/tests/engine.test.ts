// Unit tests for the parts of the engine that do not need the embedding model.
// Run: npm test
import { describe, expect, it } from "vitest";
import { buildBm25, scoreBm25 } from "../lib/engine/bm25";
import { buildChunks, MAX_SEC } from "../lib/engine/chunking";
import { isChangeText, isDecisionText, resolveDecisions, type DecisionCandidate } from "../lib/engine/decisions";
import { decideGate, GATE } from "../lib/engine/retrieve";
import { formatTime, makeCanonicalizer, tokenize } from "../lib/engine/text";
import type { Segment } from "../lib/engine/types";

const canon = makeCanonicalizer([
  { term: "PostgreSQL", aliases: ["Postgres"], misheard: ["Post-Gur-SQL"] },
  { term: "truststore", aliases: ["trust store"] },
]);

describe("text", () => {
  it("maps aliases and mishearings to the glossary term", () => {
    const [postgres] = tokenize("PostgreSQL", canon);
    const [truststore] = tokenize("truststore", canon);
    expect(tokenize("we move to Post-Gur-SQL 16", canon)).toContain(postgres);
    expect(tokenize("the bridge trust store", canon)).toContain(truststore);
  });
  it("splits ticket numbers the same way whatever Whisper wrote", () => {
    expect(tokenize("TR4821")).toEqual(tokenize("TR-4821"));
  });
  it("strips accents and stems simple suffixes", () => {
    expect(tokenize("évaluation")).toEqual(tokenize("evaluation"));
    expect(tokenize("caused")).toEqual(tokenize("cause"));
  });
  it("formats times", () => {
    expect(formatTime(65.4)).toBe("01:05");
    expect(formatTime(3725)).toBe("1:02:05");
  });
});

describe("bm25", () => {
  it("ranks the document with the rare exact term first and respects the access filter", () => {
    const docs = [["ticket", "hex", "2291", "retry"], ["kafka", "retention"], ["ticket", "tr", "4821"]].map((d) => d);
    const index = buildBm25(docs);
    const all = scoreBm25(index, ["hex", "2291"], [0, 1, 2]);
    expect([...all.entries()].sort((a, b) => b[1] - a[1])[0][0]).toBe(0);
    const filtered = scoreBm25(index, ["hex", "2291"], [1, 2]);
    expect(filtered.has(0)).toBe(false);
  });
});

describe("chunking", () => {
  const seg = (i: number, start: number, end: number): Segment => ({
    id: `r#${i}`, recordingId: "r", mission: "m", start, end, text: `s${i}`, avgLogprob: 0, noSpeechProb: 0, compressionRatio: 1,
  });
  it("never builds a chunk longer than the maximum and keeps segment order", () => {
    const segments = Array.from({ length: 30 }, (_, i) => seg(i, i * 6, i * 6 + 5.5));
    const chunks = buildChunks(segments);
    for (const c of chunks) expect(c.end - c.start).toBeLessThanOrEqual(MAX_SEC);
    expect(chunks.flatMap((c) => c.segmentIds)).toEqual(segments.map((s) => s.id));
  });
});

describe("decisions", () => {
  it("recognises decisions and changes in English and French", () => {
    expect(isDecisionText("So the decision is: the timeout is five seconds.")).toBe(true);
    expect(isDecisionText("I suggest we stay on 14.")).toBe(false);
    expect(isChangeText("À partir de maintenant, les mises en production passent le mardi, et plus le jeudi.")).toBe(true);
    expect(isChangeText("To be clear, the region does not change.")).toBe(false);
  });

  const cand = (id: string, recordingId: string, date: string, text: string, change: boolean): DecisionCandidate => ({
    id, mission: "m", recordingId, date, segmentId: id, segmentIds: [id], start: 0, text, method: "rules", change, confirm: !change,
  });
  // Hand-made vectors: a and b are on the same topic, c is another topic.
  const same = [1, 0, 0];
  const other = [0, 1, 0];

  it("replaces an earlier decision only with a later change on the same topic", () => {
    const list = [
      cand("a", "r1", "2026-01-01", "The gateway timeout is five seconds.", false),
      cand("c", "r1", "2026-01-01", "We keep Kafka on MSK.", false),
      cand("b", "r2", "2026-02-01", "We change the gateway timeout to seven seconds.", true),
    ];
    const out = resolveDecisions(list, [same, other, same], canon);
    expect(out.find((d) => d.id === "a")?.status).toBe("superseded");
    expect(out.find((d) => d.id === "a")?.supersededBy).toBe("b");
    expect(out.find((d) => d.id === "c")?.status).toBe("current");
  });

  it("treats a later repetition as a confirmation, not a replacement", () => {
    const list = [
      cand("a", "r1", "2026-01-01", "The gateway timeout is five seconds.", false),
      cand("b", "r2", "2026-02-01", "For now we keep the gateway timeout at five seconds.", false),
    ];
    const out = resolveDecisions(list, [same, same], canon);
    expect(out[0].status).toBe("current");
    expect(out[0].confirmedBy).toEqual(["b"]);
  });
});

describe("evidence gate", () => {
  const base = { unknownTerms: [], topicTerms: ["kafka"], unknownShare: 0, coverage: 1 };
  it("refuses when no passage is close enough", () => {
    expect(decideGate({ ...base, bestSegmentSimilarity: GATE.minSegmentSimilarity - 0.01 }).pass).toBe(false);
  });
  it("refuses when the question's topic words never appear in the accessible recordings", () => {
    const s = { ...base, bestSegmentSimilarity: GATE.strongSegmentSimilarity - 0.01, unknownTerms: ["vendor"], topicTerms: ["vendor", "fraud"], unknownShare: 0.5 };
    expect(decideGate(s).pass).toBe(false);
  });
  it("answers on a strong match", () => {
    expect(decideGate({ ...base, bestSegmentSimilarity: GATE.strongSegmentSimilarity + 0.02 }).pass).toBe(true);
  });
});
