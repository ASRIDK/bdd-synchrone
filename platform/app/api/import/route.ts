import { getCatalog } from "@/lib/engine/data";
import { importUpload, isSupported, listJobs, type ImportMeta } from "@/lib/engine/importer";
import { sessionUser } from "@/lib/session";

export const runtime = "nodejs";

// POST /api/import?name=...&mission=...&title=...&date=...&language=...&participants=a,b
// Body: the raw file. Streaming the body keeps memory flat for large videos.
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const q = new URL(request.url).searchParams;
  const name = q.get("name") ?? "";
  const mission = q.get("mission") ?? "";
  const title = (q.get("title") ?? "").trim();
  const date = q.get("date") ?? "";
  const language = (q.get("language") ?? "") as ImportMeta["language"];

  if (!request.body) return Response.json({ error: "No file received." }, { status: 400 });
  if (!isSupported(name)) return Response.json({ error: "Use an audio or video file (wav, mp3, m4a, mp4, mov, webm...)." }, { status: 400 });
  if (!user.missions.includes(mission) || !getCatalog().missions.some((m) => m.id === mission)) {
    return Response.json({ error: "You can only import into a mission you belong to." }, { status: 403 });
  }
  if (title.length < 3 || title.length > 140) return Response.json({ error: "Give the recording a title (3 to 140 characters)." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Give the date of the meeting." }, { status: 400 });
  if (!["", "en", "fr", "es", "pt"].includes(language)) return Response.json({ error: "Unknown language." }, { status: 400 });

  const participants = (q.get("participants") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 30);

  try {
    const job = await importUpload(request.body, name, { mission, title, date, language, participants }, user.email);
    return Response.json(job);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}

// GET /api/import -> the signed-in user's import jobs (for the live status list)
export async function GET() {
  const user = await sessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  return Response.json(listJobs().filter((j) => j.user === user.email));
}
