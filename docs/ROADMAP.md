# Roadmap: add-ons prepared for a soft launch

The platform ships in three layers. The same list lives in code (`platform/lib/features.ts`) and on
the Add-ons page, where beta features are switched on and off.

## Live

Ask the recordings, Mission library, Decision register, Quality report, Value and cost.

## Built, ready for a soft launch (switch on per pilot team)

| Add-on | For | What it does | How to launch it |
|---|---|---|---|
| **Who knows what** | Practice leads, staffing | People and the meetings they took part in; recorded knowledge held by a single person; people leaving within 90 days, with a suggested handover | Switch on for one practice. Check with its lead that the "about to leave" list matches reality. |
| **Transcript review** | Mission leads, quality | Sentences Whisper was unsure about, known mishearings of client terms; a reviewer corrects them, the fix is used at the next index build | Give it to one mission lead per mission. Each correction that recurs becomes a glossary entry, which fixes it everywhere. |
| **Decision digest** | Mission teams | What was decided per mission over 30, 90 or 365 days, and what it replaced, ready to paste in an email | Send it by hand for a month; automate the email only if teams read it. |

A soft launch should measure one thing per add-on, from `data/logs/questions.jsonl` and page use:
does the pilot team come back after the first week?

## Prepared, not built

Each one is designed to plug into what exists, and lists what it needs from Synchrone first.

| Add-on | What it needs | Where it plugs in |
|---|---|---|
| **Meeting recorder bot** (invite it to a Teams meeting; it records and files under the mission) | Teams bot registration and Graph API recording permissions from Synchrone IT | A new source that writes to the recording registry (`data/recordings.json` today, a table later) |
| **Upload a recording** | A job queue and a transcription worker; storage in Synchrone's tenant | Calls the existing `pipeline/transcribe.py`, then rebuilds the index for that recording |
| **Sign-in with Synchrone accounts** | Microsoft Entra ID app registration; one group per mission | Replaces `platform/lib/session.ts`; mission access comes from groups |
| **Ask from Teams** | A Teams app | Calls `POST /api/ask` with the signed-in user; no change to the engine |
| **Speaker names** | Speaker diarisation (for example pyannote) in the pipeline, then a one-time voice to person mapping | Adds a speaker to each segment; the register can then say who took each decision |
| **Model-checked decision register** | A configured model (Settings) | At index build, a model confirms each "replaced by" link the rules propose, on candidate pairs only |
| **Retention and deletion rules** | Client contract terms and a data protection review | Deletes audio, transcript and index entries of a recording together |

## Order we recommend

1. Sign-in (nothing goes to real users without it).
2. Upload, then the meeting bot (the archive fills itself).
3. Transcript review for all missions (quality of everything downstream depends on it).
4. Model-checked register, once there are enough real decisions to check it against.
5. Ask from Teams, when usage shows people come back.
