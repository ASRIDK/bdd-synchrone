// Loads the catalog and the prebuilt index from disk, once per process, and reloads the index
// when the file changes (so rebuilding it does not require a restart).
import fs from "node:fs";
import { paths } from "./paths";
import { makeCanonicalizer, tokenize, type Canonicalizer } from "./text";
import { buildBm25, type Bm25Index } from "./bm25";
import type { Catalog, KnowledgeIndex, User } from "./types";

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

let catalogCache: Catalog | null = null;
export function getCatalog(): Catalog {
  catalogCache ??= readJson<Catalog>(paths.catalog);
  return catalogCache;
}

export function isAllowedEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim()) && getCatalog().allowedEmailDomains.includes(domain);
}

function guestFromEmail(email: string): User {
  const local = email.split("@")[0];
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  return { login: email.toLowerCase(), email: email.toLowerCase(), name, role: "Synchrone consultant", missions: [], guest: true };
}

// A user is found by login (demo, eval) or by email (sign-in). A valid Synchrone address that
// is not in the catalog signs in as a guest who sees the open missions only.
export function getUser(loginOrEmail: string): User | undefined {
  const key = loginOrEmail.trim().toLowerCase();
  const known = getCatalog().users.find((u) => u.login === key || u.email.toLowerCase() === key);
  if (known) return known;
  return isAllowedEmail(key) ? guestFromEmail(key) : undefined;
}

export function openMissions(): string[] {
  return getCatalog().missions.filter((m) => m.open).map((m) => m.id);
}

export function allowedMissions(loginOrEmail: string): string[] {
  const user = getUser(loginOrEmail);
  if (!user) return [];
  return [...new Set([...user.missions, ...openMissions()])];
}

export type LoadedIndex = KnowledgeIndex & {
  canon: Canonicalizer;
  missionVocabulary: Map<string, Set<string>>;
  bm25: Bm25Index;
  segmentPos: Map<string, number>;
  chunkPos: Map<string, number>;
  recordingById: Map<string, KnowledgeIndex["recordings"][number]>;
};

let indexCache: { mtimeMs: number; value: LoadedIndex } | null = null;

export function indexExists(): boolean {
  return fs.existsSync(paths.index);
}

export function prepareIndex(raw: KnowledgeIndex, catalog: Catalog): LoadedIndex {
  const canon = makeCanonicalizer(catalog.glossary);
  const missionVocabulary = new Map<string, Set<string>>();
  for (const m of catalog.missions) {
    const words = [m.name, m.client, m.sector, m.practice, m.description];
    for (const r of raw.recordings.filter((rec) => rec.mission === m.id)) words.push(r.title, ...r.participants);
    missionVocabulary.set(m.id, new Set(tokenize(words.join(" "), canon)));
  }
  return {
    ...raw,
    canon,
    missionVocabulary,
    bm25: buildBm25(raw.chunks.map((c) => tokenize(c.text, canon))),
    segmentPos: new Map(raw.segments.map((s, i) => [s.id, i])),
    chunkPos: new Map(raw.chunks.map((c, i) => [c.id, i])),
    recordingById: new Map(raw.recordings.map((r) => [r.id, r])),
  };
}

export function getIndex(): LoadedIndex {
  const { mtimeMs } = fs.statSync(paths.index);
  if (!indexCache || indexCache.mtimeMs !== mtimeMs) {
    indexCache = { mtimeMs, value: prepareIndex(readJson<KnowledgeIndex>(paths.index), getCatalog()) };
  }
  return indexCache.value;
}
