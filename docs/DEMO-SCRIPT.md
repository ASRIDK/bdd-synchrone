# Demo video script (4 minutes)

The handbook grades the video on: what it does (25%), how it works (25%), the cases it runs on,
including ones that break it (20%), quality of what it produces (20%), clarity (10%). The script
follows that order.

Before recording: start Ollama with the Qwen 3.5 model, start the platform (`npm run dev` in
`platform/`), switch the three beta add-ons on in Add-ons, set the browser to 1360 x 900, and
prepare one short meeting file to import (for example a 20 second voice memo).

## 0:00 to 0:20, the problem

Screen: the login page.

"Synchrone records meetings, trainings and troubleshooting sessions, and nobody opens them again.
When a problem comes back, the answer is at minute 34 of a file nobody remembers. This platform
answers one question: does Synchrone already know this, where exactly, and is it still true?"

## 0:20 to 1:00, sign in and the dashboard

1. Click "Thomas Girard" in the demo accounts, Continue. Say: "You sign in with your Synchrone
   address; you only ever see your own missions."
2. Dashboard: the meetings Thomas took part in, his missions, "What changed" (Thursday deployments
   replaced by Tuesday in a French meeting; Kafka retention cut from 7 to 3 days).

## 1:00 to 1:45, import a meeting

1. "Import a meeting". Drop the file, pick the mission, tick the participants, Import.
2. Show the live steps: waiting, transcribing, indexing, in the archive. Say: "Whisper runs on this
   laptop; nothing leaves the machine."
3. Drop `demo_test.wav` again: "Already in the archive as Joshua Prager, part 1". Say: "Same audio,
   different name: it is not imported twice."

## 1:45 to 2:40, the assistant, including the cases that break it

1. Ask something from the meeting you just imported. The sources appear first, then the local
   model's answer. Click the timeline bar: the meeting opens at that second.
2. Ask "On which day do TransRail production deployments go out?" Current decision (Tuesday, from
   the French meeting) and the replaced one (Thursday) kept as history.
3. Ask "Who is the CTO of TransRail?" Not found. Open "How this answer was built": the recordings
   never mention a CTO. Say: "It says so instead of guessing."
4. Sign out, sign in as Camille (Banque Hexa), ask the deployment question: not found. Say: "The
   answer exists, in a mission she does not belong to. It is removed before the search."

## 2:40 to 3:20, how it works and how well

Quality report: 50 questions written before tuning; the table of targets from the reverse brief;
the failed questions and why. Say which ones fail and that the numbers were measured again after
the archive grew from 17 to 44 minutes.

## 3:20 to 3:50, what it is worth

Value and cost, central scenario: 375 users, 30 minutes a week, about €497k a year against €150k
in year one, break-even at 114 users. Transcribing 10,000 hours: about $1,800 with an EU provider,
or free on Synchrone's own machines.

## 3:50 to 4:00, what comes next

Add-ons page: "Who knows what flags that Arjun, the only person who can capture memory on the Nova
fleet, leaves at the end of October. The Teams recorder bot and company sign-in are prepared, with
what they need from Synchrone IT."
