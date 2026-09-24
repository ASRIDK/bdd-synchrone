# The data

Everything the platform reads lives here. Nothing in this folder is sent anywhere.

```
data/
├── meetings/
│   ├── catalog.json        missions, people, demo users and their access, client glossary
│   ├── meetings.json       the 13 meeting scripts, one ID per line (used to make audio and to score)
│   └── ground_truth.json   exact start and end second of every scripted line in the audio
├── recordings.json         the recording registry: mission, title, date, participants, file (no words)
├── audio/                  21 recordings, AAC, 44 minutes, 18 MB (13 scripted, 7 TED segments, 1 test import)
├── jobs.json               import jobs and their status (local only)
├── transcripts/            Whisper output, one JSON per recording
├── index/index.json        segments, passages, vectors and the decision register (built by npm run index)
├── eval/
│   ├── questions.json          the 50 test questions with the expected moment and behaviour
│   ├── results.json            last run, quote mode
│   ├── results-llm-ollama.json last run, model mode (local Qwen 3.5)
│   └── llm-ollama-run.txt      console output of that run
├── corrections.json        transcript corrections saved from Transcript review (created on first save)
├── settings.local.json     model choice, API keys, beta switches (local only, never committed)
├── .secrets/               the key that signs sessions (local only, never committed)
└── logs/questions.jsonl    every question asked: user, status, citations, time, cost (local only)
```

## How the demo recordings were made

The sample talks provided with the case are TED talks. They have no meetings, no decisions and no
missions, so they cannot test decisions that change, access rules or questions spread over several
meetings. We wrote 13 meetings that can, in `meetings/meetings.json`:

| Mission (fictional client) | Synchrone practice | Meetings | What they test |
|---|---|---|---|
| Banque Hexa, SEPA Instant payments | Finance Consulting | 4 | A timeout changed from 5 to 7 seconds; PostgreSQL 14 replaced by 16; a ticket (HEX-2291) and its fix; a "we keep five seconds" that confirms, not replaces |
| TransRail, passenger information on AWS | InfraCloud | 4 (one in French) | The troubleshooting story (displays blank after a certificate rotation, ticket TR-4821); Kafka retention cut from 7 to 3 days; deployments moved from Thursday (English) to Tuesday (French); a region that is confirmed, not changed |
| Nova Télécom, security operations | Cybersecurity | 2 | Restricted mission; a playbook rule reversed after an incident; the only person who knows a procedure is leaving |
| Data & AI practice, internal talks | Data & AI | 3 (one in French) | Open to all; knowledge that overlaps missions; a French training asked about in English |

Each line was spoken with the macOS voice of its speaker (six English accents: American, British,
Irish, Australian, South African, Indian; two French voices) by `pipeline/make_demo_audio.py`, and
the audio files were then transcribed by Whisper exactly like real recordings. The script is used
twice only: to make the audio, and to score the answers (`ground_truth.json` gives the second at
which each line starts). The search index is built from what Whisper heard.

## Adding real recordings

Use the Import page, or for a whole folder: `npm run import -- <folder> --mission <id> --date YYYY-MM-DD`
in `platform/`. Both hash the file (duplicates are refused), store it in `audio/` (WAV is compressed
to AAC), add it to `recordings.json`, transcribe it with Whisper and rebuild the index.

The 7 TED segments from the case were added this way into the open "Talks library" mission, with
titles and speakers read from their file names. Their real dates are unknown, so they carry the
import date.
