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
  done: "bg-paper text-ink-soft",
  passed: "bg-valid-bg text-valid",
  refused: "bg-signal/10 text-signal",
  not_applicable: "bg-paper text-ink-soft",
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
      <div>
        {notFound ? (
          <div className="rounded-card bg-surface p-5 sm:p-6">
            <span className="inline-block rounded-full bg-signal/10 px-2.5 py-1 text-[12px] font-semibold text-signal">Refused</span>
            <p className="mt-3 text-[17px] font-semibold text-ink">{answer.headline}</p>
            <p className="mt-1 text-ink-soft">
              Nothing in your missions answers this. Nothing was guessed. If the answer should exist, it may be in a
              mission you do not belong to, or it was never recorded.
            </p>
          </div>
        ) : (
          <>
          <p className="text-[17px] font-semibold text-ink">{answer.headline}</p>
          <ul className="mt-4 space-y-3">
            {answer.statements.map((s, i) => {
              const c = s.citations[0];
              // Quote mode, and decisions added from the register, show the exact words spoken.
              const verbatim = answer.mode === "quote" || c.quote === s.text;
              const tone = s.role === "current" ? "current" : s.role === "history" ? "history" : "neutral";
              return (
                <li key={i} className="rounded-card bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {ROLE_LABEL[s.role] ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                          s.role === "current" ? "bg-valid-bg text-valid" : "bg-history-bg text-history"
                        }`}
                      >
                        {ROLE_LABEL[s.role]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-paper px-2.5 py-1 text-[12px] font-semibold text-ink-soft">Evidence</span>
                    )}
                    <span className="font-mono text-[12px] text-ink-soft">
                      {c.title} · {new Date(c.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {!verbatim && <p className="mt-3 text-[16px] font-semibold">{s.text}</p>}
                  {(verbatim || c.quote) && <p className={`spoken ${verbatim ? "mt-3" : "mt-1.5"} ${s.role === "history" ? "text-ink-soft" : ""}`} style={{ fontSize: s.role === "history" ? 17 : 20 }}>
                    &ldquo;{verbatim ? s.text : c.quote}&rdquo;
                  </p>}
                  <div className="mt-4">
                    <MeetingTimeline recordingId={c.recordingId} start={c.start} duration={durations[c.recordingId] ?? c.start + 60} tone={tone} />
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-ink-faint">
          <span>
            {notFound ? "No answer written: the evidence gate stopped it." : answer.mode === "quote" ? "Quote mode: the answer is made of the exact words spoken." : `Written by ${(answer.usage?.model ?? "a language model").replace(/:latest$/, "")}, every sentence checked against its source.`}{" "}
            <span className="tabular">Answered in {answer.latencyMs < 1000 ? `${answer.latencyMs} ms` : `${(answer.latencyMs / 1000).toFixed(1)} s`}.</span>
          </span>
          <button type="button" onClick={() => setShowTrace((v) => !v)} aria-expanded={showTrace} className="rounded-full bg-surface px-4 py-2 font-semibold text-ink hover:bg-line">
            {showTrace ? "Hide how this answer was built" : "How this answer was built"}
          </button>
        </div>
      </div>

      {showTrace && (
        <ol aria-label="How this answer was built" className="mt-3 space-y-4 rounded-card bg-surface p-5 text-[14px] sm:p-6">
          {(answer.pipeline ?? []).map((p) => (
            <li key={p.n} className={`grid gap-2 sm:grid-cols-[11rem_1fr] sm:gap-4 ${p.n > 1 ? "border-t border-line pt-4" : ""}`}>
              <div className="flex items-start gap-3 sm:block">
                <p className="flex items-center gap-2.5 font-semibold text-ink">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-[12px]">{p.n}</span>
                  {p.name}
                </p>
                <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold sm:ml-[2.375rem] ${STATUS_STYLE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="min-w-0 text-ink-soft">
                <p className={p.status === "not_applicable" ? "italic text-ink-faint" : ""}>{p.summary}</p>
                {p.columns && p.rows && p.rows.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="text-ink-soft">
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
