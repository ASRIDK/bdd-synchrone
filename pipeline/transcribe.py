"""Transcribe every recording in data/recordings.json with faster-whisper.

What it does, per recording
  1. Hash the audio file (sha256). If a transcript already exists for the same hash and model,
     skip it. A replaced file with the same name is transcribed again.
  2. Run Whisper locally (no audio leaves the machine), with voice activity detection and the
     glossary of client acronyms as a hint, so words like "UETR" or "pacs.008" come out right.
  3. Write data/transcripts/<recording_id>.json: timestamped segments plus the quality scores
     Whisper gives for each segment, and the real cost of the run (wall time, realtime factor).

Run:  pipeline/.venv/bin/python pipeline/transcribe.py            (model: small)
      WHISPER_MODEL=medium pipeline/.venv/bin/python pipeline/transcribe.py
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "recordings.json"
CATALOG = ROOT / "data" / "meetings" / "catalog.json"
AUDIO_DIR = ROOT / "data" / "audio"
OUT_DIR = ROOT / "data" / "transcripts"

MODEL = os.environ.get("WHISPER_MODEL", "small")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def glossary_prompt() -> str:
    terms = [entry["term"] for entry in json.loads(CATALOG.read_text())["glossary"]]
    return "Glossary: " + ", ".join(terms) + "."


def main() -> None:
    recordings = json.loads(REGISTRY.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    prompt = glossary_prompt()
    model = None
    done, skipped = 0, 0

    for rec in recordings:
        audio = AUDIO_DIR / rec["file"]
        out = OUT_DIR / f"{rec['id']}.json"
        file_hash = sha256(audio)
        if out.exists():
            previous = json.loads(out.read_text())
            if previous.get("sha256") == file_hash and previous.get("model") == MODEL:
                skipped += 1
                continue

        if model is None:
            model = WhisperModel(MODEL, device="cpu", compute_type="int8")

        started = time.perf_counter()
        segments, info = model.transcribe(
            str(audio),
            language=rec.get("language"),
            vad_filter=True,
            initial_prompt=prompt,
            condition_on_previous_text=False,
        )
        rows = []
        for index, seg in enumerate(segments):
            rows.append({
                "id": f"{rec['id']}#{index:04d}",
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "avg_logprob": round(seg.avg_logprob, 3),
                "no_speech_prob": round(seg.no_speech_prob, 3),
                "compression_ratio": round(seg.compression_ratio, 3),
            })
        wall = time.perf_counter() - started

        out.write_text(json.dumps({
            "recording_id": rec["id"],
            "file": rec["file"],
            "sha256": file_hash,
            "model": MODEL,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "audio_duration_sec": round(info.duration, 2),
            "transcribed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "wall_time_sec": round(wall, 2),
            "realtime_factor": round(info.duration / wall, 2) if wall else None,
            "segments": rows,
        }, indent=2, ensure_ascii=False) + "\n")
        done += 1
        print(f"{rec['id']}: {len(rows)} segments, {info.duration:.0f} s audio in {wall:.1f} s ({info.duration / wall:.1f}x realtime)")

    print(f"Transcribed {done}, skipped {skipped} unchanged (model {MODEL})")


if __name__ == "__main__":
    main()
