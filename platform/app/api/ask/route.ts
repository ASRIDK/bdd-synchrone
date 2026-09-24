import { answerQuestion } from "@/lib/engine/answer";
import { indexExists } from "@/lib/engine/data";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

// POST /api/ask  { "question": "..." }  -> Answer (the user comes from the session, never the body)
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { question?: unknown; mode?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (question.length < 3 || question.length > 500) {
    return Response.json({ error: "Ask a question between 3 and 500 characters." }, { status: 400 });
  }
  if (!indexExists()) {
    return Response.json({ error: "The search index is missing. Run: npm run index" }, { status: 503 });
  }
  const mode = body?.mode === "quote" || body?.mode === "llm" ? body.mode : "auto";
  const user = await currentUser();
  const answer = await answerQuestion(question, user.login, mode);
  return Response.json(answer);
}
