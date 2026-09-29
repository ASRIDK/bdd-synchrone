# Slides outline: "Team 9 - Slides.pdf"

The final presentation, 10 slides. Each slide: a title, 3 bullets, and one figure. Figures are in
`docs/diagrams/` and `docs/screenshots/` (taken from the app on 29 September 2026, at 1360 x 900).
Numbers come from the README results table and `data/eval/`; do not round them differently on the
slides.

## 1. Knowledge Warranty: does Synchrone already know this?

- Team 9, Business Deep Dive I, Synchrone x Albert School, September 2026
- Ask Synchrone's own recordings a question, get the answer with the meeting and the minute
- Runs on one laptop: no paid service, no data leaving the machine

**Figure:** `docs/screenshots/dashboard.png` (Thomas Girard's dashboard).

## 2. The problem: the answer is at minute 34 of a file nobody opens

- Meetings, trainings and troubleshooting sessions are recorded, then never watched again
- When a problem comes back, people ask around or solve it a second time
- Decisions change between meetings, so an old recording can be wrong today

**Figure:** none, or one line in large type: "Does Synchrone already know this, where exactly, and
is it still true?"

## 3. What it does, end to end

- Import a meeting: transcribed by Whisper on the laptop, searchable about 12 s later for a
  17 s memo
- Ask in plain words, English or French: the answer, the exact words spoken, the meeting, the second
- One click plays the recording from that second

**Figure:** a screenshot of the answer about the meeting imported live
("transrail-display-cache.m4a", cited at 00:15 of 00:32), taken during the recording.

## 4. How it works: from audio to a checked answer

- Audio to timestamped text (Whisper), cut into passages of 25 to 40 s
- Three indexes: keywords (BM25), meaning (multilingual embeddings), decision register
- Six steps per question: access filter, hybrid search, evidence gate, freshness, answer,
  verification

**Figure:** `docs/diagrams/architecture.png`.

## 5. One answer, six steps, real numbers

- Access filter: 22 of 104 passages removed before searching, for Thomas
- Evidence gate: best sentence 0.840 against a minimum of 0.78, so it may answer
- Verification: each written sentence is matched to its source (0.85) or dropped

**Figure:** `docs/screenshots/trace-case-a.png` ("How this answer was built" for the deployment
question).

## 6. Still true? Decisions that changed, across languages

- Asked in English, found in a French meeting ("le mardi matin, et plus le jeudi")
- Tuesday shown as the current decision, Thursday kept as history, both with their minute
- Tested on all 5 decisions changed later: 5 of 5 in both modes

**Figure:** `docs/screenshots/answer-case-a.png`.

## 7. Saying no: traps, access, duplicates

- "Who is the CTO of TransRail?": not found, because no recording ever mentions a CTO
- Camille (Banque Hexa) asks the TransRail question: not found, 20 of 104 passages removed
  before the search; 0 leaks in 50 questions
- The same audio renamed is refused and the original is named

**Figure:** `docs/screenshots/trace-case-b-trap.png` (gate refused, steps 4 to 6 "not
applicable"); optional second figure `docs/screenshots/import-duplicate.png`.

## 8. Measured quality: 50 questions written before tuning

- Model mode (local Qwen 3.5): 44 of 50; quote mode (no model): 41 of 50
- Right passage in the top 3: 100% for direct and reworded questions; 0 of 20 traps answered with
  the model
- Transcription: word error rate 5% in English, 2% in French

**Figure:** the results table from `README.md` ("Results on our own test set"), or
`docs/screenshots/quality-report-top.png`.

## 9. What does not work yet, shown honestly

- X03: asked about July's certificate rotation, it retells the March incident instead of the
  French July meeting
- 3 false refusals (P08, X02, M04) and 2 answers that cite 1 meeting when 2 are needed (M02, M03)
- Model mode takes 9.1 s at the 95th percentile on a laptop, against a 5 s target

**Figure:** `docs/screenshots/quality-known-failure.png` (expected, recorded, live today).

## 10. What it is worth, and what comes next

- Central case from our reverse brief: 375 users saving 30 minutes a week, about €496k a year,
  against €150k in year one (€110k build, €40k running)
- Break-even at about 114 users saving 30 minutes a week
- Next: the Teams recorder and company sign-in with Synchrone IT, then a pilot on one real mission

**Figure:** a 3-row table of the scenarios (low 150 users, 15 min: about €99k; central 375, 30
min: about €496k; high 600, 45 min: about €1.19M), from `docs/course/reverse-brief.txt`.
