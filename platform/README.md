# Platform

The web platform and the answering engine. See the project README one level up for what it does
and how to run it, and `docs/HOW-IT-WORKS.md` for the engine.

- `lib/engine/` search, decision register, answers, verification, evaluation (no framework code)
- `app/` pages and API routes (Next.js 16, App Router)
- `components/` interface pieces
- `scripts/` `index`, `ask`, `eval`, `calibrate`, plus `debug-*` helpers used while calibrating
- `tests/` unit tests (`npm test`)

Needs Node 24 (`nvm use 24`). Reads its data from `../data`, or from `KW_DATA_DIR` if set.
