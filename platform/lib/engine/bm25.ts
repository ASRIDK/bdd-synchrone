// Okapi BM25 keyword scoring. Exact on names, ticket numbers and acronyms, which is where
// semantic search is weakest.

export type Bm25Index = {
  docTokens: Map<string, number>[];
  docLengths: number[];
  df: Map<string, number>;
  avgLength: number;
};

const K1 = 1.2;
const B = 0.75;

export function buildBm25(docs: string[][]): Bm25Index {
  const df = new Map<string, number>();
  const docTokens = docs.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return tf;
  });
  const docLengths = docs.map((d) => d.length);
  const avgLength = docLengths.reduce((a, b) => a + b, 0) / Math.max(1, docs.length);
  return { docTokens, docLengths, df, avgLength };
}

export function idf(index: Bm25Index, token: string): number {
  const n = index.docTokens.length;
  const df = index.df.get(token) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

// Scores only the documents whose position is in `allowed` (access filter applied first).
export function scoreBm25(index: Bm25Index, query: string[], allowed: number[]): Map<number, number> {
  const scores = new Map<number, number>();
  const unique = [...new Set(query)];
  for (const doc of allowed) {
    const tf = index.docTokens[doc];
    let score = 0;
    for (const t of unique) {
      const f = tf.get(t);
      if (!f) continue;
      const norm = f + K1 * (1 - B + (B * index.docLengths[doc]) / index.avgLength);
      score += idf(index, t) * ((f * (K1 + 1)) / norm);
    }
    if (score > 0) scores.set(doc, score);
  }
  return scores;
}
