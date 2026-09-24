# Sources

Every figure used in the platform and the documents, with where it comes from. Checked on
24 September 2026.

## Synchrone

| Figure | Value | Source |
|---|---|---|
| Revenue 2024 | 139 M€, top 50 French ESN | Synchrone, Rapport Développement Durable 2024, p. 7 (text in `docs/course/synchrone-rapport-dd-2024.txt`) |
| Staff | About 1,500 (1,255 salaried in the UES: 1,091 consulting, 80 business, 84 corporate) | Same report, p. 7 and p. 38 |
| Average age, share of managers | 39 years, 91% cadres | Same report, p. 38 |
| Clients | 120 large accounts | Same report, p. 7; synchrone.fr |
| Sectors | Banking and finance, services, transport, telecom, retail, energy | Same report |
| Expertise | Finance Consulting, Cybersecurity, Digital & Innovation, Data & AI, InfraCloud | synchrone.fr/fr/synchrone |
| Certifications | ISO 9001, ISO 27001, EcoVadis 72/100 | Same report, p. 7 |
| Sites | Paris, Aix-en-Provence, Nantes, Rennes, Lyon, Strasbourg, Bordeaux, Clermont-Ferrand, Sophia Antipolis, Lille, Montpellier; Lisbon, Porto, Barcelona, Madrid | synchrone.fr/fr/synchrone |
| Strategy | From ESN to a high value consulting firm, with AI and Data at the heart of the strategy | Same report, President's message |
| Staff turnover | Not published in the report; we do not use a figure | |

## Value of an hour (reverse brief)

€139M / 1,500 people / 1,607 hours (French legal reference) = €57.7 per hour. Used only to price
an hour, not as a salary. Working weeks per year: 45.9 (1,607 / 35).

## Prices

| Item | Price | Source |
|---|---|---|
| OpenAI Whisper API, gpt-4o-transcribe | $0.006 per minute | OpenAI pricing, via costgoat.com and diyai.io summaries, 2026 |
| OpenAI gpt-4o-mini-transcribe | $0.003 per minute | Same |
| Mistral Voxtral Mini Transcribe V2 | $0.003 per minute | mistral.ai/news/voxtral-transcribe-2 |
| Mistral Small | $0.10 per million input tokens, $0.30 output | mistral.ai/pricing |
| Claude Haiku 4.5 | $1 per million input tokens, $5 output | anthropic.com/claude/haiku; platform.claude.com pricing |
| Claude Opus 5 | $5 per million input tokens, $25 output | Anthropic model table, 2026 |

## Speeds

| Item | Value | Source |
|---|---|---|
| Whisper small, int8, laptop processor | 10.5x real time | Measured here (`data/transcripts/*.json`, field `realtime_factor`) |
| Whisper large-v3, int8, RTX 4070 | About 12x real time | promptquorum.com, "Whisper.cpp vs faster-whisper 2026" |
| Whisper large-v3-turbo on L40S | Up to 58x real time | runpod.io, "Best GPU for Whisper" |

## Models used

| Model | Use | Licence |
|---|---|---|
| faster-whisper `small` (Systran) | Transcription | MIT |
| `Xenova/multilingual-e5-small` | Meaning search, decision topics | MIT |
| Qwen 3.5 9.7B via Ollama (optional) | Writing answers locally | Qwen family licence (Apache 2.0 for recent Qwen releases); check the model card before production use |
