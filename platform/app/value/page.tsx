import { Page } from "@/components/Page";
import fs from "node:fs";
import { ValueCalculator } from "@/components/ValueCalculator";
import { paths } from "@/lib/engine/paths";
import type { EvalReport } from "@/lib/engine/evaluate";

export default function ValuePage() {
  const report = fs.existsSync(paths.evalResults) ? (JSON.parse(fs.readFileSync(paths.evalResults, "utf8")) as EvalReport) : null;
  const rtf = report?.asr.realtimeFactor ?? 10;

  return (
    <Page title="Value and" accent="cost" width="max-w-5xl" intro={<>The business case from our reverse brief, as a calculator. One hour of Synchrone is valued at revenue divided by staff and by the French reference of 1,607 hours a year: €139M / 1,500 / 1,607 = €57.7. It is not a salary, only a way to price an hour.</>}>
      <ValueCalculator />

      <section className="mt-12">
        <h2 className="text-xl font-semibold">What it costs to run at scale</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          List prices in US dollars, September 2026, sources in docs/SOURCES.md. The platform itself runs on one server;
          the cost that grows is transcription (once per hour of audio) and, if a model writes the answers, each question.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-ink-faint">
            <tr>
              <th className="py-1.5 pr-3 font-normal">Step</th>
              <th className="py-1.5 pr-3 font-normal">Option</th>
              <th className="py-1.5 pr-3 font-normal">Unit cost</th>
              <th className="py-1.5 font-normal">For 10,000 hours of audio</th>
            </tr>
          </thead>
          <tbody className="tabular">
            <tr className="border-t border-line">
              <td className="py-2 pr-3">Transcription</td>
              <td className="py-2 pr-3">Whisper small on our own laptop (measured: {rtf.toFixed(1)}x real time)</td>
              <td className="py-2 pr-3">hardware only</td>
              <td className="py-2">about {Math.round(10000 / rtf).toLocaleString("en-GB")} machine hours</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3">Whisper large-v3 on one rented GPU (about 12x real time on an RTX 4070 class card)</td>
              <td className="py-2 pr-3">GPU rental</td>
              <td className="py-2">about 830 GPU hours</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3">Mistral Voxtral Mini Transcribe (EU provider)</td>
              <td className="py-2 pr-3">$0.003 per minute</td>
              <td className="py-2">$1,800</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3">OpenAI gpt-4o-mini-transcribe</td>
              <td className="py-2 pr-3">$0.003 per minute</td>
              <td className="py-2">$1,800</td>
            </tr>
            <tr className="border-t border-line">
              <td className="py-2 pr-3">Search index</td>
              <td className="py-2 pr-3">Local multilingual embeddings (multilingual-e5-small)</td>
              <td className="py-2 pr-3">CPU only</td>
              <td className="py-2">minutes of compute</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-ink-faint">
            <tr>
              <th className="py-1.5 pr-3 font-normal">Answer mode</th>
              <th className="py-1.5 pr-3 font-normal">Price per million tokens (in, out)</th>
              <th className="py-1.5 pr-3 font-normal">Per question (about 700 in, 120 out)</th>
              <th className="py-1.5 font-normal">100,000 questions a year</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {[
              ["Quote mode, no model", "none", 0],
              ["Local model (Ollama, Qwen 3.5)", "hardware only", 0],
              ["Mistral Small (EU)", "$0.10, $0.30", (700 * 0.1 + 120 * 0.3) / 1e6],
              ["Claude Haiku 4.5", "$1, $5", (700 * 1 + 120 * 5) / 1e6],
              ["Claude Opus 5 (default when an Anthropic key is set)", "$5, $25", (700 * 5 + 120 * 25) / 1e6],
            ].map(([name, price, per]) => (
              <tr key={String(name)} className="border-t border-line">
                <td className="py-2 pr-3">{name}</td>
                <td className="py-2 pr-3">{price}</td>
                <td className="py-2 pr-3">{Number(per) ? `$${Number(per).toFixed(4)}` : "$0"}</td>
                <td className="py-2">{Number(per) ? `$${Math.round(Number(per) * 100000).toLocaleString("en-GB")}` : "$0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 max-w-2xl text-sm text-ink-faint">
          Even at the most expensive setting, running costs stay well below the €40k a year assumed in the reverse brief,
          which also covers hosting and maintenance. The build cost (€110k, about 10 person-months) dominates the first year.
        </p>
      </section>
    </Page>
  );
}
