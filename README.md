# BDD Synchrone: Knowledge Warranty

A platform that makes Synchrone's own recordings usable again. An engineer asks a question in
plain words and gets, in a few seconds:

1. **the answer**, with the meeting and the minute that prove it (click to hear it);
2. **whether it is still valid**: if a later meeting changed a decision, the new one is shown as
   current and the old one is kept as history;
3. **an honest "not found"** when the recordings do not contain the answer;
4. **only what they are allowed to see**: search is limited to the missions they belong to.

Built for the Business Deep Dive I case (Synchrone x Dataiku x Albert School, Team 9, September
2026). Everything runs on one laptop, with no paid service and no data leaving the machine. A
language model can be plugged in, but is not needed.

## Results on our own test set

The 50 test questions from our reverse brief were written before any tuning. Thresholds were
tuned on half of them ("tune"); the other half ("report") was never used to choose anything.

| Target from the reverse brief | Quote mode (no model) | Model mode (local Qwen 3.5, 9.7B) |
|---|---|---|
| Questions passed, all 50 | 42 / 50 | 44 / 50 |
| Questions passed, report half only | 19 / 26 | 21 / 26 |
| Right passage in the top 3, direct questions (target 90%) | 100% | 100% |
| Right passage in the top 3, reworded questions (target 80%) | 100% | 100% |
| Decision changed later, latest shown as current (5 cases) | 5 / 5 | 5 / 5 |
| Trap questions answered instead of refused (target 0 of 20) | 3 | 0 |
| Content shown from a mission the user cannot see (target 0) | 0 | 0 |
| Time to answer, 95th percentile (target under 5 s) | under 20 ms | 9.3 s (laptop) |

Transcription, measured against the meeting scripts: 17 minutes of audio transcribed on a laptop
processor at 10.5 times real time, word error rate 5% in English and 2% in French, 29 of 36
client terms heard correctly. Every failure is listed, with its reason, on the Quality report
page and in `data/eval/results.json`.

What the numbers say, plainly:

- **Finding the right minute is solved** on this archive, in English and French, with Whisper's
  mistakes in it.
- **Knowing what is still true works** on all five decisions that were changed later, including
  one decided in English and changed in a French meeting.
- **Saying "I don't know" is the hard part.** Without a model, the system refuses 17 of the 20
  trap questions; the 3 it answers are near misses (the archive talks about Kafka, but never about
  the Kafka *version*). It still does not invent anything: in quote mode every sentence shown is
  a verbatim quote. With a model, all 20 traps are refused, at the cost of speed on a laptop.

## Try it

Requirements: macOS (for the demo voices), Python 3.11+, Node 24.

```bash
# 1. Audio to text (only needed if you change the meetings or add audio)
python3 -m venv pipeline/.venv && pipeline/.venv/bin/pip install faster-whisper==1.2.1
python3 pipeline/make_demo_audio.py              # scripted meetings -> real audio files
pipeline/.venv/bin/python pipeline/transcribe.py # audio -> timestamped transcripts (Whisper, local)

# 2. The platform
cd platform
npm install
npm run index        # transcripts -> search index and decision register (about 2 s)
npm run dev          # http://localhost:3000
```

Everything the platform needs is already in `data/`, so after `npm install` you can go straight
to `npm run dev`. Other commands, from `platform/`:

| Command | What it does |
|---|---|
| `npm run ask -- thomas.girard "Which day do we deploy?"` | Ask from the terminal, with the full trace |
| `npm run eval` | Run the 50 questions and write `data/eval/results.json` |
| `npm run calibrate` | Re-tune the "not found" thresholds on the tune half only |
| `npm test` | Unit tests of the engine |

Use the "Viewing as" menu at the top to switch between the demo users and see the access rules
at work. To let a model write the answers, open Settings and pick Ollama (local), Mistral (EU)
or Claude. Keys stay in `data/settings.local.json` on your machine.

## How it works

```
 recordings ──> Whisper (local) ──> timestamped segments ──> passages of 25 to 40 s
                                                   │
                     ┌─────────────────────────────┼──────────────────────────────┐
                     v                             v                              v
          keyword index (BM25)          meaning index (multilingual       decision register
          exact on tickets, acronyms    embeddings, FR/EN/PT/ES)          (what replaced what)

 question ──> 1 access filter ──> 2 hybrid search ──> 3 evidence gate ──> 4 freshness check
          ──> 5 answer (quotes, or a model) ──> 6 verification ──> answer with minute, or "not found"
```

Each step is explained in [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md), with the reasons behind
the choices and what we tried that did not work. Every answer in the app also has a "How this
answer was built" panel that shows these six steps for that question.

## What is in this folder

```
BDD Synchrone/
├── README.md                  this file
├── docs/
│   ├── HOW-IT-WORKS.md        the pipeline step by step, choices, what failed
│   ├── SCALE.md               how it holds at thousands of hours, and what it costs
│   ├── ROADMAP.md             add-ons prepared for a soft launch, and what each one needs
│   ├── SOURCES.md             every figure and price, with its source
│   ├── DEMO-SCRIPT.md         a 4 minute walkthrough for the demo video
│   └── course/                the brief, the handbook, Synchrone's 2024 CSR report (text)
├── data/                      everything the platform reads (see data/README.md)
├── pipeline/                  audio to text (Python, faster-whisper)
├── platform/                  the web platform and the engine (Next.js, TypeScript)
│   ├── lib/engine/            search, decisions, answers, verification, evaluation
│   ├── app/                   pages and API
│   └── scripts/               index, ask, eval, calibrate
└── archive/dataiku/           the earlier Dataiku version, kept for reference
```

## Made for Synchrone

Synchrone is a French IT consulting company (ESN): 139 M€ revenue in 2024, about 1,500 people,
120 large clients in banking and finance, transport, telecom, services and energy, ISO 27001
certified, with sites across France plus Portugal and Spain. Its 2024 CSR report states the
ambition to move "from an ESN to a high value consulting firm, with AI and Data at the heart of
our strategy" (our translation), and one of its four values is to share knowledge and expertise. The platform
follows from that:

- **Consultants work on client missions**, so the archive is organised by mission and access
  follows mission membership. A consultant on Banque Hexa never sees Nova Télécom's incident
  playbook, and the search does not even score it.
- **Security is sold to clients (ISO 27001)**, so the default setup keeps audio, transcripts and
  search on Synchrone's own machines. Transcription and search use open models that run locally.
  Where a model is used, an EU provider (Mistral) is offered next to Claude.
- **Teams work in French and English, with sites in Portugal and Spain**, so the search model is
  multilingual: an English question finds a French meeting (tested).
- **Knowledge leaves with people**: the "Who knows what" add-on flags recorded knowledge held by
  someone about to leave, so a handover can be recorded in time.

The demo missions (a SEPA Instant migration for a bank, a cloud migration for a rail operator, a
security operations centre for a telecom, internal Data & AI talks) are fictional but follow
Synchrone's real practices: Finance Consulting, InfraCloud, Cybersecurity, Data & AI.

## About the demo data

The sample talks provided with the case (TED talks) have no meetings, decisions or missions, so
they cannot test half of what the brief promises. We wrote 13 meetings that can: decisions changed
later (one across languages), a troubleshooting story with its ticket, a restricted mission, an
expert about to leave, French meetings and six English accents. Each line was spoken by a macOS
voice and recorded as real audio, then transcribed by Whisper like any recording. The script is
used only to score the answers; the search never reads it. Details in [data/README.md](data/README.md).

## Limits we know about

- The archive is small (17 minutes). The design is built for thousands of hours
  ([docs/SCALE.md](docs/SCALE.md)), but the quality numbers above are measured on 17 minutes.
- Demo voices are cleaner than a real meeting room. Real recordings will have more errors; the
  Transcript review add-on exists for that.
- The decision register uses language rules and meaning similarity, calibrated on these meetings.
  At scale, a model should confirm each "replaced by" link (prepared as an add-on).
- Identity is simulated with the "Viewing as" menu. In production it comes from Synchrone's
  company sign-in (prepared as an add-on).

## Why it moved out of Dataiku

The first version was a Dataiku Flow (kept in `archive/dataiku/`). Moving it in house gave three
things the Flow could not: an interface built for the people who ask the questions, full control
of the answer pipeline (the verification and "not found" logic are the product), and a setup that
runs anywhere without a platform licence or a shared quota.
