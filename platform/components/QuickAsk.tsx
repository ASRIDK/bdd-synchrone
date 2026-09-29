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
      className="w-full max-w-md rounded-full bg-surface p-1.5 text-ink lg:w-[26rem]"
    >
      <label htmlFor="quick-ask" className="sr-only">Ask the archive</label>
      <div className="flex gap-2">
        <input
          id="quick-ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask the archive a question"
          className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-[15px] placeholder:text-ink-faint"
        />
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">
          Ask
        </button>
      </div>
    </form>
  );
}
