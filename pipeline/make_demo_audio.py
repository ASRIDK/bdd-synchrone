"""Turn the scripted demo meetings into real audio files.

Each line of data/meetings/meetings.json is spoken with the macOS `say` voice of its speaker,
then all lines are joined with short pauses into one file per meeting.

Outputs
  data/audio/<meeting_id>.m4a         audio the platform plays and the pipeline transcribes
  data/meetings/ground_truth.json     start and end second of every scripted line
  data/recordings.json                recording registry (metadata only, no words)

The ground truth is only used by the evaluation to check citations. The search index is built
from what Whisper hears, never from the script.

Requires macOS (say, afconvert). Run: python pipeline/make_demo_audio.py
"""

from __future__ import annotations

import json
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEETINGS = ROOT / "data" / "meetings" / "meetings.json"
CATALOG = ROOT / "data" / "meetings" / "catalog.json"
AUDIO_DIR = ROOT / "data" / "audio"
GROUND_TRUTH = ROOT / "data" / "meetings" / "ground_truth.json"
REGISTRY = ROOT / "data" / "recordings.json"

RATE = 16000
LEAD_IN_SEC = 1.0
PAUSE_SAME_SPEAKER_SEC = 0.45
PAUSE_NEW_SPEAKER_SEC = 0.9
SPEECH_RATE_WPM = 175


def speak_to_pcm(text: str, voice: str, workdir: Path) -> bytes:
    aiff = workdir / "line.aiff"
    wav = workdir / "line.wav"
    subprocess.run(["say", "-v", voice, "-r", str(SPEECH_RATE_WPM), "-o", str(aiff), text], check=True)
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", str(aiff), str(wav)], check=True)
    with wave.open(str(wav)) as w:
        return w.readframes(w.getnframes())


def silence(seconds: float) -> bytes:
    return b"\x00\x00" * int(seconds * RATE)


def main() -> None:
    meetings = json.loads(MEETINGS.read_text())
    voices = {p["id"]: p["voice"] for p in json.loads(CATALOG.read_text())["people"]}
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    truth: dict[str, dict] = {}

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        for meeting in meetings:
            pcm = bytearray(silence(LEAD_IN_SEC))
            lines: dict[str, list[float]] = {}
            previous_speaker = None
            for line_id, speaker, text in meeting["lines"]:
                if previous_speaker is not None:
                    gap = PAUSE_SAME_SPEAKER_SEC if speaker == previous_speaker else PAUSE_NEW_SPEAKER_SEC
                    pcm += silence(gap)
                start = len(pcm) / 2 / RATE
                pcm += speak_to_pcm(text, voices[speaker], workdir)
                lines[line_id] = [round(start, 2), round(len(pcm) / 2 / RATE, 2)]
                previous_speaker = speaker
            pcm += silence(1.0)

            full_wav = workdir / "meeting.wav"
            with wave.open(str(full_wav), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes(bytes(pcm))
            out = AUDIO_DIR / f"{meeting['id']}.m4a"
            subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", str(full_wav), str(out)], check=True)

            duration = round(len(pcm) / 2 / RATE, 2)
            truth[meeting["id"]] = {"file": out.name, "duration_sec": duration, "lines": lines}
            print(f"{meeting['id']}: {duration:6.1f} s, {len(lines)} lines")

    GROUND_TRUTH.write_text(json.dumps(truth, indent=2, ensure_ascii=False) + "\n")

    # The registry holds what a meeting bot or an upload form would know about a recording:
    # metadata only, never the words spoken.
    people = {p["id"]: p["name"] for p in json.loads(CATALOG.read_text())["people"]}
    registry = []
    for meeting in meetings:
        speakers = list(dict.fromkeys(speaker for _, speaker, _ in meeting["lines"]))
        registry.append({
            "id": meeting["id"],
            "mission": meeting["mission"],
            "title": meeting["title"],
            "date": meeting["date"],
            "language": meeting["language"],
            "participants": [people[s] for s in speakers],
            "file": truth[meeting["id"]]["file"],
            "source": "demo_tts",
        })
    REGISTRY.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n")
    total = sum(m["duration_sec"] for m in truth.values())
    print(f"Wrote {len(truth)} meetings, {total / 60:.1f} minutes of audio")


if __name__ == "__main__":
    main()
