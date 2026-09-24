import Link from "next/link";
import { saveModelSettings } from "@/app/actions";
import { publicSettings, readSettings } from "@/lib/engine/settings";

export default function SettingsPage() {
  const s = publicSettings(readSettings());
  const field = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2";

  return (
    <div className="max-w-2xl">
      <h1 className="text-[2rem] font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-ink-soft">
        Choose who writes the answers. Without a model, answers are exact quotes from the recordings, which cannot invent
        anything. With a model, answers read more naturally and every sentence is still checked against its source.
      </p>

      <form action={saveModelSettings} className="mt-8 space-y-6 rounded-xl border border-line bg-surface p-5">
        <fieldset>
          <legend className="font-medium">Answer mode</legend>
          <div className="mt-2 space-y-2">
            {[
              ["none", "Quotes only, no model", "Free, instant, nothing leaves this machine."],
              ["ollama", "Local model with Ollama", "Runs on this machine. Nothing leaves it. Slower."],
              ["mistral", "Mistral (EU)", "Data processed in the EU. Needs an API key."],
              ["anthropic", "Claude (Anthropic)", "Needs an API key. Default model: Claude Opus 5."],
            ].map(([value, label, hint]) => (
              <label key={value} className="flex gap-3">
                <input type="radio" name="provider" value={value} defaultChecked={s.provider === value} className="mt-1.5" />
                <span>
                  <span className="block">{label}</span>
                  <span className="block text-sm text-ink-faint">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Ollama model
            <input name="ollamaModel" defaultValue={s.ollamaModel} className={field} />
          </label>
          <label className="block text-sm">
            Ollama address
            <input name="ollamaUrl" defaultValue={s.ollamaUrl} className={field} />
          </label>
          <label className="block text-sm">
            Mistral model
            <input name="mistralModel" defaultValue={s.mistralModel} className={field} />
          </label>
          <label className="block text-sm">
            Mistral API key {s.mistralKeySet && <span className="text-valid">(saved)</span>}
            <input name="mistralKey" type="password" autoComplete="off" placeholder={s.mistralKeySet ? "Leave empty to keep" : ""} className={field} />
          </label>
          <label className="block text-sm">
            Claude model
            <input name="anthropicModel" defaultValue={s.anthropicModel} className={field} />
          </label>
          <label className="block text-sm">
            Anthropic API key {s.anthropicKeySet && <span className="text-valid">(saved)</span>}
            <input name="anthropicKey" type="password" autoComplete="off" placeholder={s.anthropicKeySet ? "Leave empty to keep" : ""} className={field} />
          </label>
        </div>
        <p className="text-sm text-ink-faint">
          Keys are stored only on this machine, in data/settings.local.json, readable by your user account only. They are never shown again or sent to the browser.
        </p>
        <button type="submit" className="rounded-lg bg-ink px-5 py-2.5 font-medium text-white">Save settings</button>
      </form>

      <p className="mt-6 text-sm text-ink-faint">
        Beta add-ons are switched on and off from the <Link href="/add-ons" className="underline underline-offset-4">Add-ons</Link> page.
      </p>
    </div>
  );
}
