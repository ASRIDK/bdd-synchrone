"use client";

import { useState } from "react";
import type { Answer } from "@/lib/engine/types";
import { AnswerView } from "./AnswerView";

export function AskClient({ suggestions, durations }: { suggestions: string[]; durations: Record<string, number> }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setQuestion(text);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setAnswer(body as Answer);
    } catch (e) {
      setAnswer(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="q" className="sr-only">Your question</label>
        <input
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Why did the station displays go blank after the certificate rotation?"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-[15px] shadow-[0_1px_0_var(--line)] placeholder:text-ink-faint"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="rounded-lg bg-ink px-5 py-3 font-medium text-white disabled:opacity-40"
        >
          {loading ? "Searching" : "Ask"}
        </button>
      </form>

      {!answer && !loading && suggestions.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-ink-faint">Try one of these</p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => ask(s)} className="text-left text-ink-soft underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p role="alert" className="mt-6 rounded-lg border border-line bg-surface p-4 text-ink">{error}</p>}
      <div aria-live="polite">{answer && !loading && <AnswerView answer={answer} durations={durations} />}</div>
    </div>
  );
}
