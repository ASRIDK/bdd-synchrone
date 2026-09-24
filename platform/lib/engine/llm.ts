// Optional answer writer. The platform works without any language model ("quote mode").
// When a provider is configured, it rewrites the retrieved evidence into a short answer, and
// every sentence it writes is then checked against its cited source (see answer.ts).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Settings } from "./settings";

// Statements come before the status so the model reads and cites the evidence before it
// decides whether the question is answered (deciding first made small models refuse too often).
export const LlmAnswerSchema = z.object({
  statements: z.array(
    z.object({
      text: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
  status: z.enum(["answered", "not_found"]),
});
export type LlmAnswer = z.infer<typeof LlmAnswerSchema>;

export type LlmResult = {
  answer: LlmAnswer;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

// USD per million tokens (input, output). Sources in docs/SOURCES.md.
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
  "mistral-small-latest": [0.1, 0.3],
};

function cost(model: string, input: number, output: number): number {
  const [pi, po] = PRICES[model] ?? [0, 0];
  return (input * pi + output * po) / 1e6;
}

export const SYSTEM_PROMPT = `You answer questions for consultants of Synchrone, an IT consulting company, using only excerpts of their recorded meetings.

Rules:
- Use only the numbered evidence. If the evidence does not answer the question, return no statements and status "not_found". If it does, return the statements and status "answered".
- Every statement must list the evidence ids it relies on. A statement without evidence is not allowed.
- Evidence marked CURRENT is the latest decision. Evidence marked HISTORY was replaced later: mention it only as history ("was", "until"), never as the current rule.
- Keep statements short and factual. Answer in the language of the question.`;

export function llmConfigured(s: Settings): boolean {
  if (s.provider === "anthropic") return Boolean(s.anthropicKey);
  if (s.provider === "mistral") return Boolean(s.mistralKey);
  return s.provider === "ollama";
}

export async function writeAnswer(s: Settings, userPrompt: string): Promise<LlmResult> {
  if (s.provider === "anthropic") return anthropicAnswer(s, userPrompt);
  if (s.provider === "mistral") return mistralAnswer(s, userPrompt);
  if (s.provider === "ollama") return ollamaAnswer(s, userPrompt);
  throw new Error("No language model configured");
}

async function anthropicAnswer(s: Settings, userPrompt: string): Promise<LlmResult> {
  const client = new Anthropic({ apiKey: s.anthropicKey });
  const response = await client.beta.messages.parse({
    model: s.anthropicModel,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: betaZodOutputFormat(LlmAnswerSchema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Model returned no usable answer (stop reason: ${response.stop_reason})`);
  }
  const input = response.usage.input_tokens;
  const output = response.usage.output_tokens;
  return {
    answer: response.parsed_output,
    provider: "anthropic",
    model: response.model,
    inputTokens: input,
    outputTokens: output,
    costUsd: cost(s.anthropicModel, input, output),
  };
}

async function mistralAnswer(s: Settings, userPrompt: string): Promise<LlmResult> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${s.mistralKey}` },
    body: JSON.stringify({
      model: s.mistralModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\nReply with JSON: {"status": "answered"|"not_found", "statements": [{"text": string, "evidence": [string]}]}` },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Mistral API error ${res.status}`);
  const body = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };
  const answer = LlmAnswerSchema.parse(JSON.parse(body.choices[0].message.content));
  return {
    answer,
    provider: "mistral",
    model: s.mistralModel,
    inputTokens: body.usage.prompt_tokens,
    outputTokens: body.usage.completion_tokens,
    costUsd: cost(s.mistralModel, body.usage.prompt_tokens, body.usage.completion_tokens),
  };
}

async function ollamaAnswer(s: Settings, userPrompt: string): Promise<LlmResult> {
  const res = await fetch(`${s.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: s.ollamaModel,
      stream: false,
      think: false,
      options: { temperature: 0 },
      format: z.toJSONSchema(LlmAnswerSchema),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const body = (await res.json()) as { message: { content: string }; prompt_eval_count?: number; eval_count?: number };
  return {
    answer: LlmAnswerSchema.parse(JSON.parse(body.message.content)),
    provider: "ollama",
    model: s.ollamaModel,
    inputTokens: body.prompt_eval_count ?? 0,
    outputTokens: body.eval_count ?? 0,
    costUsd: 0,
  };
}
