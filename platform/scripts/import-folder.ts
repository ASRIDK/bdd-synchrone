// Imports every audio or video file of a folder, through the same path as the Import page.
//   npm run import -- <folder> --mission talks-library --date 2026-09-24 [--by someone@synchrone.fr]
//
// Titles and participants are read from file names like the case's TED files:
//   joy_buolamwini_how_i_m_fighting_bias_in_algorithms_seg01.wav
//   -> title "How I'm fighting bias in algorithms (part 1)", participant "Joy Buolamwini"
// Files already in the archive (same content, any name) are reported and skipped.
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { importUpload, isSupported, whenIdle, listJobs } from "../lib/engine/importer";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

function describe(file: string): { title: string; participants: string[] } {
  const stem = path.basename(file).replace(/(\.[a-z0-9]+)+$/i, "").replace(/\s*\(\d+\)$/, "");
  const part = /_seg0*(\d+)$/i.exec(stem)?.[1];
  const words = stem.replace(/_seg\d+$/i, "").split("_").filter(Boolean);
  if (words.length < 4) return { title: stem.replace(/[_-]+/g, " "), participants: [] };
  const speaker = words.slice(0, 2).map(cap).join(" ");
  const topic = words
    .slice(2)
    .join(" ")
    .replace(/\bi m\b/g, "I'm")
    .replace(/\bi\b/g, "I");
  return { title: `${speaker}: ${cap(topic)}${part ? ` (part ${Number(part)})` : ""}`, participants: [speaker] };
}

async function main() {
  const folder = process.argv[2];
  if (!folder || !fs.existsSync(folder)) {
    console.error("Usage: npm run import -- <folder> --mission <id> --date YYYY-MM-DD");
    process.exit(1);
  }
  const mission = arg("mission", "talks-library");
  const date = arg("date", new Date().toISOString().slice(0, 10));
  const by = arg("by", "marc.delorme@synchrone.fr");

  // Descriptive names first, so if two files hold the same audio, the one kept in the archive is
  // the one whose name says what it is (the other is reported as a duplicate).
  const descriptive = (f: string) => describe(f).participants.length > 0;
  const files = fs
    .readdirSync(folder)
    .filter(isSupported)
    .sort((a, b) => Number(descriptive(b)) - Number(descriptive(a)) || a.localeCompare(b));
  for (const name of files) {
    const { title, participants } = describe(name);
    const stream = Readable.toWeb(fs.createReadStream(path.join(folder, name))) as ReadableStream<Uint8Array>;
    const job = await importUpload(stream, name, { mission, title, date, language: "", participants }, by);
    console.log(`${job.status.padEnd(9)} ${name}  ->  ${job.status === "duplicate" ? job.message : title}`);
  }
  console.log("\nTranscribing and indexing (Whisper runs locally, one file at a time)...");
  await whenIdle();
  for (const j of listJobs().filter((x) => files.includes(x.fileName)).slice(0, files.length)) {
    console.log(`${j.status.padEnd(9)} ${j.title}: ${j.message ?? ""}`);
  }
}

main();
