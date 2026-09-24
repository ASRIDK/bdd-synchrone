# How it works at scale

The demo holds 17 minutes of audio. Synchrone has thousands of hours. This page describes what
changes between the two, what stays the same, and what it costs. Prices are list prices of
September 2026, sources in [SOURCES.md](SOURCES.md).

## What stays the same

The pipeline and its six answering steps do not change. Every step already works on one recording
at a time (transcription, indexing, decision extraction) or on one question at a time (search,
gate, verification), so nothing needs to be redesigned to grow.

## What changes, component by component

| Component | Demo (today) | At 10,000 hours of audio |
|---|---|---|
| Audio storage | Files in `data/audio` | Object storage in Synchrone's tenant (an S3-compatible bucket), one folder per mission, encrypted |
| Transcription | Whisper small on a laptop, 10.5x real time | Whisper large-v3 on one GPU worker (about 12x real time on an RTX 4070 class card) or a transcription API; a job queue so recordings are processed as they arrive |
| Transcripts and index | JSON files loaded in memory | PostgreSQL with the pgvector extension: one table for segments, one for passages with their vector and keyword data, filtered by mission in the same query |
| Keyword search | BM25 in memory | PostgreSQL full-text search, or OpenSearch if the archive passes a few million passages |
| Decision register | Rules over all decisions of a mission | Same rules, run only on the new recording against its mission's decisions, then confirmed by a model on candidate pairs only |
| Identity and access | "Viewing as" menu | Company sign-in (Microsoft Entra ID); one directory group per mission; the access filter reads group membership |
| Answer writing | Quotes, or an optional model | Same choice, per team |

### Size of the index

10,000 hours at the demo's density (about 12 segments per minute) is about 7 million segments
and 1.5 million passages. With 384-dimension vectors in float32, that is about 2.3 GB of vectors
for passages, well within one PostgreSQL server with an approximate nearest neighbour (HNSW)
index. Search stays fast because every query is first restricted to the missions of the user,
which are a small slice of the archive.

### Transcription time

At 12x real time, one GPU worker transcribes 10,000 hours in about 830 hours, a little over a
month running continuously; four workers do it in about a week. New recordings, a few hours a day,
are processed within minutes of the meeting ending.

## What it costs

### One time: the existing archive (10,000 hours)

| Option | Cost | Data leaves Synchrone? |
|---|---|---|
| Whisper large-v3 on rented GPUs | About 830 GPU hours of rental | No, if the GPUs are in Synchrone's cloud tenant |
| Mistral Voxtral Mini Transcribe (EU) | $0.003 per minute: $1,800 | Yes, to an EU provider |
| OpenAI gpt-4o-mini-transcribe | $0.003 per minute: $1,800 | Yes |
| OpenAI Whisper API / gpt-4o-transcribe | $0.006 per minute: $3,600 | Yes |

### Every question

Measured on our test set: a question sends about 700 tokens of evidence to the model and gets
about 120 tokens back.

| Answer mode | Per question | 100,000 questions a year |
|---|---|---|
| Quote mode (no model) | $0 | $0 |
| Local model (Ollama) | hardware only | hardware only |
| Mistral Small | about $0.0001 | about $10 |
| Claude Haiku 4.5 | about $0.0013 | about $130 |
| Claude Opus 5 | about $0.0065 | about $650 |

Even the most expensive option is small next to the €40k a year of running cost assumed in the
reverse brief, which also covers hosting, storage and maintenance. The cost that matters is the
build (about €110k, 10 person-months).

## What we did not test at scale

The brief promised to check that quality drops by no more than 5 points when the archive grows 10
and 100 times. A first step was measured: from 17 to 44 minutes (2.6 times) the quote mode lost 2
points (42 to 41 of 50) and model mode none (44 of 50); see the README, section Growth check. The
10x and 100x runs are not done: padding the archive with copies would not say much. The plan to run it honestly:

1. Load real Synchrone recordings (or a public meeting corpus) up to 10x and 100x the test archive.
2. Keep the same 50 questions, whose answers are in the original 17 minutes.
3. Re-run `npm run eval` in both modes and compare the "right passage in the top 3" rate and the
   trap refusals. More distractors make the gate harder, so the thresholds may need re-calibrating
   on the tune half.

The access filter should help here: a user's question only competes with their own missions'
recordings, not with the whole archive.
