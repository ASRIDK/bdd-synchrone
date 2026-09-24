# Demo video script (4 minutes)

The handbook grades the video on: what it does (25%), how it works (25%), the cases it runs on,
including ones that break it (20%), quality of what it produces (20%), clarity (10%). The script
follows that order. Start the platform with `npm run dev` in `platform/`, switch the three beta
add-ons on in Add-ons, and set the browser to 1360 x 900.

## 0:00 to 0:25, the problem

Screen: the Ask page.

"Synchrone records meetings, trainings and troubleshooting sessions, and nobody opens them again.
When a problem comes back, the answer is at minute 34 of a file nobody remembers. This platform
answers one question: does Synchrone already know this, where exactly, and is it still true?"

## 0:25 to 1:20, what it does

1. Viewing as Thomas Girard (TransRail). Click "Screens in the stations went blank after new
   certificates were installed. What should I check first?"
   Say: "Reworded on purpose. It finds the incident review, the sentence, the minute." Click the
   timeline bar: the meeting opens at the moment, the sentence highlighted, audio plays.
2. Ask "On which day do TransRail production deployments go out?"
   Say: "Thursday was decided in June, in English. In July, a French meeting moved it to Tuesday.
   The latest is shown as current, the old one as history."

## 1:20 to 2:10, the cases that break it

1. Ask "Who is the CTO of TransRail?" Result: not found. Open "How this answer was built": "the
   recordings never mention CTO". Say: "It says so instead of guessing."
2. Switch "Viewing as" to Camille Moreau (Banque Hexa). Ask the deployment question again.
   Not found. Say: "The answer exists, in a mission she does not belong to. It is removed before
   the search, so nothing leaks, not even a hint."
3. Quality report page. Say: "50 questions written before tuning. 42 pass without a model, 44 with
   a local one. Here are the ones that fail, and why." Point at the near-miss traps.

## 2:10 to 3:15, how it works

Open "How this answer was built" on the deployment answer and walk down the steps:
access filter, keyword plus meaning search, the evidence gate, the freshness check, the answer.
Then one slide or the README diagram: Whisper on the laptop at 10 times real time, 5% word error
rate, the errors it makes (show one entry in Transcript review: "Post-Gur-SQL is probably
PostgreSQL"). Say: "Everything runs on this laptop. No audio leaves the machine."

## 3:15 to 3:50, what it is worth

Value and cost page, central scenario: 375 users, 30 minutes a week, about €497k a year against
€150k in year one, break-even at 114 users. Then the running cost table: transcribing 10,000 hours
costs about $1,800 with an EU provider.

## 3:50 to 4:00, what comes next

Add-ons page: "Who knows what flags that Arjun, the only person who can capture memory on the Nova
fleet, leaves in 37 days. The Teams recorder bot and company sign-in are prepared, with what they
need from Synchrone IT."
