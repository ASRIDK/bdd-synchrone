"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Mission = { id: string; name: string };

function titleFromFile(name: string): string {
  return name
    .replace(/(\.[a-z0-9]+)+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function ImportForm({ missions, people, me, accept }: { missions: Mission[]; people: string[]; me?: string; accept: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [mission, setMission] = useState(missions[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [language, setLanguage] = useState("");
  const [participants, setParticipants] = useState<string[]>(me ? [me] : []);
  const [others, setOthers] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setTitle(titleFromFile(f.name));
    setError(null);
    setDone(null);
  }

  function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a file first.");
    const all = [...participants, ...others.split(",").map((s) => s.trim()).filter(Boolean)];
    const q = new URLSearchParams({ name: file.name, mission, title, date, language, participants: all.join(",") });
    // XMLHttpRequest rather than fetch: it reports upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/import?${q.toString()}`);
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { error?: string; status?: string; message?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = { error: "Unexpected answer from the server." };
      }
      if (xhr.status >= 400 || body.error) return setError(body.error ?? `Upload failed (${xhr.status}).`);
      setDone(body.status === "duplicate" ? body.message ?? "Already in the archive." : "Uploaded. Transcription has started; follow it below.");
      setFile(null);
      setTitle("");
      router.refresh();
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("The upload was interrupted. Check the connection and try again.");
    };
    setError(null);
    setDone(null);
    setProgress(0);
    xhr.send(file);
  }

  const field = "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-[15px]";

  return (
    <form onSubmit={upload} className="rounded-3xl bg-surface p-6 sm:p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center ${dragging ? "border-signal bg-paper" : "border-line"}`}
      >
        {file ? (
          <>
            <p className="font-semibold">{file.name}</p>
            <p className="text-sm text-ink-faint">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            <button type="button" onClick={() => input.current?.click()} className="mt-3 text-sm font-semibold underline underline-offset-4">
              Choose another file
            </button>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">Drop a recording here</p>
            <p className="mt-1 text-sm text-ink-faint">Audio or video: wav, mp3, m4a, mp4, mov, webm. Up to 2 GB.</p>
            <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-xl bg-night px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white">
              Choose a file
            </button>
          </>
        )}
        <input ref={input} type="file" accept={accept} className="sr-only" aria-label="Recording file" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={140} placeholder="Weekly point, TransRail" className={field} />
        </label>
        <label className="block text-sm font-medium">
          Mission
          <select value={mission} onChange={(e) => setMission(e.target.value)} className={field}>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Date of the meeting
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={field} />
        </label>
        <label className="block text-sm font-medium">
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={field}>
            <option value="">Detect automatically</option>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Other participants
          <input value={others} onChange={(e) => setOthers(e.target.value)} placeholder="Names, separated by commas" className={field} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">Participants from Synchrone</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => {
              const on = participants.includes(p);
              return (
                <button
                  type="button"
                  key={p}
                  aria-pressed={on}
                  onClick={() => setParticipants((list) => (on ? list.filter((x) => x !== p) : [...list, p]))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-night bg-night text-white" : "border-line text-ink-soft hover:text-ink"}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {progress !== null && (
        <div className="mt-6" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-2 rounded-full bg-signal" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-sm text-ink-soft tabular">Uploading, {progress}%</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-signal">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className={`mt-4 text-sm font-medium ${done.startsWith("Already") ? "text-history" : "text-valid"}`}>
          {done}
        </p>
      )}

      <button
        type="submit"
        disabled={!file || progress !== null}
        className="mt-6 w-full rounded-xl bg-signal px-5 py-3.5 text-[14px] font-bold uppercase tracking-wide text-white disabled:opacity-40 sm:w-auto"
      >
        Import into the archive
      </button>
    </form>
  );
}
