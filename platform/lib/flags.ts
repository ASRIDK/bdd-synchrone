import { featureById } from "./features";
import { readSettings } from "./engine/settings";

// A beta feature is visible when it is switched on in Settings. Live features always are.
export function isEnabled(id: string): boolean {
  const f = featureById(id);
  if (!f) return false;
  if (f.status === "live") return true;
  if (f.status === "planned") return false;
  return readSettings().features[id] ?? false;
}
