"use client";

import { useEffect, useRef, useState } from "react";
import type { Answer, Statement } from "@/lib/engine/types";
import { AnswerView } from "./AnswerView";
import { MeetingTimeline } from "./MeetingTimeline";

type Turn = {
  id: number;
  question: string;
  sources?: { model: string; statements: Statement[] };
  answer?: Answer;
  error?: string;
};

type ModelStatus = { label: string; provider: string; local: boolean };

export function AssistantChat({
  suggestions,
  durations,
  initialQuestion,
}: {
  suggestions: string[];
  durations: Record<string, number>;
  initialQuestion?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<ModelStatus | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    fetch("/api/model")
      .then((r) => (r.ok ? r.json() : null))
      .then(setModel)
      .catch(() => setModel(null));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const patch = (id: number, p: Partial<Turn>) => setTurns((list) => list.map((t) => (t.id === id ? { ...t, ...p } : t)));

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    const id = Date.now();
    setTurns((list) => [...list, { id, question: q }]);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "sources") patch(id, { sources: { model: event.model, statements: event.statements } });
          else if (event.type === "answer") patch(id, { answer: event.answer });
          else if (event.type === "error") patch(id, { error: event.error });
        }
      }
    } catch (e) {
      patch(id, { error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      void ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-3">
        <p className="text-sm">
          <span className="text-ink-faint">Answering with </span>
          <span className="font-semibold">{model ? model.label : "checking"}</span>
          {model && <span className="text-ink-faint">{model.local ? ", on this machine" : ", external service"}</span>}
        </p>
        <p className="text-sm text-ink-faint">Keyword and meaning search first, then the model writes from the evidence only.</p>
      </div>

      <div className="mt-6 space-y-8" aria-live="polite">
        {turns.length === 0 && (
          <div className="rounded-2xl bg-surface p-6">
            <p className="font-semibold">Try one of these</p>
            <ul className="mt-3 space-y-2">
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

        {turns.map((t) => (
          <div key={t.id}>
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-night px-4 py-3 text-white">{t.question}</p>
            </div>
            {t.error && (
              <p role="alert" className="mt-3 rounded-2xl bg-surface p-4 text-signal">
                {t.error}
              </p>
            )}
            {!t.answer && !t.error && (
              <div className="mt-3 rounded-2xl bg-surface p-5">
                {t.sources ? (
                  <>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <span className="dot-live h-2 w-2 rounded-full bg-signal" />
                      Found in the recordings. {t.sources.model} is writing the answer.
                    </p>
                    <ul className="mt-4 space-y-4">
                      {t.sources.statements.map((s, i) => (
                        <li key={i} className="border-l-[3px] border-line pl-4">
                          <p className="spoken text-ink-soft">&ldquo;{s.text}&rdquo;</p>
                          <p className="mt-1 text-sm text-ink-faint">{s.citations[0].title}</p>
                          <div className="mt-1">
                            <MeetingTimeline recordingId={s.citations[0].recordingId} start={s.citations[0].start} duration={durations[s.citations[0].recordingId] ?? 60} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="dot-live h-2 w-2 rounded-full bg-signal" />
                    Searching the recordings you can access
                  </p>
                )}
              </div>
            )}
            {t.answer && (
              <div className="-mt-5">
                <AnswerView answer={t.answer} durations={durations} />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
        className="sticky bottom-4 mt-8 flex gap-2 rounded-2xl bg-surface p-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)]"
      >
        <label htmlFor="assistant-q" className="sr-only">Your question</label>
        <input
          id="assistant-q"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a mission, a decision, an incident..."
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl px-3 py-3 text-[15px] placeholder:text-ink-faint"
        />
        <button type="submit" disabled={busy || draft.trim().length < 3} className="rounded-xl bg-signal px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-white disabled:opacity-40">
          {busy ? "Working" : "Ask"}
        </button>
      </form>
    </div>
  );
}
