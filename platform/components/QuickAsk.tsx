"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The dashboard's shortcut to the assistant.
export function QuickAsk() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 3) router.push(`/assistant?q=${encodeURIComponent(q.trim())}`);
      }}
      className="w-full max-w-md rounded-2xl bg-surface p-2 text-ink lg:w-[26rem]"
    >
      <label htmlFor="quick-ask" className="sr-only">Ask the archive</label>
      <div className="flex gap-2">
        <input
          id="quick-ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask the archive a question"
          className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[15px] placeholder:text-ink-faint"
        />
        <button type="submit" className="rounded-xl bg-signal px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white">
          Ask
        </button>
      </div>
    </form>
  );
}
