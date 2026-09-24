"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getIndex } from "@/lib/engine/data";
import { paths } from "@/lib/engine/paths";
import { currentUser } from "@/lib/session";

type Correction = { segmentId: string; text: string; reviewer: string; at: string };

export async function saveCorrection(form: FormData) {
  const segmentId = String(form.get("segmentId") ?? "");
  const text = String(form.get("text") ?? "").trim();
  const user = await currentUser();
  const seg = getIndex().segments.find((s) => s.id === segmentId);
  // Only people on the mission can correct its transcripts.
  if (!seg || !text || text.length > 2000 || !user.missions.includes(seg.mission)) return;

  const list: Correction[] = fs.existsSync(paths.corrections) ? JSON.parse(fs.readFileSync(paths.corrections, "utf8")) : [];
  const next = list.filter((c) => c.segmentId !== segmentId);
  next.push({ segmentId, text, reviewer: user.name, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(paths.corrections), { recursive: true });
  fs.writeFileSync(paths.corrections, JSON.stringify(next, null, 2));
  revalidatePath("/review");
}
