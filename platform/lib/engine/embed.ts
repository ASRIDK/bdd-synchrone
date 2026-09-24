// Local multilingual embeddings (multilingual-e5-small, quantised, about 120 MB, runs on CPU).
// Nothing leaves the machine. The same model embeds French, English, Portuguese and Spanish into
// one space, so an English question can find a French meeting.
import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { DATA_DIR } from "./paths";

export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const EMBEDDING_DIMS = 384;

env.cacheDir = path.join(DATA_DIR, ".cache", "models");

let extractor: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  extractor ??= pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" }) as Promise<FeatureExtractionPipeline>;
  return extractor;
}

async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const run = await getExtractor();
  const vectors: number[][] = [];
  const batchSize = 32;
  for (let i = 0; i < texts.length; i += batchSize) {
    const output = await run(texts.slice(i, i + batchSize), { pooling: "mean", normalize: true });
    vectors.push(...(output.tolist() as number[][]));
  }
  return vectors;
}

// e5 models expect these prefixes: "query: " for questions, "passage: " for indexed text.
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([`query: ${text}`]);
  return vector;
}

export function embedPassages(texts: string[]): Promise<number[][]> {
  return embed(texts.map((t) => `passage: ${t}`));
}

// Vectors are normalised, so the dot product is the cosine similarity.
export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
