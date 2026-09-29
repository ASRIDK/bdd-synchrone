# Demo video script

Two targets:

- **Raw screen recording:** as long as it needs (about 6 minutes with the model waits).
- **Edited video: 3:50 at most**, transitions included. Cut every model wait (about 9 s per
  answer) and the import wait (about 12 s). Nothing after 4:00 is watched.

Only the video is graded (handbook, "The demo"): what it does 25%, how it works 25%, cases that
could break it 20%, quality of the output 20%, clarity 10%. The segments below follow that
weight.

Every segment has one idea and one caption. Add the caption in editing, top left, for the whole
segment, so someone watching alone knows what they are looking at.

Numbers quoted below were checked live on 29 September 2026 with Ollama and Qwen 3.5. The model's
wording can change from run to run; the scores, times and meetings do not.

## Timeline

| Time | Segment | Account | Caption on screen |
|---|---|---|---|
| 0:00 to 0:20 | The problem | none (login page) | The problem |
| 0:20 to 1:10 | End to end: import, ask, play the minute | Thomas Girard | 1. End to end |
| 1:10 to 2:10 | How it works: the six steps behind one answer | Thomas Girard | 2. How it works, step by step |
| 2:10 to 3:10 | Cases that could break it | Thomas, then Camille | 3. Cases that could break it |
| 3:10 to 3:40 | Quality report | Camille (any account) | 4. How good is it, measured |
| 3:40 to 3:50 | Close | none | Knowledge Warranty, Team 9 |

## 0:00 to 0:20, the problem

**Screen:** the login page.

**Say:** "Synchrone records meetings, trainings and troubleshooting sessions, and nobody opens
them again. When a problem comes back, the answer is at minute 34 of a file nobody remembers.
This platform answers one question: does Synchrone already know this, where exactly, and is it
still true?"

## 0:20 to 1:10, end to end (What it does)

**Account:** Thomas Girard.

1. Click **Thomas Girard** in the demo accounts, then **Continue**.
   Say: "I sign in with my Synchrone address. I only ever see my own missions."
2. Click **Import a meeting**. Drop `~/Desktop/transrail-display-cache.m4a`.
   - Title: it fills in as "Transrail display cache"; type `TransRail display cache`
   - Mission: TransRail: passenger information on AWS
   - Click **Import into the archive**.
3. **Point at** the steps under "Your imports": Waiting, Transcribing, Indexing, In the archive.
   The whole import takes about 15 s; cut it to 3 s in editing.
   Say: "Whisper transcribes it on this laptop. Nothing leaves the machine."
   The result line reads "In the archive: 5 sentences, 32 s of audio, language en."
4. Click **Assistant**. Type:
   `When is the station display cache cleared on TransRail?`
   Cut the model wait.
5. **Point at**, top to bottom:
   - the answer: "The station display cache is cleared every Sunday at 2 in the morning, before the first train."
   - under it, in the serif, the exact words spoken, in quotes
   - the meeting name and date, top right: "TransRail display cache · 29 Sept 2026"
   - the **▶ 00:15** chip and the waveform, with the red bar where the sentence is (00:32 on the right)
6. Click the **▶ 00:15** chip. The meeting opens and plays from the sentence ("Then we fix it for good...");
   the red bar on the big waveform moves with the audio.
   Let 3 seconds of audio play.
   Say: "Every answer gives the exact words, the meeting and the second. One click and you hear it."

The meeting (two macOS voices, 32 s, made by `pipeline/make_demo_meeting.py`):
- 00:00 Daniel: "Quick TransRail point on the station displays. Hugo, where are we on the stale timetables?"
- 00:06 Samantha: "The displays keep old timetables in their cache. After the Friday change, two stations showed yesterday's trains until someone restarted them."
- 00:15 Daniel: "Then we fix it for good. Decision: from now on, the station display cache is cleared every Sunday at two in the morning, before the first train."
- 00:24 Samantha: "Understood. I will schedule it tonight and add an alert if a display does not come back."
- 00:29 Daniel: "Perfect. That is all for today."

Nothing else in the archive mentions a cache or Sunday, so the answer can only come from this
import. Checked live on 29 September 2026: Whisper got every line right and the answer cites 00:15.

## 1:10 to 2:10, how it works (How it works, Quality)

**Account:** Thomas Girard. One question covers two hard cases: English question, French meeting,
and a decision that changed.

1. In the Assistant, type:
   `On which day do TransRail production deployments go out?`
2. **Point at:**
   - **Current decision**: Tuesday morning, with the French quote "Alors on change... le mardi
     matin, et plus le jeudi", Point déploiement TransRail, 8 Jul 2026, ▶ 00:22
   - **Replaced, kept as history**: Thursday morning, Cost review, 2 June 2026
   Say: "I asked in English. The answer is in a French meeting, and it replaced an older decision,
   which is kept as history, not deleted."
3. Click **How this answer was built**. Scroll slowly; stop one second on each step.

| Step | Point at | Say |
|---|---|---|
| 1. Access filter | "3 missions kept for Thomas Girard. 2 other missions removed: 22 of 104 passages excluded before the search." | "First, it removes what Thomas may not see, before searching." |
| 2. Hybrid search | Table: Cost review, BM25 13.93, embedding 0.840; Point déploiement TransRail, 5.53, 0.796 | "Keyword search and meaning search run together. Meaning search is what finds the French meeting." |
| 3. Evidence gate | "Best sentence scores 0.840 against a minimum of 0.78", every check "passed" | "If the evidence is too weak, it stops here and says not found." |
| 4. Freshness | Replaced (history) Thursday, 2 Jun 2026; By (current) "Alors on change...", 8 Jul 2026 | "The decision register knows Thursday was replaced by Tuesday." |
| 5. Answer | "Written by qwen3.5 (local model, on this machine) from 3 evidence passages" | "A local model writes from those passages only." |
| 6. Verification | Sentence, Matched source "Point déploiement TransRail, at 00:22", Match "0.85 meaning", Result "kept" | "Each sentence is checked against its source. A sentence that matches nothing is dropped." |

## 2:10 to 3:10, cases that could break it (Cases)

Order chosen so there is only one account switch.

### b. Trap question (Thomas, 15 s)

1. Type: `Who is the CTO of TransRail?`
2. **Point at:** "Not found in the recordings you can access. Nothing was guessed."
3. Open **How this answer was built**, point at **3. Evidence gate, Refused**, row "Topic words
   never mentioned: cto, failed".
   Say: "The closest sentence scores 0.86, but no recording ever mentions a CTO. It refuses
   instead of inventing a name."
   Note: the score itself passes the 0.78 minimum; the refusal comes from the second check. Say
   it that way, do not say "the score is under the threshold".

### f. A known failure (Thomas, 15 s)

1. Type: `Did the certificate rotation in July cause problems again on TransRail?`
2. **Point at:** the answer cites "Incident review: station displays blank after certificate
   rotation" at 00:11, the March incident.
   Say: "Here it fails. The July meeting, in French, says the new rotation went fine. The answer
   retells the March incident instead. We show it in the quality report as a known failure."

### c. Access (Camille, 20 s)

1. Click **Thomas Girard** (top right), **Sign out**. Click **Camille Moreau**, **Continue**.
2. Assistant, type: `On which day do TransRail production deployments go out?`
3. **Point at:** "Not found". Open **How this answer was built**, step 1: "3 missions kept for
   Camille Moreau. 2 other missions removed: 20 of 104 passages excluded before the search."
   Say: "The answer exists, in a mission Camille does not belong to. Those passages are removed
   before the search, so nothing can leak into the answer."

### d. Duplicate (Camille, 10 s)

1. Click **Import a meeting**. Drop `~/Desktop/team-sync.m4a` (the title fills in as "Team sync").
   Click **Import into the archive**.
2. **Point at** the orange message, exactly:
   `Already in the archive as "Joshua Prager: Wisdom from great writers on every year of life (part 1)".`
   Say: "Same audio under another name. It is not imported twice, and it names the original."

## 3:10 to 3:40, Quality report (Quality)

1. Click **Quality report**. Do not scroll yet: both tables are on screen.
   Say: "Fifty test questions written before tuning. Quote mode passes 41, model mode 44. No
   trap answered in model mode, no content from another mission, ever. Model mode misses one
   target: 9.1 seconds at the 95th percentile, against 5."
2. Scroll to **Known failure, shown in the demo**. Point at Expected (the July French lines),
   Recorded, Live today.
   Say: "The failure you just saw, with the expected answer, what it said when we measured, and
   what it says today."
3. Scroll once to **Every question: what was expected, what the system said**.
   Say: "Every question shows the expected lines from the meeting scripts next to what each mode
   said."

## 3:40 to 3:50, close

**Screen:** the dashboard, or a title card.

**Say:** "Import a meeting, ask in plain words, get the exact minute, see when a decision changed,
and a clear not found when the archive does not know. All on one laptop."

## Pre-flight checklist

Do all of this in the main checkout (`~/BDD Synchrone`), not a worktree.

- [ ] Ollama running with `qwen3.5` (`ollama list` shows it).
- [ ] Settings file uses Ollama: `data/settings.local.json` has `"provider": "ollama"` (or
      `auto` with no cloud key).
- [ ] `npm run index` done in `platform/` after any data change.
- [ ] Record on the production build: `npm run build && npm start` in `platform/` (Node 24),
      app on http://localhost:3120 like dev. Why: no Next.js dev badge on screen and faster pages.
      Stop any dev server first (`kill $(lsof -ti:3120)`): if 3120 is taken, `npm start` quietly
      moves to 3121.
- [ ] After any code change, stop the server and run `npm run build && npm start` again (the
      production build does not reload changes on its own).
- [ ] Warm-up: sign in and ask one throwaway question, so the first real answer is not a cold
      start (the first one can take over 30 s).
- [ ] Browser window at 1360 x 900, zoom 100%, no bookmarks bar, no other tabs visible.
- [ ] `~/Desktop/transrail-display-cache.m4a` and `~/Desktop/team-sync.m4a` present. To recreate
      the meeting: `python3 pipeline/make_demo_meeting.py`. To recreate team-sync:
      `cp data/audio/joshua-prager-wisdom-from-great-writers-on-every-ed219e.m4a ~/Desktop/team-sync.m4a`
- [ ] Every case run once, in the order above, before recording.
- [ ] Account switch rehearsed (avatar top right, Sign out, click the persona, Continue).
- [ ] After a rehearsal import of the voice memo, remove it, or the real import is refused as a
      duplicate: `git checkout -- data/index/index.json data/recordings.json`, delete
      `data/audio/transrail-display-cache-*.m4a` and
      `data/transcripts/transrail-display-cache-*.json`, and remove its entry from
      `data/jobs.json`. The team-sync import changes nothing in the archive and can be repeated;
      remove its entry from `data/jobs.json` only to keep the imports list short.
- [ ] Case a answer: the Thursday history card has its "▶ 00:55" waveform just above the question
      bar; scroll a little so it shows.

## If something goes wrong while recording

- Model slow or down: the answer falls back to quote mode, with exact quotes and the trace step 5
  saying why. Keep going, or restart Ollama and redo the segment.
- A live result differs from the numbers above: show what the app shows. Do not re-take until it
  matches.
