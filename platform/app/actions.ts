"use server";

import { revalidatePath } from "next/cache";
import { writeSettings, type Provider } from "@/lib/engine/settings";
import { currentUser } from "@/lib/session";

const PROVIDERS: Provider[] = ["auto", "none", "anthropic", "mistral", "ollama"];

export async function saveModelSettings(form: FormData) {
  await currentUser();
  const provider = String(form.get("provider") ?? "auto") as Provider;
  writeSettings({
    provider: PROVIDERS.includes(provider) ? provider : "auto",
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
  await currentUser();
  writeSettings({ features: { [id]: on } });
  revalidatePath("/", "layout");
}
