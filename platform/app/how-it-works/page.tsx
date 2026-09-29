import fs from "node:fs";
import path from "node:path";
import { ArchitecturePlayer } from "@/components/ArchitecturePlayer";
import { Page } from "@/components/Page";
import { getCatalog, getIndex } from "@/lib/engine/data";
import type { EvalReport } from "@/lib/engine/evaluate";
import { paths } from "@/lib/engine/paths";
import { currentUser } from "@/lib/session";

function load(file: string): EvalReport | null {
  const p = path.join(path.dirname(paths.evalResults), file);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as EvalReport) : null;
}

export default async function HowItWorksPage() {
  await currentUser();
  const idx = getIndex();
  const quote = load("results.json");
  const model = load("results-llm-ollama.json");
  const asr = quote?.asr;

  return (
    <Page
      title="How it"
      accent="works"
      compact
      intro="From a recording to an answer you can check, in ten steps. Press play, or step through with the arrows. The numbers are this archive's."
    >
      <ArchitecturePlayer
        facts={{
          recordings: idx.stats.recordings,
          audioMinutes: Math.round(idx.stats.audioSeconds / 60),
          segments: idx.stats.segments,
          chunks: idx.stats.chunks,
          decisions: idx.stats.decisions,
          superseded: idx.stats.superseded,
          realtimeFactor: asr?.realtimeFactor ?? null,
          werEnglish: asr?.werEnglish ?? null,
          werFrench: asr?.werFrench ?? null,
          modelPassed: model?.summary.all.passed ?? null,
          total: model?.summary.all.total ?? null,
          glossaryTerms: getCatalog().glossary.length,
        }}
      />
    </Page>
  );
}
