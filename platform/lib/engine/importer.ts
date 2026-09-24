// Importing a recording into the archive.
//
//   1. The upload is streamed to disk and hashed (sha256) in the same pass.
//   2. Duplicate check: the same file already in the archive is not imported twice, whatever its name.
//   3. WAV and similar files are compressed to AAC for storage (macOS afconvert); video and
//      compressed audio are stored as they are.
//   4. The recording is added to the registry with its mission, title, date and participants.
//   5. A job transcribes it with the local Whisper pipeline, then rebuilds the index.
//      Jobs run one at a time; their status is kept in data/jobs.json and shown in the app.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildIndex, readRegistry, transcriptPath, type RegistryEntry } from "./indexer";
import { DATA_DIR, paths } from "./paths";

export const AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "aac", "flac", "ogg", "opus", "aiff", "aif"];
export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "mkv"];
const COMPRESS = new Set(["wav", "flac", "aiff", "aif"]);
export const MAX_UPLOAD_BYTES = 2 * 1024 ** 3;

export type JobStatus = "queued" | "transcribing" | "indexing" | "ready" | "duplicate" | "failed";

export type Job = {
  id: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  user: string;
  mission: string;
  title: string;
  recordingId?: string;
  duplicateOf?: string;
  status: JobStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportMeta = {
  mission: string;
  title: string;
  date: string;
  language: "" | "en" | "fr" | "es" | "pt";
  participants: string[];
};

const ROOT = path.resolve(DATA_DIR, "..");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const UPLOADS = path.join(DATA_DIR, "uploads");

// ---- Job store ---------------------------------------------------------------------------------

export function listJobs(): Job[] {
  if (!fs.existsSync(JOBS_FILE)) return [];
  return (JSON.parse(fs.readFileSync(JOBS_FILE, "utf8")) as Job[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function saveJob(job: Job) {
  const jobs = listJobs().filter((j) => j.id !== job.id);
  jobs.push({ ...job, updatedAt: new Date().toISOString() });
  fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function update(job: Job, status: JobStatus, message?: string): Job {
  const next = { ...job, status, message };
  saveJob(next);
  return next;
}

// ---- Helpers -----------------------------------------------------------------------------------

export function extensionOf(fileName: string): string {
  return path.extname(fileName).slice(1).toLowerCase();
}

export function isSupported(fileName: string): boolean {
  const ext = extensionOf(fileName);
  return AUDIO_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}


// Which recording already holds this exact content? Checks the original upload hash and the
// hash of the stored file (demo recordings were stored directly).
export function findDuplicate(sha: string): RegistryEntry | undefined {
  for (const entry of readRegistry()) {
    if (entry.sourceSha256 === sha) return entry;
    const t = transcriptPath(entry.id);
    if (fs.existsSync(t) && (JSON.parse(fs.readFileSync(t, "utf8")) as { sha256?: string }).sha256 === sha) return entry;
  }
  return undefined;
}

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, HF_HUB_DISABLE_XET: "1" } });
    let output = "";
    child.stdout.on("data", (d) => (output = (output + d).slice(-4000)));
    child.stderr.on("data", (d) => (output = (output + d).slice(-4000)));
    child.on("error", (e) => resolve({ code: -1, output: e.message }));
    child.on("close", (code) => resolve({ code: code ?? -1, output }));
  });
}

async function compressForStorage(input: string, output: string): Promise<boolean> {
  if (process.platform !== "darwin") return false;
  const { code } = await run("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", input, output], ROOT);
  return code === 0 && fs.existsSync(output);
}

// ---- Import ------------------------------------------------------------------------------------

export async function importUpload(
  body: ReadableStream<Uint8Array>,
  fileName: string,
  meta: ImportMeta,
  user: string,
): Promise<Job> {
  fs.mkdirSync(UPLOADS, { recursive: true });
  const ext = extensionOf(fileName);
  const tmp = path.join(UPLOADS, `${crypto.randomUUID()}.${ext}`);
  const hash = crypto.createHash("sha256");
  let size = 0;

  const out = fs.createWriteStream(tmp);
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) throw new Error("File larger than 2 GB.");
      hash.update(value);
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
  } catch (err) {
    out.destroy();
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));

  const sha = hash.digest("hex");
  const now = new Date().toISOString();
  const job: Job = {
    id: crypto.randomUUID(),
    fileName,
    sizeBytes: size,
    sha256: sha,
    user,
    mission: meta.mission,
    title: meta.title,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };

  const existing = findDuplicate(sha);
  if (existing) {
    fs.rmSync(tmp, { force: true });
    return update({ ...job, duplicateOf: existing.id, recordingId: existing.id }, "duplicate", `Already in the archive as "${existing.title}".`);
  }

  const recordingId = `${slug(meta.title) || "recording"}-${sha.slice(0, 6)}`;
  fs.mkdirSync(paths.audio, { recursive: true });
  let stored = path.join(paths.audio, `${recordingId}.${ext}`);
  if (COMPRESS.has(ext)) {
    const m4a = path.join(paths.audio, `${recordingId}.m4a`);
    if (await compressForStorage(tmp, m4a)) {
      stored = m4a;
      fs.rmSync(tmp, { force: true });
    }
  }
  if (fs.existsSync(tmp)) fs.renameSync(tmp, stored);

  const entry: RegistryEntry = {
    id: recordingId,
    mission: meta.mission,
    title: meta.title,
    date: meta.date,
    language: meta.language,
    participants: meta.participants,
    file: path.basename(stored),
    source: "import",
    importedBy: user,
    importedAt: now,
    sourceSha256: sha,
  };
  const registry = readRegistry();
  registry.push(entry);
  fs.writeFileSync(paths.recordings, JSON.stringify(registry, null, 2) + "\n");

  const queued = update({ ...job, recordingId }, "queued", "Waiting for transcription.");
  enqueue(queued);
  return queued;
}

// ---- Job runner --------------------------------------------------------------------------------

let chain: Promise<void> = Promise.resolve();

function enqueue(job: Job) {
  chain = chain.then(() => processJob(job)).catch(() => {});
}

// Resolves when every queued job has finished (used by the command-line import).
export function whenIdle(): Promise<void> {
  return chain;
}

async function processJob(job: Job) {
  let current = update(job, "transcribing", "Whisper is transcribing the recording on this machine.");
  const python = path.join(ROOT, "pipeline", ".venv", "bin", "python");
  if (!fs.existsSync(python)) {
    update(current, "failed", "The transcription pipeline is not installed (pipeline/.venv). See the README, section Try it.");
    return;
  }
  const started = Date.now();
  const result = await run(python, [path.join(ROOT, "pipeline", "transcribe.py"), "--only", job.recordingId!], ROOT);
  if (result.code !== 0 || !fs.existsSync(transcriptPath(job.recordingId!))) {
    update(current, "failed", `Transcription failed: ${result.output.split("\n").filter(Boolean).slice(-2).join(" ")}`);
    return;
  }
  const seconds = Math.round((Date.now() - started) / 1000);
  current = update(current, "indexing", `Transcribed in ${seconds} s. Updating the search index and the decision register.`);
  try {
    const index = await buildIndex();
    const rec = index.recordings.find((r) => r.id === job.recordingId);
    const segments = index.segments.filter((s) => s.recordingId === job.recordingId).length;
    update(current, "ready", `In the archive: ${segments} sentences, ${Math.round((rec?.durationSec ?? 0) / 60)} min of audio, language ${rec?.transcription.language ?? "unknown"}.`);
  } catch (err) {
    update(current, "failed", `Indexing failed: ${(err as Error).message}`);
  }
}
