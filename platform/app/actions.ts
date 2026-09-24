"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCatalog } from "@/lib/engine/data";
import { writeSettings, type Provider } from "@/lib/engine/settings";
import { USER_COOKIE } from "@/lib/session";

export async function setUser(login: string) {
  if (!getCatalog().users.some((u) => u.login === login)) return;
  (await cookies()).set(USER_COOKIE, login, { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}

export async function saveModelSettings(form: FormData) {
  const provider = String(form.get("provider") ?? "none") as Provider;
  writeSettings({
    provider: ["none", "anthropic", "mistral", "ollama"].includes(provider) ? provider : "none",
    anthropicModel: String(form.get("anthropicModel") || "claude-opus-5"),
    anthropicKey: String(form.get("anthropicKey") || "") || undefined,
    mistralModel: String(form.get("mistralModel") || "mistral-small-latest"),
    mistralKey: String(form.get("mistralKey") || "") || undefined,
    ollamaModel: String(form.get("ollamaModel") || "qwen3.5:latest"),
    ollamaUrl: String(form.get("ollamaUrl") || "http://localhost:11434"),
  });
  revalidatePath("/", "layout");
}

export async function setFeature(id: string, on: boolean) {
  writeSettings({ features: { [id]: on } });
  revalidatePath("/", "layout");
}
