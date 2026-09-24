# Cobuild prompt, SIMPLE version (Team 9)

4 code recipes + 1 visual recipe, 3 editable tables, 1 small library. Paste Part 0, then one step at a time.

```
Videos ──► transcribe_audio ──► segments ──► build_chunks ──► chunks ──► [Embed] ──► kb_chunks
               ▲                                 ▲               │
        (var whisper_prompt)             recordings_catalog      └──► find_decisions ──► decisions
                                                                                 │
             eval_questions + user_mission_access + kb_chunks + decisions ──► run_evaluation ──► eval_results
                                                                                 │
                                                                        webapp (same python/kw code)
```

---

## PART 0, Context

Rename the project to **"Team 9"**. We are replacing the current Flow with a simpler one.
Delete every recipe and dataset except the `Videos` and `Transcripts` folders and the
`transcribe_videos` recipe (which we will modify). Connections: `managed-snowflake`,
`dataiku-managed-storage`, `challenge-llm`. The LLM quota is limited: never call the LLM once per
chunk when once per meeting works.

Product: an engineer asks a question and gets the answer + the meeting file and second that
proves it + whether it is still valid (if a later meeting replaced a decision, show the new one
as CURRENT and the old one as HISTORY) + "not found" when the recordings don't contain it. Users
only search missions they belong to (simulated login, the team shares one Dataiku account).

Rules: the Flow is a DAG; the 3 editable tables below are inputs only, no recipe writes them; no
hard-coded fake values; jump links always use **file + seconds inside that file**. Check each
Dataiku API against this DSS version before using it; if one does not exist, say so.

Editable datasets (we fill them):
- `recordings_catalog`: file, meeting_id, meeting_title, part_number, part_offset_sec, mission,
  meeting_date (same for all parts of a meeting), participants.
  Pre-fill the 7 WAVs: meeting_id = file stem without `_segNN` / ` (1)`,
  part_offset_sec = 240 × (part_number − 1), one date per talk.
- `user_mission_access`: user_login, mission.
- `eval_questions`: question_id, question, asked_as, category (exact | paraphrase |
  multi_source | superseded | not_in_archive | access), expected_status (answered | not_found),
  expected_file, expected_file_sec, expected_current (text or empty).

Project variables: `whisper_prompt` (glossary: "coded gaze, ultracentrifugation, exosome,
nano-DLD, …"), `llm_id`, `evidence_threshold`.

---

## STEP 1, `transcribe_audio` (modify existing recipe, env Whisper)
Input Videos → outputs `segments` + Transcripts folder (.txt as today).
- Skip a file only if its sha256 is unchanged; replace (not append) its rows when redone.
- `initial_prompt = ${whisper_prompt}`, `vad_filter=True`, language `en`.
- `segments` columns: segment_id (`{file}#{i:05d}`), file, start_sec, end_sec, text,
  avg_logprob, **audio_duration_sec** (Whisper `info.duration`), **wall_time_sec** (per file).
  That's all the telemetry the cost-per-hour figure needs.

## STEP 2, `build_chunks`
Inputs `segments`, `recordings_catalog` → `chunks`.
- meeting_sec = part_offset_sec + start_sec. Drop segments of part N+1 that overlap the end of
  part N (the ~2 s overlap).
- Chunk **inside one file**, on segment boundaries, ~45 s (max 75 s).
- Columns: chunk_id (`{file}:{int(file_start_sec)}`), mission, meeting_id, meeting_title,
  meeting_date, file, file_start_sec, file_end_sec, meeting_sec, text,
  citation (`"<meeting_title>, HH:MM:SS"` in meeting time), jump_ref (`"<file>#t=<int(file_start_sec)>"`).
- Fail the recipe if any file_start_sec ≥ that file's audio_duration_sec.

## STEP 3, Embed recipe (visual) → Knowledge Bank `kb_chunks`
From `chunks`, text column `text`, all other columns as metadata, embedding model from
`challenge-llm`. If no embedding model is available, tell me: fallback is TF-IDF in the library.

## STEP 4, `find_decisions`
Input `chunks` → `decisions`. Two cheap LLM passes, cached in a managed folder `llm_cache`
(key = sha256 of the prompt):
1. **Once per meeting**: send its chunks (with chunk_ids) and ask for the decisions taken:
   `[{chunk_id, topic, statement, quote}]`. Keep an item only if `quote` is literally in that
   chunk's text.
2. **Once per mission**: send all its decisions in date order and ask which later decision
   explicitly **replaces** an earlier one (not merely repeats it): `[{old_id, new_id, quote}]`.
Columns: decision_id, mission, topic, statement, chunk_id, file, file_start_sec,
meeting_date, status (current | superseded), superseded_by, replace_quote.

## STEP 5, library `python/kw/answer.py` + `run_evaluation`
`answer(question, user_login)`:
1. missions = rows of `user_mission_access` for that login (none → not_found).
2. Search `kb_chunks` top 8 **with a metadata filter on mission** (filter before ranking).
   (Optional, 15 lines: also BM25 over `chunks.text` for exact ids/acronyms and merge by rank.)
3. If the best score < `evidence_threshold` → return `not_found` without calling the LLM.
4. For hits holding a superseded decision, add the replacing decision's chunk; label evidence
   CURRENT / HISTORY.
5. One LLM call → JSON `{status, statements:[{text, chunk_ids}], current:[..], history:[..]}`;
   use only evidence, cite every statement, not_found if unanswered.
6. Drop statements citing ids not in the evidence; if none left → not_found.
Return statements with citation + jump_ref, current/history, retrieved hits with scores,
latency_ms.

`run_evaluation` (inputs eval_questions, user_mission_access, kb_chunks, decisions, chunks) →
`eval_results`: per question, hit_at_3 (expected file in top 3 and |sec − expected| ≤ 30),
status_ok, current_ok, access_leak, invented (answered a not_in_archive question), latency_ms,
pass; plus a summary row per category. Targets: exact ≥ 90 %, paraphrase ≥ 80 %, invented = 0,
leaks = 0, latency < 5 s.

## STEP 6 (demo), webapp
Standard webapp using `python/kw`: user switcher · archive (meeting → transcript → click a line
plays the audio at that second) · chat with clickable citations and CURRENT / HISTORY /
NOT FOUND badges · a "how it works" panel showing the retrieved chunks, scores, gate decision
and dropped statements · eval_results by category.
