"use client";

import { useTransition } from "react";
import { setFeature } from "@/app/actions";

export function FeatureToggle({ id, on }: { id: string; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={() => start(() => setFeature(id, !on))}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm ${on ? "border-valid bg-valid-bg text-valid" : "border-line text-ink-soft hover:text-ink"}`}
    >
      {on ? "On" : "Off"}
    </button>
  );
}
