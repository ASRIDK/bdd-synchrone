// Local settings: which language model (if any) writes the answers.
// Stored in data/settings.local.json with owner-only permissions and never committed.
// API keys are never sent back to the browser; the UI only sees whether a key is set.
import fs from "node:fs";
import path from "node:path";
import { paths } from "./paths";

// "auto" uses the best model available right now: the local model if Ollama is running,
// otherwise Claude or Mistral if a key is set, otherwise exact quotes (no model).
export type Provider = "auto" | "none" | "anthropic" | "mistral" | "ollama";

export type Settings = {
  provider: Provider;
  anthropicModel: string;
  anthropicKey?: string;
  mistralModel: string;
  mistralKey?: string;
  ollamaModel: string;
  ollamaUrl: string;
  features: Record<string, boolean>;
};

export const DEFAULT_SETTINGS: Settings = {
  provider: "auto",
  anthropicModel: "claude-opus-5",
  mistralModel: "mistral-small-latest",
  ollamaModel: "qwen3.5:latest",
  ollamaUrl: "http://localhost:11434",
  features: {},
};

export function readSettings(): Settings {
  let stored: Partial<Settings> = {};
  if (fs.existsSync(paths.settings)) {
    stored = JSON.parse(fs.readFileSync(paths.settings, "utf8")) as Partial<Settings>;
  }
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    anthropicKey: stored.anthropicKey || process.env.ANTHROPIC_API_KEY || undefined,
    mistralKey: stored.mistralKey || process.env.MISTRAL_API_KEY || undefined,
    features: { ...DEFAULT_SETTINGS.features, ...(stored.features ?? {}) },
  };
}

export function writeSettings(update: Partial<Settings>): Settings {
  const current = fs.existsSync(paths.settings)
    ? (JSON.parse(fs.readFileSync(paths.settings, "utf8")) as Partial<Settings>)
    : {};
  const next = { ...current, ...update, features: { ...(current.features ?? {}), ...(update.features ?? {}) } };
  // An empty key field in the form means "keep the stored key".
  if (!update.anthropicKey) next.anthropicKey = current.anthropicKey;
  if (!update.mistralKey) next.mistralKey = current.mistralKey;
  fs.mkdirSync(path.dirname(paths.settings), { recursive: true });
  fs.writeFileSync(paths.settings, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.chmodSync(paths.settings, 0o600);
  return readSettings();
}

export function publicSettings(s: Settings) {
  const { anthropicKey, mistralKey, ...rest } = s;
  return { ...rest, anthropicKeySet: Boolean(anthropicKey), mistralKeySet: Boolean(mistralKey) };
}
