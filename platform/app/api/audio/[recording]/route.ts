import fs from "node:fs";
import path from "node:path";
import { getIndex } from "@/lib/engine/data";
import { paths } from "@/lib/engine/paths";
import { sessionUser } from "@/lib/session";

export const runtime = "nodejs";

// Streams a recording with HTTP range support, so the player can jump to any second.
// Access is checked here too: audio of a mission the user cannot see is never served.
export async function GET(request: Request, { params }: { params: Promise<{ recording: string }> }) {
  const { recording } = await params;
  const rec = getIndex().recordingById.get(recording);
  const user = await sessionUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  if (!rec || !user.missions.includes(rec.mission)) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(paths.audio, path.basename(rec.file));
  if (!fs.existsSync(file)) return new Response("Audio file missing", { status: 404 });

  const size = fs.statSync(file).size;
  const type = file.endsWith(".m4a") ? "audio/mp4" : file.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    const stream = fs.createReadStream(file, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "content-type": type,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
      },
    });
  }
  return new Response(fs.createReadStream(file) as unknown as ReadableStream, {
    headers: { "content-type": type, "content-length": String(size), "accept-ranges": "bytes" },
  });
}
