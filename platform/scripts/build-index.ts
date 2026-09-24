// Builds data/index/index.json from the recording registry and the Whisper transcripts.
//   npm run index            build the index
//   npm run index -- --debug also print every same-mission decision pair with its topic score
import fs from "node:fs";
import path from "node:path";
import { buildChunks } from "../lib/engine/chunking";
import { findDecisionCandidates, mergeNearDuplicates, resolveDecisions, topicMatch } from "../lib/engine/decisions";
import { EMBEDDING_MODEL, embedPassages } from "../lib/engine/embed";
import { getCatalog, readJson } from "../lib/engine/data";
import { paths } from "../lib/engine/paths";
import { makeCanonicalizer } from "../lib/engine/text";
import type { KnowledgeIndex, Recording, Segment } from "../lib/engine/types";

type RegistryEntry = Omit<Recording, "durationSec" | "transcription">;
type TranscriptFile = {
  recording_id: string;
  model: string;
  language: string;
  audio_duration_sec: number;
  wall_time_sec: number;
  realtime_factor: number | null;
  transcribed_at: string;
  segments: Array<{
    id: string;
    start: number;
    end: number;
    text: string;
    avg_logprob: number;
    no_speech_prob: number;
    compression_ratio: number;
  }>;
};
type Correction = { segmentId: string; text: string; reviewer: string; at: string };

const round = (v: number[]) => v.map((x) => Math.round(x * 1e5) / 1e5);

async function main() {
  const started = Date.now();
  const debug = process.argv.includes("--debug");
  const catalog = getCatalog();
  const canon = makeCanonicalizer(catalog.glossary);
  const registry = readJson<RegistryEntry[]>(paths.recordings);
  const corrections = fs.existsSync(paths.corrections) ? readJson<Correction[]>(paths.corrections) : [];
  const correctionById = new Map(corrections.map((c) => [c.segmentId, c]));

  const recordings: Recording[] = [];
  const segments: Segment[] = [];
  for (const entry of registry) {
    const file = path.join(paths.transcripts, `${entry.id}.json`);
    if (!fs.existsSync(file)) {
      console.warn(`skip ${entry.id}: no transcript yet (run pipeline/transcribe.py)`);
      continue;
    }
    const t = readJson<TranscriptFile>(file);
    recordings.push({
      ...entry,
      durationSec: t.audio_duration_sec,
      transcription: {
        model: t.model,
        language: t.language,
        wallTimeSec: t.wall_time_sec,
        realtimeFactor: t.realtime_factor,
        transcribedAt: t.transcribed_at,
      },
    });
    for (const s of t.segments) {
      const fix = correctionById.get(s.id);
      segments.push({
        id: s.id,
        recordingId: entry.id,
        mission: entry.mission,
        start: s.start,
        end: s.end,
        text: fix ? fix.text : s.text,
        avgLogprob: s.avg_logprob,
        noSpeechProb: s.no_speech_prob,
        compressionRatio: s.compression_ratio,
        ...(fix ? { corrected: true } : {}),
      });
    }
  }

  const chunks = buildChunks(segments);
  console.log(`${recordings.length} recordings, ${segments.length} segments, ${chunks.length} chunks`);

  const segmentVectors = await embedPassages(segments.map((s) => s.text));
  const chunkVectors = await embedPassages(chunks.map((c) => c.text));

  const raw = findDecisionCandidates(segments, recordings);
  const merged = mergeNearDuplicates(raw, await embedPassages(raw.map((c) => c.text)));
  const candidates = merged.candidates;
  const decisionVectors = await embedPassages(candidates.map((c) => c.text));
  const decisions = resolveDecisions(candidates, decisionVectors, canon);

  if (debug) {
    for (let j = 0; j < candidates.length; j++) {
      for (let i = 0; i < j; i++) {
        if (candidates[i].mission !== candidates[j].mission || candidates[i].recordingId === candidates[j].recordingId) continue;
        const m = topicMatch(
          { text: candidates[i].text, vector: decisionVectors[i] },
          { text: candidates[j].text, vector: decisionVectors[j] },
          canon,
        );
        console.log(
          `cos ${m.cosine.toFixed(3)} shared [${m.shared.join(",")}]${m.sameTopic ? " SAME" : ""}${candidates[j].change ? " [change]" : ""}  ${candidates[i].id} -> ${candidates[j].id}`,
        );
      }
    }
  }

  const index: KnowledgeIndex = {
    builtAt: new Date().toISOString(),
    embeddingModel: EMBEDDING_MODEL,
    recordings,
    segments,
    segmentVectors: segmentVectors.map(round),
    chunks,
    chunkVectors: chunkVectors.map(round),
    decisions,
    decisionVectors: decisionVectors.map(round),
    stats: {
      recordings: recordings.length,
      audioSeconds: Math.round(recordings.reduce((a, r) => a + r.durationSec, 0)),
      segments: segments.length,
      chunks: chunks.length,
      decisions: decisions.length,
      superseded: decisions.filter((d) => d.status === "superseded").length,
      buildSeconds: Math.round((Date.now() - started) / 100) / 10,
    },
  };
  fs.mkdirSync(path.dirname(paths.index), { recursive: true });
  fs.writeFileSync(paths.index, JSON.stringify(index));

  console.log(`\nDecision register (${decisions.length} decisions, ${index.stats.superseded} replaced):`);
  for (const d of decisions) {
    const tag = d.status === "superseded" ? `REPLACED by ${d.supersededBy}` : d.confirmedBy.length ? `current, confirmed ${d.confirmedBy.length}x` : "current";
    console.log(`  ${d.date} ${d.mission.padEnd(22)} ${tag.padEnd(48)} ${d.text.slice(0, 90)}`);
  }
  console.log(`\nIndex written to ${paths.index} in ${index.stats.buildSeconds} s`);
}

main();
