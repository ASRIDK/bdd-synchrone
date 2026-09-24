# How it works

This document follows one recording from the moment it is captured to the moment it answers a
question, then explains how we measured the result. Code references point to the files that do
each step.

## 1. From audio to text

**File:** `pipeline/transcribe.py`

Each recording listed in `data/recordings.json` is transcribed with Whisper (the `small` model,
through faster-whisper, on the laptop processor). Three settings matter:

- **Voice activity detection** skips silence, so Whisper does not invent words in quiet parts.
- **A glossary hint.** The client terms in the catalog (SCT Inst, pacs.008, UETR, MQTT, SIEM...)
  are given to Whisper before it starts, which raises the chance it spells them right.
- **The file hash.** A recording is transcribed again only if its content changed, not because
  its name changed.

The output is one JSON file per recording in `data/transcripts/`: timestamped segments (a
sentence or two each), Whisper's confidence for each segment, and the real cost of the run (wall
time, speed relative to the audio length).

Measured: 17 minutes of audio in 98 seconds, 10.5 times real time. Word error rate 5% in English
and 2% in French. The errors are the kind the reverse brief predicted: jargon ("idempotent"
became "id important", "PostgreSQL" became "Post-Gur-SQL"), ticket numbers ("TR-4821" became
"ER4-1821" in the French meeting), and one accent: on the Indian English voice, Whisper turned
"the analyst on duty" into a string of invented names. That is why every answer links back to
the audio, and why the Transcript review add-on exists.

## 2. From text to something searchable

**Files:** `platform/lib/engine/chunking.ts`, `platform/scripts/build-index.ts`

- **Passages.** Consecutive segments are grouped into passages of 25 to 40 seconds, never across
  two recordings. Short passages keep the citation precise.
- **Two indexes.** A keyword index (BM25) is exact on names, tickets and acronyms, where meaning
  search is weak. A meaning index (the multilingual-e5-small embedding model, 120 MB, local) finds
  reworded questions and works across French, English, Portuguese and Spanish.
- **One shared vocabulary.** Questions and transcripts go through the same normalisation: accents
  removed, simple suffixes stripped, "TR4821" and "TR-4821" split the same way, and known
  mishearings from the glossary mapped to the right term ("trust store" and "truststore" match).

Building the index for the demo archive takes about 1.4 seconds.

## 3. The decision register: what is still true

**File:** `platform/lib/engine/decisions.ts`

The brief's hardest promise is to know whether an answer is still valid. A more recent mention is
not automatically the right one, so the register works in three steps, without a language model:

1. **Find decisions.** A segment is a decision when it contains a decision cue, in English or
   French: "the decision is", "we go with", "from now on", "à partir de maintenant", "the rule is".
   Proposals ("I suggest") do not count unless the same sentence records the decision.
   A proposal and the decision that closes it a few seconds later are merged into one entry.
2. **Same topic?** Two decisions of the same mission are on the same topic when their meaning is
   close (embedding similarity of at least 0.85) **and** they share at least one topic word (cue
   words like "keep" or "change" do not count).
3. **Replaced or confirmed?** A later decision on the same topic replaces the earlier one only if
   it carries a change cue ("instead", "we replace", "from today", "plus le jeudi"). Without one,
   it confirms the earlier decision. A change replaces only the single closest earlier decision,
   plus the mentions that had confirmed it.

Result on the demo archive: 14 decisions found, 6 marked as replaced. All five planted changes are
found, with the right target, including a decision taken in English (deployments on Thursday) and
changed in a French meeting (Tuesday). No decision is replaced by mistake.

What we tried first and dropped:

| Attempt | What went wrong | Fix |
|---|---|---|
| A single similarity threshold for "same topic" | "Keep Kafka on MSK" and "reduce Kafka retention" scored 0.88, like true replacements | Replace only the single closest earlier decision (retention scored 0.93) |
| Merge decisions up to 40 s apart | Two separate decisions of the same meeting were merged | 18 s window |
| "instead of" as a decision cue | Problem statements ("the retry creates a new payment instead of...") became decisions | Kept as a change cue only |
| No confirmation rule | "We keep five seconds" (April) stayed current after the timeout changed in May | Confirmations follow the decision they confirm |

These thresholds were calibrated on 13 meetings. On a larger archive they should be checked
again, and a language model should confirm each proposed link (prepared as an add-on).

## 4. Answering a question

**Files:** `platform/lib/engine/answer.ts`, `platform/lib/engine/retrieve.ts`

Six steps, all visible in the "How this answer was built" panel of each answer.

1. **Access.** The user's missions come from the catalog (from the company directory in
   production). Passages of other missions are removed **before** search, so they cannot leak
   through scores, rankings or "not found" explanations. The audio endpoint checks access too.
2. **Hybrid search.** Both indexes rank the allowed passages; the two rankings are merged by
   reciprocal rank fusion. Inside each passage, the single best sentence is picked, so the link
   opens on the sentence, not at the start of the passage.
3. **Evidence gate: saying "I don't know".** The question is refused, without calling any model,
   when no sentence is close enough, or when the question's topic words never appear in anything
   the user can access ("vendor", "CTO", "Azure") and the match is not strong. The thresholds were
   chosen by a grid search on the tune half of the test set only (`npm run calibrate`).
4. **Freshness.** Decisions found at or around the evidence are checked against the register. A
   replaced decision brings its replacement in: the answer shows the latest as current and the old
   one as history.
5. **Answer.** In **quote mode** (default) the answer is made of the exact sentences spoken, so it
   cannot invent anything. In **model mode** a language model (local with Ollama, Mistral in the
   EU, or Claude) writes short statements from the numbered evidence, with the current and replaced
   decisions labelled.
6. **Verification** (model mode). A statement is kept only if it cites evidence the model was given
   and is supported by it (meaning similarity or shared topic words). An answer exists only if at
   least one statement survives. In testing, the local model sometimes wrote correct, cited
   statements and still flagged the question as unanswered, while on trap questions it wrote no
   statement at all; so the decision rests on the verified statements, not on the model's own flag.

Every question is logged (user, question, answer status, citations, time, cost) in
`data/logs/questions.jsonl`, which is what measures real usage after launch.

## 5. Sign-in, import and the choice of model

**Files:** `platform/lib/session.ts`, `platform/proxy.ts`, `platform/lib/engine/importer.ts`,
`platform/lib/engine/llm.ts`

- **Sign-in.** An address ending in `@synchrone.fr` opens a session: a cookie holding the email
  and an expiry (12 hours), signed with a key kept on the server (HMAC-SHA256). Editing the cookie
  to become someone else breaks the signature. Every page and API route checks it; `proxy.ts`
  only sends visitors without a cookie to the login page. A known address gets its missions; an
  unknown Synchrone address signs in as a guest who sees the open missions only (internal talks).
- **Import.** The upload is streamed to disk and hashed in the same pass. If the same content is
  already in the archive, under any name, the import stops and says where it is. Otherwise the
  file is stored (WAV compressed to AAC), registered with its mission, title, date and
  participants, and a job runs Whisper on it then rebuilds the index. The page shows each step
  live. A 13 second meeting was searchable 15 seconds after the upload.
- **Choice of model.** On "Automatic" (the default), each question checks, at most every 20
  seconds and with a 0.7 second timeout, whether Ollama is running with the local model. If it is,
  the local model writes the answer. If not, Claude or Mistral is used if a key is set, otherwise
  the answer is made of exact quotes. The assistant shows which one answers.
- **Sources before the answer.** Search takes milliseconds, the model a few seconds. The chat
  endpoint streams the evidence first, so the user reads the quotes while the model writes.

## 6. How we measured it

**Files:** `data/eval/questions.json`, `platform/lib/engine/evaluate.ts`

50 questions, written before tuning, following section 3 of the reverse brief:

| Type | Count | Passes when |
|---|---|---|
| Asked directly | 10 | Right passage in the top 3, cited within 30 s of the right moment |
| Asked differently | 8 | Same |
| Asked in English, answered in French | 3 | Same |
| Spread over several meetings | 4 | Same, and at least two meetings cited |
| Decision changed later | 5 | The latest decision is labelled current; the old one never shown as current |
| Not in the recordings (traps) | 16 | Says "not found" |
| In a mission the user cannot see (traps) | 4 | Says "not found", and nothing from that mission appears anywhere |

The expected moment of each answer comes from the meeting scripts: every line has an ID and its
exact start time in the audio. The search never reads the script.

To avoid grading our own tuning, the questions are split in two halves. Thresholds are chosen on
the tune half; the report half shows how the system does on questions it was not tuned on. The
results table in the README gives both.

Failures still open, and why:

- **Near-miss traps** (quote mode): "Which Kafka version does TransRail run?" The archive talks
  about Kafka at length, never about its version. Without a model, topic closeness cannot tell
  "talks about the topic" from "answers the question". A model can, which is why model mode
  refuses all 20 traps.
- **Over-cautious refusals**: a few reworded or cross-language questions ("Why should retrieval
  be measured separately from generation?", answered in French) are refused because their key
  words never appear in the English vocabulary of the archive. The gate trades these for zero
  invented answers.
- **Spread over several meetings**: quote mode shows at most three sentences; some questions need
  more meetings than that.
- **Speed in model mode**: 9 seconds at the 95th percentile with a 9.7B model on a laptop. A
  server GPU or a hosted model brings it under the 5 second target.
