"""Make the short meeting imported live in the demo video.

Two macOS voices, about 32 seconds, one decision that no other recording mentions (the station
display cache is cleared every Sunday at 2 a.m.), so the answer can only come from this import.
Uses only macOS tools: `say` for the voices and `afconvert` for the m4a.

    python3 pipeline/make_demo_meeting.py            # writes ~/Desktop/transrail-display-cache.m4a
    python3 pipeline/make_demo_meeting.py out.m4a
"""

import os
import subprocess
import sys
import tempfile
import wave

LINES = [
    ("Daniel", "Quick TransRail point on the station displays. Hugo, where are we on the stale timetables?"),
    ("Samantha", "The displays keep old timetables in their cache. After the Friday change, two stations showed yesterday's trains until someone restarted them."),
    ("Daniel", "Then we fix it for good. Decision: from now on, the station display cache is cleared every Sunday at two in the morning, before the first train."),
    ("Samantha", "Understood. I will schedule it tonight and add an alert if a display does not come back."),
    ("Daniel", "Perfect. That is all for today."),
]
RATE = 22050
PAUSE_SEC = 0.6


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/transrail-display-cache.m4a")
    with tempfile.TemporaryDirectory() as tmp:
        joined = os.path.join(tmp, "meeting.wav")
        with wave.open(joined, "wb") as w_out:
            w_out.setnchannels(1)
            w_out.setsampwidth(2)
            w_out.setframerate(RATE)
            t = 0.0
            for i, (voice, text) in enumerate(LINES):
                part = os.path.join(tmp, f"{i}.wav")
                subprocess.run(["say", "-v", voice, "-r", "165", f"--data-format=LEI16@{RATE}", "-o", part, text], check=True)
                with wave.open(part, "rb") as w_in:
                    print(f"{int(t) // 60:02d}:{int(t) % 60:02d}  {voice}: {text}")
                    w_out.writeframes(w_in.readframes(w_in.getnframes()))
                    t += w_in.getnframes() / RATE
                w_out.writeframes(b"\x00\x00" * int(RATE * PAUSE_SEC))
                t += PAUSE_SEC
        if os.path.exists(out):
            os.remove(out)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", joined, out], check=True)
    print(f"Wrote {out} ({t:.0f} s)")


if __name__ == "__main__":
    main()
