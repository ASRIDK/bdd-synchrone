"use client";

import { useState } from "react";
import type { Answer, Statement } from "@/lib/engine/types";
import { MeetingTimeline } from "./MeetingTimeline";

const ROLE_LABEL: Record<Statement["role"], string | null> = {
  current: "Current decision",
  history: "Replaced, kept as history",
  evidence: null,
};

export function AnswerView({ answer, durations }: { answer: Answer; durations: Record<string, number> }) {
  const [showTrace, setShowTrace] = useState(false);
  const notFound = answer.status === "not_found";

  return (
    <section className="mt-8">
      <div className={`rounded-xl border bg-surface p-5 sm:p-6 ${notFound ? "border-line" : "border-line"}`}>
        <p className={`text-lg font-medium ${notFound ? "text-ink-soft" : "text-ink"}`}>{answer.headline}</p>

        {notFound ? (
          <p className="mt-2 text-ink-soft">
            Nothing in your missions answers this. Nothing was guessed. If the answer should exist, it may be in a
            mission you do not belong to, or it was never recorded.
          </p>
        ) : (
          <ul className="mt-5 space-y-5">
            {answer.statements.map((s, i) => {
              const c = s.citations[0];
              const tone = s.role === "current" ? "current" : s.role === "history" ? "history" : "neutral";
              return (
                <li
                  key={i}
                  className={`border-l-[3px] pl-4 ${
                    s.role === "current" ? "border-valid" : s.role === "history" ? "border-history" : "border-line"
                  }`}
                >
                  {ROLE_LABEL[s.role] && (
                    <p className={`mb-1 text-sm font-medium ${s.role === "current" ? "text-valid" : "text-history"}`}>
                      {ROLE_LABEL[s.role]}
                    </p>
                  )}
                  <p className={answer.mode === "quote" ? "spoken" : "text-[15px]"}>
                    {answer.mode === "quote" ? `“${s.text}”` : s.text}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    {c.title}, {new Date(c.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <div className="mt-1.5">
                    <MeetingTimeline recordingId={c.recordingId} start={c.start} duration={durations[c.recordingId] ?? c.start + 60} tone={tone} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm text-ink-faint">
          <span>
            {answer.mode === "quote" ? "Quote mode: the answer is made of the exact words spoken." : `Written by ${(answer.usage?.model ?? "a language model").replace(/:latest$/, "")}, every sentence checked against its source.`}{" "}
            <span className="tabular">Answered in {answer.latencyMs < 1000 ? `${answer.latencyMs} ms` : `${(answer.latencyMs / 1000).toFixed(1)} s`}.</span>
          </span>
          <button type="button" onClick={() => setShowTrace((v) => !v)} aria-expanded={showTrace} className="text-ink-soft underline underline-offset-4 hover:text-ink">
            {showTrace ? "Hide how this answer was built" : "How this answer was built"}
          </button>
        </div>
      </div>

      {showTrace && (
        <ol className="mt-4 space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
          {answer.trace.map((t, i) => (
            <li key={i} className="grid grid-cols-[8.5rem_1fr] gap-3">
              <span className="font-medium text-ink">{i + 1}. {t.step}</span>
              <div className="text-ink-soft">
                <p>{t.detail}</p>
                {t.step === "Retrieve" && Array.isArray(t.data) && (
                  <table className="mt-2 w-full text-left text-[13px]">
                    <thead className="text-ink-faint">
                      <tr>
                        <th className="py-1 pr-2 font-normal">Meeting</th>
                        <th className="py-1 pr-2 font-normal">Keyword rank</th>
                        <th className="py-1 pr-2 font-normal">Meaning rank</th>
                        <th className="py-1 font-normal">Best sentence</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {(t.data as Array<{ meeting: string; keywordRank: number | null; semanticRank: number; bestSentenceAt: string; bestSentenceScore: number }>).slice(0, 5).map((r, j) => (
                        <tr key={j} className="border-t border-line">
                          <td className="py-1 pr-2">{r.meeting}</td>
                          <td className="py-1 pr-2">{r.keywordRank ?? "no match"}</td>
                          <td className="py-1 pr-2">{r.semanticRank}</td>
                          <td className="py-1">{r.bestSentenceAt} ({r.bestSentenceScore})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
