import { modelName, resolveProvider } from "@/lib/engine/llm";
import { readSettings } from "@/lib/engine/settings";
import { sessionUser } from "@/lib/session";

export const runtime = "nodejs";

const LABEL: Record<string, string> = {
  ollama: "Local model",
  anthropic: "Claude",
  mistral: "Mistral",
  none: "Exact quotes, no model",
};

// GET /api/model -> which model answers right now (the assistant shows it in its header).
export async function GET() {
  if (!(await sessionUser())) return Response.json({ error: "Sign in first." }, { status: 401 });
  const settings = readSettings();
  const provider = await resolveProvider(settings);
  return Response.json({
    setting: settings.provider,
    provider,
    model: modelName(settings, provider),
    label: provider === "none" ? LABEL.none : `${LABEL[provider]}: ${modelName(settings, provider).replace(/:latest$/, "")}`,
    local: provider === "ollama" || provider === "none",
  });
}
