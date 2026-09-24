import { answerQuestion } from "@/lib/engine/answer";
import { indexExists } from "@/lib/engine/data";
import { sessionUser } from "@/lib/session";

export const runtime = "nodejs";

// POST /api/chat { "question": "..." }
// Streams newline-delimited JSON: first {"type":"sources",...} as soon as the evidence is found
// (only when a model will write the answer), then {"type":"answer","answer":{...}}.
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { question?: unknown; mode?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > 500) {
    return Response.json({ error: "Ask a question between 3 and 500 characters." }, { status: 400 });
  }
  if (!indexExists()) return Response.json({ error: "The archive index is missing. Run: npm run index" }, { status: 503 });
  const mode = body?.mode === "quote" || body?.mode === "llm" ? body.mode : "auto";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const answer = await answerQuestion(question, user.email, mode, (event) => send(event));
        send({ type: "answer", answer });
      } catch (err) {
        send({ type: "error", error: (err as Error).message });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
