# Review, Dataiku project BDD_9 ("BDD Flow (1)" export, 23 Sep 2026)

Verdict: the ingestion half is a solid start (Whisper recipe, segments, corrections loop,
chunking with citations). But the Flow has one structural error (a cycle), two bugs that break
the product's core promise (jump to the right minute; dates for "what is still true"), and the
whole *answering* half, retrieval, LLM, verification, access, evaluation, does not exist yet.
Several datasets look finished but are placeholders filled with hard-coded values.

## 1. Structural problems

| # | Problem | Where | Why it matters |
|---|---------|-------|----------------|
| S1 | **Cycle in the Flow**: `enrich_recording_lineage` reads `pipeline_run_log`, which is written by `seed_governance_and_evaluation`, which reads `transcript_chunks`, which is built from `recordings_enriched` (output of `enrich_recording_lineage`). | recipe JSONs | A Flow must be a DAG. "Build all" / scenarios cannot order it; a fresh rebuild reads stale or empty data. |
| S2 | **Human-edited tables are recipe outputs.** `decision_register`, `user_mission_access`, `eval_questions`, `domain_dictionary`, `speaker_directory` are written by `seed_governance_and_evaluation`. | seed_governance_and_evaluation.py | Every rebuild wipes what people typed in (access rights, the 50 test questions, confirmed decisions). These must be Editable datasets (inputs), never outputs. |
| S3 | **One "god recipe" writes 8 unrelated outputs** (governance, eval, telemetry, dictionary, review queue). | seed_governance_and_evaluation.py | Impossible to rebuild one thing without the others; hides the step-by-step story the demo is graded on ("How it works 25%"). |
| S4 | **Placeholders that look like real data.** `pipeline_run_log` has `status="completed"`, no timings; `recording_manifest` hard-codes `transcription_status="completed"`, empty checksum; `eval_questions` are 7 auto-generated "What is discussed in X?" whose expected answer is the chunk they were generated from (circular, it can only pass). | seed_governance…, enrich_recording_lineage.py | At the Grill, "Evidence 20%" and "Holding up 30%" punish numbers you cannot defend. |
| S5 | **Nothing answers a question.** No Knowledge Bank / embeddings, no LLM call (`challenge-llm` unused), no verification, no refusal, access table never read, no eval runner. `hybrid_search_chunks` is just text concatenation. | whole Flow | Grill 2 asks for "a working chain from the data to a result". |

## 2. Bugs

| # | Bug | Where | Effect |
|---|-----|-------|--------|
| B1 | **Jump link points past the end of the file.** Chunks are built on the meeting-level (absolute) timeline, but `source_jump_reference = f"{file}#t={start_sec}"` pairs the *per-file* audio with the *absolute* second. For seg02+ of a talk, `t` is ≥ ~240 s in a 240 s file. Chunks can also span two part files while carrying only the first file name. | build_transcript_chunks.py:33-47, build_hybrid_search_index.py:18-20 | Breaks the brief's "link opens within 30 s of the right moment" for every part after the first. |
| B2 | **Part offsets are wrong.** `recording_offset_sec` = cumulative *last speech end* (`max(end_sec)` after VAD), not the true file duration, and ignores the 2 s overlap between parts. Your own REPORT says offset = 240 × (seg−1). Error = trailing silence/applause per part (Prager seg02 has 12 s of applause, Smith seg01 a 16 s intro). | enrich_recording_lineage.py:22-24 | Absolute timestamps drift a few seconds per part → wrong citation minute on long meetings. |
| B3 | **Overlap de-duplication was removed.** The old recipe dropped the first 2 s of seg N+1; the new one doesn't. | build_transcript_chunks.py | ~2 s of duplicated text at every part boundary; duplicate hits in retrieval. |
| B4 | **Every part of one talk gets a different date** (30 days apart per *file*, sorted by name), so seg01 and seg02 of the same talk are "different meetings a month apart". | seed_recording_metadata.py:18 | Poisons the "latest decision wins" logic, which orders by date. |
| B5 | **Corrections join on float equality** of `start_sec` across a Snowflake round-trip. | build_transcript_chunks.py:17-22 | Approved corrections silently fail to apply. Use a stable `segment_id`. |
| B6 | **Glossary aliases are appended to *every* chunk of a mission.** | build_hybrid_search_index.py:7-16 | Every health chunk now "contains" *exosome* → keyword search returns the whole mission. Aliases belong in query expansion and in Whisper's `initial_prompt`, not in chunk text. |
| B7 | **Review queue is always empty.** Threshold `avg_logprob < -0.5`, but your REPORT shows worst segment −0.37. It also ignores `no_speech_prob`/`compression_ratio` and known mis-hearings ("coded game"). | seed_governance…:39-41 | The human-check loop the brief promises never triggers. |
| B8 | Transcription skip is by **file name** (a replaced file with the same name is never re-transcribed); segment `date` = today, not meeting date; no glossary `initial_prompt` although the REPORT recommends it; true duration (`info.duration`) and timings are discarded. | transcribe_videos.py | No real telemetry for the cost-per-hour figure the business case needs. |
| B9 | `hybrid_search_chunks.source_url` still typed `double` (stale schema). | dataset schema | Breaks once a URL is filled. |
| B10 | Mission rule by filename keywords; Buolamwini (algorithmic bias) filed under health. | seed_recording_metadata.py | Cosmetic for the demo, but metadata should come from a human-owned catalog. |

## 3. What to keep
- `transcribe_videos` core (faster-whisper, VAD, per-file txt + segments, incremental).
- The corrections → chunks idea (human-in-the-loop on transcripts).
- Chunk-level citations, `chunk_id`, meeting/part lineage.
- The *intent* of decision_register, user_mission_access, eval_questions, domain_dictionary, as editable inputs.

## 4. What to drop
- `speaker_directory` (no diarization; YAGNI for 25 Sep / 29 Sep).
- `recording_manifest` + `pipeline_run_log` as separate fake tables → replaced by one real `transcription_runs` written by the transcription recipe itself.
- `seed_governance_and_evaluation` entirely.

## 5. Also
- Handbook: project must be named **"Team 9"** (currently "BDD") so coaches can find it.
- The TED sample has no meetings, decisions or projects: it can test transcription, retrieval
  and jump-to-minute, but not supersession or access. Add synthetic Synchrone meetings (with audio
  generated by TTS so they go through the exact same Flow), see the rework prompt.
