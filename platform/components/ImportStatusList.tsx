"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Job, JobStatus } from "@/lib/engine/importer";

const STEPS: JobStatus[] = ["queued", "transcribing", "indexing", "ready"];
const LABEL: Record<JobStatus, string> = {
  queued: "Waiting",
  transcribing: "Transcribing",
  indexing: "Indexing",
  ready: "In the archive",
  duplicate: "Already in the archive",
  failed: "Failed",
};

function Steps({ status }: { status: JobStatus }) {
  const at = STEPS.indexOf(status);
  if (at < 0) return null;
  return (
    <ol className="mt-3 flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2 text-[12px]">
          <span
            className={`h-2 w-2 rounded-full ${i < at || status === "ready" ? "bg-valid" : i === at ? "dot-live bg-signal" : "bg-line"}`}
          />
          <span className={i <= at ? "text-ink" : "text-ink-faint"}>{LABEL[s]}</span>
          {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

// Import jobs with their live status. Refreshes every two seconds while one is still running.
// Parents give it a key built from the jobs, so a new server list remounts it.
export function ImportStatusList({ initial, scope }: { initial: Job[]; scope: "dashboard" | "import" }) {
  const [jobs, setJobs] = useState(initial);
  const running = jobs.some((j) => ["queued", "transcribing", "indexing"].includes(j.status));

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const res = await fetch("/api/import");
      if (!res.ok) return;
      const mineOnly = (await res.json()) as Job[];
      setJobs((prev) => {
        const byId = new Map(mineOnly.map((j) => [j.id, j]));
        return prev.map((j) => byId.get(j.id) ?? j);
      });
    }, 2000);
    return () => clearInterval(t);
  }, [running]);

  if (jobs.length === 0) {
    return (
      <p className="mt-4 rounded-2xl bg-surface p-5 text-ink-soft">
        Nothing imported yet{scope === "dashboard" ? " in your missions" : ""}.
      </p>
    );
  }
  return (
    <ul className="mt-4 grid gap-3">
      {jobs.map((j) => (
        <li key={j.id} className="rounded-2xl bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{j.title}</p>
            <p
              className={`text-sm font-semibold ${
                j.status === "ready" ? "text-valid" : j.status === "failed" ? "text-signal" : j.status === "duplicate" ? "text-history" : "text-ink-soft"
              }`}
            >
              {LABEL[j.status]}
            </p>
          </div>
          <p className="text-sm text-ink-faint">
            {j.fileName}, {(j.sizeBytes / 1024 / 1024).toFixed(1)} MB, added {new Date(j.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <Steps status={j.status} />
          {j.message && <p className="mt-2 text-sm text-ink-soft">{j.message}</p>}
          {(j.status === "ready" || j.status === "duplicate") && j.recordingId && (
            <Link href={`/library/${j.recordingId}`} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">
              Open the recording
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
