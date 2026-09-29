# Voice-over for the demo video

Video: https://www.loom.com/share/177ccf46cbd04f8ebaaa059e35019db6 (3:43, recorded 29 September 2026).
Written for a text-to-speech voice at about 140 words a minute, calm and clear. Each block matches
what is on screen at that moment. The plain text to paste into the voice tool is first; the timed
version below is for lining the audio up in editing.

## Instructions for the voice AI

Read the text below as a narrator for a product demo. Calm, clear, confident, not salesy. Medium
pace, short pauses between paragraphs. Pronounce "Synchrone" the French way (san-krohn), "Qwen" as
"chwen", "BM25" as "B M twenty-five", "SEPA" as "see-pa", "TransRail" as "trans rail".

## Text to paste

Synchrone records its meetings, but nobody opens them again. Knowledge Warranty makes them usable. I sign in with a Synchrone address, as Camille Moreau.

Camille leads the Banque Hexa mission. She only sees her own missions: three of them, fourteen recordings. Here are the meetings she was in, her missions, and what changed. The payment gateway timeout went from five to seven seconds, and the database from PostgreSQL fourteen to sixteen. The old decisions are kept as history, never deleted.

Now the assistant. It runs on a local model, on this laptop. Nothing leaves the machine. Camille asks: which vendor provides fraud scoring for Banque Hexa? The answer is not found. Nothing was guessed. The recordings never name a vendor, so the system refuses instead of inventing one.

Here is why, step by step. First, the access filter removes twenty of the hundred and four passages, from missions Camille cannot see, before any search. Then keyword and meaning search run together. The evidence gate sees that the best passages cover only half of the question's key words. So it stops, and the last three steps are marked not applicable.

Every recording can be opened and played. This is the cutover retrospective. The transcript follows the audio, and the decision to keep the feature flag for three months is marked as current.

The library files every recording under its mission.

The decision register shows every decision found in the recordings. When a later meeting changes one, the new one is current, and the old one stays visible, with a link to the exact second.

The quality report. Fifty test questions, written before any tuning. Forty-four pass with the local model. Known failures are shown, not hidden. Transcription runs ten times faster than real time, with five percent word errors in English and two in French.

How it works, in ten steps. Recordings come in. Whisper transcribes them on this machine. Passages are indexed by keywords and by meaning. Decisions are tracked over time. A question is filtered by access first, then searched, then checked by the evidence gate. The answer is written from the evidence only, and each sentence is checked against its source. Finally, fifty questions measure the whole system, and the thresholds are tuned on half of them only.

Now a new meeting that is not in the archive yet. I import it into the Talks library, which is open to everyone. The same file is never imported twice. It waits, it is transcribed, it is indexed, and it is in the archive. Five sentences, thirty-two seconds of audio.

It opens right away. The decision to clear the station display cache every Sunday at two in the morning is already found, and marked as current.

Now I sign in as Thomas Girard, from the TransRail mission. His archive already includes the new meeting: sixteen recordings instead of fifteen, and six decisions in force instead of five.

Knowledge Warranty. The answer, the exact words, and the second that proves it. Or an honest "not found".

## Timed version

| Video time | On screen | Voice-over |
|---|---|---|
| 0:00 to 0:08 | Login page, click Camille Moreau, Continue | Synchrone records its meetings, but nobody opens them again. Knowledge Warranty makes them usable. I sign in with a Synchrone address, as Camille Moreau. |
| 0:08 to 0:36 | Camille's dashboard: meetings, missions, What changed, Imports | Camille leads the Banque Hexa mission. She only sees her own missions: three of them, fourteen recordings. Here are the meetings she was in, her missions, and what changed. The payment gateway timeout went from five to seven seconds, and the database from PostgreSQL fourteen to sixteen. The old decisions are kept as history, never deleted. |
| 0:36 to 1:00 | Assistant, question "Which vendor provides fraud scoring for Banque Hexa?", Refused | Now the assistant. It runs on a local model, on this laptop. Nothing leaves the machine. Camille asks: which vendor provides fraud scoring for Banque Hexa? The answer is not found. Nothing was guessed. The recordings never name a vendor, so the system refuses instead of inventing one. |
| 1:00 to 1:17 | "How this answer was built": access filter, hybrid search, evidence gate refused, steps 4 to 6 not applicable | Here is why, step by step. First, the access filter removes twenty of the hundred and four passages, from missions Camille cannot see, before any search. Then keyword and meaning search run together. The evidence gate sees that the best passages cover only half of the question's key words. So it stops, and the last three steps are marked not applicable. |
| 1:17 to 1:36 | Library, Cutover retrospective playing, decision marked current | Every recording can be opened and played. This is the cutover retrospective. The transcript follows the audio, and the decision to keep the feature flag for three months is marked as current. |
| 1:36 to 1:44 | Library list, Kickoff recording | The library files every recording under its mission. |
| 1:44 to 1:52 | Decision register | The decision register shows every decision found in the recordings. When a later meeting changes one, the new one is current, and the old one stays visible, with a link to the exact second. |
| 1:52 to 2:12 | Quality report: 41/50 and 44/50, known failure X03, transcription quality, every question | The quality report. Fifty test questions, written before any tuning. Forty-four pass with the local model. Known failures are shown, not hidden. Transcription runs ten times faster than real time, with five percent word errors in English and two in French. |
| 2:12 to 2:43 | How it works, walkthrough playing steps 1 to 10 | How it works, in ten steps. Recordings come in. Whisper transcribes them on this machine. Passages are indexed by keywords and by meaning. Decisions are tracked over time. A question is filtered by access first, then searched, then checked by the evidence gate. The answer is written from the evidence only, and each sentence is checked against its source. Finally, fifty questions measure the whole system, and the thresholds are tuned on half of them only. |
| 2:43 to 3:13 | Import: pick transrail-display-cache.m4a, mission Talks library, Import, Waiting, Transcribing, Indexing, In the archive | Now a new meeting that is not in the archive yet. I import it into the Talks library, which is open to everyone. The same file is never imported twice. It waits, it is transcribed, it is indexed, and it is in the archive. Five sentences, thirty-two seconds of audio. |
| 3:13 to 3:26 | The new recording opens and plays, decision at 00:15 marked current | It opens right away. The decision to clear the station display cache every Sunday at two in the morning is already found, and marked as current. |
| 3:26 to 3:37 | Sign out, sign in as Thomas Girard, dashboard: 16 recordings, 6 decisions in force | Now I sign in as Thomas Girard, from the TransRail mission. His archive already includes the new meeting: sixteen recordings instead of fifteen, and six decisions in force instead of five. |
| 3:37 to 3:43 | Sign out, login page | Knowledge Warranty. The answer, the exact words, and the second that proves it. Or an honest "not found". |

## Notes for editing

- About 500 words for 3:43 (about 3:36 at 140 words a minute). If a block runs long in the voice tool, speed that block up slightly
  rather than cutting words that name something on screen.
- The walkthrough block (2:12 to 2:43) is the densest. It is written to follow the ten steps as
  they light up; start it exactly when the walkthrough starts playing.
- The video plays at 1.2x by default on Loom. The times above are the video's own times (3:43
  total), which is what an editor uses.
