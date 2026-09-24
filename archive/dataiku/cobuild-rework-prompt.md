# Cobuild rework prompt, Team 9 "Knowledge Warranty"

How to use: paste **Part 0 (context)** into Cobuild once, then paste **one phase at a time**.
After each phase, check its "Done when" list before moving on. Phases 1-4 are what Grill 2
(Fri 25 Sep) needs; 5-7 are for the demo video (Tue 29 Sep).

---

## PART 0, Context (paste first, once)

You are rebuilding the Flow of this Dataiku project for Team 9 of the Synchrone × Dataiku ×
Albert School case. First rename the project to **"Team 9"** (project key can stay BDD_9).

**Product.** Synchrone records meetings, trainings and troubleshooting sessions. We build a
"Knowledge Warranty": an engineer asks a question in plain language and in under a minute gets
(1) the answer, (2) the exact meeting file and minute that proves it, (3) whether it is still
valid, if a later meeting changed a decision, the latest one is shown as *current* and the old
one kept as *history*, and (4) an explicit "not found in the recordings" when the archive does
not contain the answer. Users only see and search missions they belong to. The recordings stay
the proof.

**Constraints.**
- Connections: `dataiku-managed-storage` (folders), `managed-snowflake` (datasets),
  `challenge-llm` (LLM Mesh). The LLM quota is limited: cache every LLM call (see Phase 3) and
  never call the LLM in a loop over the whole corpus when a cheaper method works.
- One shared Dataiku login for the whole team, so "user" is a simulated login passed as a
  parameter, checked against `user_mission_access`.
- Code env `Whisper` exists (faster-whisper). Other recipes use the default env; if you need
  `rank_bm25` or `scikit-learn`, add them to a project code env and tell me.
- Verify every Dataiku API you use (`dataiku.Dataset`, `dataiku.Folder`, LLM Mesh
  `project.get_llm(...).new_completion()`, embeddings, Knowledge Bank) against this DSS
  version before writing code; if something I name does not exist, say so and propose the
  closest real equivalent instead of inventing it.

**Architecture rules (non-negotiable).**
1. The Flow is a DAG. No recipe may read a dataset that is downstream of itself.
2. **Human-owned tables are Editable datasets and are only ever inputs**, never recipe outputs:
   `recordings_catalog`, `domain_glossary`, `transcript_corrections`, `user_mission_access`,
   `decision_overrides`, `eval_questions`. No recipe writes to them.
3. One recipe = one job, named with a verb (`transcribe_audio`, `build_chunks`, …). Group the
   Flow into zones: **1 Ingest**, **2 Clean & chunk**, **3 Decisions**, **4 Retrieval**,
   **5 Answer & evaluate**, **6 Demo**.
4. No placeholder data that looks real. If a value is unknown, leave it null. Never hard-code
   `status="completed"`.
5. Every row that can be cited carries: `mission`, `meeting_id`, `meeting_title`,
   `meeting_date`, `file`, `file_start_sec`, `file_end_sec`, `meeting_start_sec`. Jump links
   always use **file + file_start_sec** (seconds inside that audio file), never the
   meeting-level time.
6. Shared logic (retrieval, answering, verification) lives in the **project library**
   (`python/kw/`), imported by recipes and the webapp, so the eval and the demo run the exact
   same code.
7. Delete: `seed_governance_and_evaluation`, `speaker_directory`, `recording_manifest`,
   `pipeline_run_log`, `hybrid_search_chunks`, `recordings`, `recordings_enriched` (replaced
   below). Keep the `Videos` and `Transcripts` folders.

Acknowledge, list the current Flow objects you will delete/keep/replace, and wait for Phase 1.

---

## PHASE 1, Ingest (zone 1)

**Editable dataset `recordings_catalog`** (one row per audio file; humans own it):
`file` (exact file name in Videos), `meeting_id`, `meeting_title`, `part_number` (int, 1-based),
`part_offset_sec` (double: where this file starts in the meeting, for the TED parts it is
`240 × (part_number − 1)`), `mission`, `meeting_date` (YYYY-MM-DD, **same for all parts of one
meeting**), `participants`, `owner`, `language` (`en`/`fr`), `source_kind` (`sample_talk` |
`synthetic_meeting`).
Pre-fill it for the 7 existing WAVs: meeting_id = file stem without `_segNN` and without ` (1)`;
missions: Smith (nanotech) → `mission_health_innovation`, Buolamwini (bias in algorithms) →
`mission_ai_ethics`, Prager (writers) → `mission_lifelong_learning`; one date per talk.

**Editable dataset `domain_glossary`**: `term`, `aliases` (`;`-separated mis-hearings /
variants), `mission` (or `*`). Seed: coded gaze (aliases: coded game), ultracentrifugation
(ultracentrification), exosome, nano-DLD (nano DLD; nanodld), plus any acronyms in the
synthetic meetings.

**Recipe `transcribe_audio`** (Python, env `Whisper`). Inputs: `Videos`, `recordings_catalog`,
`domain_glossary`. Outputs: `Transcripts` folder, `transcript_segments`, `transcription_runs`.
- Incremental by **content hash** (sha256 of the file), not by file name. Re-transcribe when
  the hash changed; otherwise keep prior rows for that file.
- `WhisperModel` size from a project variable `whisper_model` (default `small`; try `medium`
  once and record the difference). `language` from the catalog. `vad_filter=True`.
  `initial_prompt` = the glossary terms for that file's mission (+ `*`), max ~200 tokens.
- `transcript_segments`: `segment_id` (= `{file}#{index:05d}`), `file`, `start_sec`,
  `end_sec`, `text`, `avg_logprob`, `no_speech_prob`, `compression_ratio`.
- `transcription_runs` (real telemetry, one row per file per run): `file`, `sha256`,
  `audio_duration_sec` (from Whisper `info.duration`), `model`, `language`, `started_at`,
  `ended_at`, `wall_time_sec`, `realtime_factor` (= wall / duration), `segment_count`,
  `status` (`ok`/`error`), `error`.
- Keep writing the `[HH:MM:SS - HH:MM:SS] text` .txt per file to `Transcripts`.

**Done when:** Flow zone 1 has no cycle; rebuilding twice does not duplicate segments;
`transcription_runs` shows a real wall time for each of the 7 files; the glossary appears in
the prompt (print it in the log).

---

## PHASE 2, Clean & chunk (zone 2)

**Editable `transcript_corrections`**: `segment_id`, `corrected_text`, `reviewer`,
`reviewed_at`, `status` (`approved` | `rejected` | `pending`).

**Recipe `build_review_queue`** → `transcript_review_queue` (computed, read-only view for
reviewers): flag a segment if `avg_logprob < -0.30` OR `no_speech_prob > 0.5` OR
`compression_ratio > 2.4` OR its text contains a glossary *alias* (a known mis-hearing).
Columns: `segment_id`, `file`, `start_sec`, `text`, the three scores, `reasons` (list),
`suggested_text` (alias replaced by term, when applicable). Exclude segments that already have
an approved correction.

**Recipe `build_chunks`** → `transcript_chunks`. Inputs: `transcript_segments`,
`recordings_catalog`, `transcript_corrections`.
1. Apply approved corrections by **`segment_id`** join.
2. Compute `meeting_start_sec = part_offset_sec + start_sec` (and end).
3. **De-duplicate part overlaps**: for part N+1, drop segments whose `meeting_end_sec` ≤ the
   last kept `meeting_end_sec` of part N (+0.5 s tolerance).
4. Chunk **within one file** (never across part files), following segment boundaries: target
   45 s, hard max 75 s; carry the last segment of the previous chunk as leading context
   (overlap = 1 segment) but store it separately so citations start at the chunk's own first
   segment.
5. Columns: `chunk_id` (stable: `{file}:{int(file_start_sec)}`), `mission`, `meeting_id`,
   `meeting_title`, `meeting_date`, `participants`, `source_kind`, `file`, `file_start_sec`,
   `file_end_sec`, `meeting_start_sec`, `meeting_end_sec`, `segment_ids` (JSON list),
   `context_text` (overlap), `text`, `citation` (e.g. `"<meeting_title>, 00:34:12"` using
   meeting time), `jump_ref` (`"<file>#t=<int(file_start_sec)>"`).

**Done when:** for every chunk, `file_start_sec < audio_duration_sec` of its file (write this
as a check in the recipe and fail loudly if violated); no text duplicated across part
boundaries; an approved correction changes the chunk text on rebuild.

---

## PHASE 3, Decisions: what is still true (zone 3)

This is our differentiator; keep it simple and auditable.

**Project library `python/kw/llm.py`**: one function `complete_json(prompt, schema_hint,
purpose)` that calls `challenge-llm` through LLM Mesh, forces JSON output, retries once on
invalid JSON, and **caches** results in a managed folder `llm_cache` keyed by sha256(model +
prompt). It also appends usage (purpose, prompt/completion tokens if exposed, latency) to a
list the caller can write to `llm_usage`. Discover the LLM id with `project.list_llms()` and
store it in project variable `llm_id`.

**Recipe `extract_claims`** → `claims`. For each chunk of source_kind `synthetic_meeting`
(and TED chunks too, but they will mostly yield facts, not decisions): ask the LLM to return
`[{kind: decision|fact|action, topic: short noun phrase, statement: one sentence,
quote: exact words from the chunk}]`, or `[]`. Reject any item whose `quote` is not a
substring of the chunk text (anti-hallucination check). Columns: `claim_id`, `chunk_id`,
`mission`, `meeting_date`, `meeting_start_sec`, `kind`, `topic`, `statement`, `quote`.

**Recipe `resolve_decisions`** → `decision_register` (computed). Inputs: `claims`,
`decision_overrides`.
1. Only `kind = decision`. Per mission, normalise topics: one LLM call per mission with the
   list of distinct topics → map to canonical `topic_key`.
2. Per (mission, topic_key), order by (meeting_date, meeting_start_sec). For each decision
   and the next later one, ask the LLM: does B **SUPERSEDE** A, **CONFIRM** A, or is it
   **UNRELATED**? Return the label and the quote from B that shows it.
3. `status`: `current` (latest in its chain), `superseded` (a later decision SUPERSEDES it , 
   the brief's rule: *only if a later recording confirms it*; a merely more recent mention
   does not supersede), `confirmed` (still current and re-confirmed later).
4. `decision_overrides` (Editable: `decision_id`, `forced_status`, `superseded_by`,
   `reviewer`, `note`) wins over the model.
Columns: `decision_id`, `mission`, `topic_key`, `statement`, `chunk_id`, `file`,
`file_start_sec`, `meeting_date`, `status`, `superseded_by`, `supersede_quote`, `source`
(`model`/`override`).

**Done when:** on the synthetic meetings, every planted reversal (see the data pack) shows
the old decision as `superseded` pointing at the new one, and no decision is superseded by a
mere repetition.

---

## PHASE 4, Retrieval + answer engine + evaluation (zones 4-5), *Grill 2 minimum*

**Retrieval (`python/kw/retrieve.py`)**
- Semantic: if `challenge-llm` exposes an embedding model, build a **Knowledge Bank**
  `kb_transcripts` from `transcript_chunks` (Embed recipe; text = `context_text + text`;
  metadata = all citation columns). If no embedding model is available, tell me, and use
  TF-IDF (scikit-learn) as the semantic stand-in.
- Keyword: BM25 over `text`, with **query-time** expansion from `domain_glossary` (term ↔
  aliases). Exact tokens (ticket ids, acronyms, version numbers) must match.
- Fuse with reciprocal rank fusion (k=60). **Filter by allowed missions before ranking**,
  never after.
- `search(question, missions, k=8) -> list[hit]` with both scores and the fused rank.

**Answer (`python/kw/answer.py`)**, `answer(question, user_login) -> dict`:
1. `missions = allowed_missions(user_login)` from `user_mission_access` (Editable:
   `user_login`, `mission`, `valid_from`, `valid_to`). Unknown user → no missions → refuse.
2. `hits = search(...)`. **Evidence gate**: if the best hit is below a calibrated threshold
   (store in project variable `evidence_threshold`, tune on the eval set), return
   `status="not_found"` **without calling the LLM**.
3. **Freshness**: for each hit, attach decisions from `decision_register` for that chunk; if a
   decision is `superseded`, also fetch the chunk of the decision that replaced it and add it
   to the evidence, labelled CURRENT vs HISTORY.
4. LLM call (cached) with the numbered evidence. Required JSON: `{status: answered |
   partial | not_found, statements: [{text, chunk_ids: [..]}], current: [{decision_id,
   statement}], history: [{decision_id, statement, superseded_by}]}`. System rules: use only
   the evidence; every statement cites ≥1 chunk_id from the list; if the evidence does not
   answer, return not_found; never merge a HISTORY decision into the answer as if current.
5. **Verify**: drop any statement citing an id not in the evidence; drop statements whose
   content is not supported by the cited chunk (one cheap LLM yes/no check per statement,
   cached); if nothing survives → `not_found`.
6. Return: status, statements with citations (`meeting_title`, `meeting_date`, `citation`,
   `file`, `file_start_sec`, `jump_ref`), current/history, `retrieved` (top hits with scores,
   for the "how it works" panel), `latency_ms`, token usage. Append to `qa_log`.

**Editable `eval_questions`** (~50, written by us, NOT generated from chunks):
`question_id`, `question`, `asked_as` (user_login), `category` (`exact` | `paraphrase` |
`multi_source` | `superseded` | `not_in_archive` | `access` | `asr_noise`),
`expected_status` (`answered`/`not_found`), `expected_refs` (JSON list of
`{file, file_start_sec}`), `expected_current_decision` (text or null), `notes`.
We will upload the rows from our data pack.

**Recipe `run_evaluation`** (inputs `eval_questions` + everything `answer()` needs; project
variable `eval_mode` = `retrieval_only` (no LLM, cheap) or `full`) → `eval_results` (append,
one row per question per `run_id`) and `eval_summary`.
Per question: `hit_at_3` (an expected ref's file is in the top 3 **and** |file_start_sec −
expected| ≤ 30 s), `status_ok`, `every_statement_cited`, `current_ok` (superseded category:
current decision named as current, old one only as history), `access_leak` (any retrieved
or cited chunk from a mission the user cannot see, must be 0), `invented` (not_in_archive
category: answered anything at all), `latency_ms`, `tokens`, `pass`.
`eval_summary` per run and category, against targets from our brief: exact hit@3 ≥ 90 %,
paraphrase ≥ 80 %, invented facts on traps = 0, access leaks = 0, p95 latency < 5 s; plus
LLM tokens and an estimated € cost per question.

**Scenario `rebuild_and_evaluate`**: build zones 1-4, then `run_evaluation` in
`retrieval_only`, then `full` only if a checkbox variable is set.

**Done when:** `eval_summary` exists for one `full` run with real numbers, including the
failures. Do not tune the threshold on the same questions you report without saying so , 
split eval_questions into `tune` / `report` via a column.

---

## PHASE 5, Scale test (zone 5)

**Recipe `build_scale_corpus`**: create distractor chunks ×10 and ×100 (other missions'
chunks with shuffled ids and shifted dates, plus paraphrased copies via cached LLM only if
quota allows, otherwise pure duplicates with perturbed ids) into `transcript_chunks_x10`,
`_x100`. **Recipe `run_scale_eval`**: retrieval-only eval on each size → `scale_results`
(hit@3 per size, p95 search latency, index size). Target: drop ≤ 5 points, search < 5 s.

---

## PHASE 6, Demo webapp (zone 6)

Standard (HTML/JS + Python Flask backend) webapp `knowledge_warranty`, backend imports
`python/kw`:
- **User switcher** (simulated logins from `user_mission_access`), say on screen that it is
  simulated because the team shares one Dataiku login.
- **Archive**: missions the user can see → meetings (title, date, participants, parts) →
  transcript with timestamps; clicking a line plays the audio from `Videos` at that second
  (serve the file via the backend with HTTP range support; `<audio>` + `currentTime`).
- **Ask**: chat box → answer with numbered citations; each citation shows meeting title,
  date, minute and a ▶ that loads the right file and seeks to `file_start_sec`. Badges:
  **CURRENT** / **HISTORY (replaced on <date> by …)** / **NOT FOUND**.
- **How it works** drawer per answer: allowed missions → retrieved chunks with BM25 /
  semantic / fused ranks → evidence gate decision → decisions attached → LLM JSON →
  statements dropped by verification → latency and tokens.
- **Results** tab: `eval_summary` latest run by category vs targets, and `scale_results`.

## PHASE 7, Dashboard
Dashboard "Team 9 - Evidence": eval_summary by category vs targets, failures table (question,
expected, got), transcription_runs (realtime factor, € per audio hour estimate),
llm_usage (€ per question), scale_results chart.
