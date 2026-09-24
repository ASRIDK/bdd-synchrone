import path from "node:path";

// The platform lives in <root>/platform and reads data from <root>/data.
// KW_DATA_DIR overrides it (used by tests and by a production deployment).
export const DATA_DIR = process.env.KW_DATA_DIR ?? path.resolve(process.cwd(), "..", "data");

export const paths = {
  catalog: path.join(DATA_DIR, "meetings", "catalog.json"),
  recordings: path.join(DATA_DIR, "recordings.json"),
  transcripts: path.join(DATA_DIR, "transcripts"),
  audio: path.join(DATA_DIR, "audio"),
  index: path.join(DATA_DIR, "index", "index.json"),
  groundTruth: path.join(DATA_DIR, "meetings", "ground_truth.json"),
  meetingsScript: path.join(DATA_DIR, "meetings", "meetings.json"),
  evalQuestions: path.join(DATA_DIR, "eval", "questions.json"),
  evalResults: path.join(DATA_DIR, "eval", "results.json"),
  settings: path.join(DATA_DIR, "settings.local.json"),
  corrections: path.join(DATA_DIR, "corrections.json"),
  qaLog: path.join(DATA_DIR, "logs", "questions.jsonl"),
};
