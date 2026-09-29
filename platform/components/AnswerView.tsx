"use client";

import { useState } from "react";
import type { Answer, PipelineStatus, Statement } from "@/lib/engine/types";
import { MeetingTimeline } from "./MeetingTimeline";

const STATUS_LABEL: Record<PipelineStatus, string> = {
  done: "Done",
  passed: "Passed",
  refused: "Refused",
  not_applicable: "Not applicable",
};
const STATUS_STYLE: Record<PipelineStatus, string> = {
  done: "bg-paper text-ink",
  passed: "bg-valid-bg text-valid",
  refused: "bg-history-bg text-history",
  not_applicable: "bg-paper text-ink-faint",
};

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
              // Quote mode, and decisions added from the register, show the exact words spoken.
              const verbatim = answer.mode === "quote" || c.quote === s.text;
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
                  <p className={verbatim ? "spoken" : "text-[15px]"}>{verbatim ? `“${s.text}”` : s.text}</p>
                  {!verbatim && c.quote && (
                    <p className="spoken mt-1.5 text-[15px] text-ink-soft">
                      <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Said in the meeting </span>
                      &ldquo;{c.quote}&rdquo;
                    </p>
                  )}
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
        <ol aria-label="How this answer was built" className="mt-4 space-y-4 rounded-xl border border-line bg-surface p-5 text-[14px] sm:p-6">
          {(answer.pipeline ?? []).map((p) => (
            <li key={p.n} className={`grid gap-2 sm:grid-cols-[11rem_1fr] sm:gap-4 ${p.n > 1 ? "border-t border-line pt-4" : ""}`}>
              <div>
                <p className="font-bold text-ink">
                  {p.n}. {p.name}
                </p>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="min-w-0 text-ink-soft">
                <p className={p.status === "not_applicable" ? "italic text-ink-faint" : ""}>{p.summary}</p>
                {p.columns && p.rows && p.rows.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="text-ink-faint">
                        <tr>
                          {p.columns.map((c) => (
                            <th key={c} className="py-1 pr-3 font-medium">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="tabular">
                        {p.rows.map((r, j) => (
                          <tr key={j} className="border-t border-line align-top">
                            {r.map((cell, k) => (
                              <td key={k} className={`py-1.5 pr-3 ${cell.startsWith("dropped") || cell === "failed" ? "text-signal font-semibold" : cell === "kept" || cell === "passed" ? "text-valid" : "text-ink"}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
